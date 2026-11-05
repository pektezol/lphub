package handlers

import (
	"encoding/json"
	"github.com/gin-gonic/gin"
	"lphub/database"
	"lphub/models"
	"net/http"
	"strconv"
)

// Statistics returns public game statistics.
//
// @Summary      Get community statistics
// @Description  Returns different data according to kind. Overview contains maps, players and runs counts. Insights contains active_all, active_recent, holders, maps, maps_recent and months arrays. History and bests return entries and a more flag, with 20 entries per page.
// @Description  Player rankings credit both cooperative participants; run counts count each cooperative submission once. World-record holders include ties on portal count and time. Deleted runs are excluded.
// @Tags         stats
// @Param        game_id  query  int     true   "Game ID; 0 selects all games"  minimum(0)
// @Param        kind     query  string  true   "Statistics to return"  Enums(overview, insights, history, bests)
// @Param        offset   query  int     false  "Number of entries to skip for history or bests (default 0)"  minimum(0)
// @Produce      json
// @Success      200  {object}  models.Response  "Statistics data; shape depends on kind"
// @Failure      400  {object}  models.Response  "Invalid query parameter"
// @Failure      500  {object}  models.Response  "Statistics query failed"
// @Router       /stats/statistics [get]
func Statistics(c *gin.Context) {
	game, err := strconv.Atoi(c.Query("game_id"))
	if err != nil || game < 0 {
		c.JSON(http.StatusBadRequest, models.ErrorResponse("invalid game_id"))
		return
	}
	offset := 0
	if c.Query("offset") != "" {
		offset, err = strconv.Atoi(c.Query("offset"))
		if err != nil || offset < 0 {
			c.JSON(http.StatusBadRequest, models.ErrorResponse("invalid offset"))
			return
		}
	}
	kind := c.Query("kind")
	if kind == "insights" {
		statisticsInsights(c, game)
		return
	}
	if kind == "overview" {
		var maps, players, runs int
		err = database.DB.QueryRow(`WITH runs AS (
   SELECT r.map_id, r.user_id AS player, NULL::text AS partner FROM records_sp r WHERE NOT r.is_deleted
   UNION ALL SELECT r.map_id, r.host_id, r.partner_id FROM records_mp r WHERE NOT r.is_deleted
  ), game_runs AS (SELECT r.* FROM runs r JOIN maps m ON m.id=r.map_id WHERE ($1=0 OR m.game_id=$1))
  SELECT (SELECT count(*) FROM maps WHERE ($1=0 OR game_id=$1)),
   (SELECT count(DISTINCT player) FROM (SELECT player FROM game_runs UNION ALL SELECT partner FROM game_runs WHERE partner IS NOT NULL) p),
   (SELECT count(*) FROM game_runs)`, game).Scan(&maps, &players, &runs)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse("could not load statistics"))
			return
		}
		c.JSON(http.StatusOK, models.Response{Success: true, Data: gin.H{"maps": maps, "players": players, "runs": runs}})
		return
	}
	var query string
	switch kind {
	case "history":
		query = `WITH history AS (SELECT h.id,h.map_id,h.user_name,h.score_count,h.record_date, LAG(h.score_count) OVER (PARTITION BY h.map_id ORDER BY h.record_date,h.id) AS previous FROM map_history h JOIN maps m ON m.id=h.map_id WHERE ($1=0 OR m.game_id=$1) AND h.category_id=1 AND h.user_name <> 'Placeholder')
   SELECT h.id,h.map_id,m.name,h.user_name,''::text,h.score_count,h.previous,h.record_date FROM history h JOIN maps m ON m.id=h.map_id ORDER BY h.record_date DESC,h.id DESC LIMIT 21 OFFSET $2`
	case "bests":
		query = `WITH runs AS (SELECT id,map_id,user_id,score_count,score_time,record_date FROM records_sp WHERE NOT is_deleted UNION ALL SELECT id,map_id,host_id,score_count,score_time,record_date FROM records_mp WHERE NOT is_deleted UNION ALL SELECT id,map_id,partner_id,score_count,score_time,record_date FROM records_mp WHERE NOT is_deleted), best AS (SELECT r.*, ROW_NUMBER() OVER (PARTITION BY r.map_id,r.user_id ORDER BY r.score_count,r.score_time,r.record_date DESC,r.id DESC) AS n FROM runs r JOIN maps m ON m.id=r.map_id WHERE ($1=0 OR m.game_id=$1)) SELECT b.id,b.map_id,m.name,u.user_name,u.steam_id,b.score_count,NULL::integer,b.record_date FROM best b JOIN maps m ON m.id=b.map_id JOIN users u ON u.steam_id=b.user_id WHERE b.n=1 ORDER BY b.record_date DESC,b.id DESC,b.user_id LIMIT 21 OFFSET $2`
	default:
		c.JSON(http.StatusBadRequest, models.ErrorResponse("invalid kind"))
		return
	}
	rows, err := database.DB.Query(query, game, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse("could not load statistics"))
		return
	}
	defer rows.Close()
	entries := make([]gin.H, 0, 21)
	for rows.Next() {
		var id, mapID, score int
		var mapName, userName, userID string
		var previous *int
		var date interface{}
		if err = rows.Scan(&id, &mapID, &mapName, &userName, &userID, &score, &previous, &date); err != nil {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse("could not load statistics"))
			return
		}
		entries = append(entries, gin.H{"id": id, "map_id": mapID, "map_name": mapName, "user_name": userName, "user_id": userID, "score": score, "previous": previous, "date": date})
	}
	if rows.Err() != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse("could not load statistics"))
		return
	}
	more := len(entries) > 20
	if more {
		entries = entries[:20]
	}
	c.JSON(http.StatusOK, models.Response{Success: true, Data: gin.H{"entries": entries, "more": more}})
}

// statisticsInsights aggregates actual submissions once per run, expanding cooperative
// runs only when crediting individual players.
func statisticsInsights(c *gin.Context, game int) {
	const query = `WITH runs AS (
 SELECT r.id, r.map_id, r.user_id AS player, NULL::text AS partner, r.score_count, r.score_time, r.record_date
 FROM records_sp r JOIN maps m ON m.id=r.map_id WHERE ($1=0 OR m.game_id=$1) AND NOT r.is_deleted
 UNION ALL
 SELECT r.id, r.map_id, r.host_id, r.partner_id, r.score_count, r.score_time, r.record_date
 FROM records_mp r JOIN maps m ON m.id=r.map_id WHERE ($1=0 OR m.game_id=$1) AND NOT r.is_deleted
 ), participants AS (
 SELECT map_id,player,score_count,score_time,record_date FROM runs
 UNION ALL SELECT map_id,partner,score_count,score_time,record_date FROM runs WHERE partner IS NOT NULL AND partner <> player
 ), active AS (
 SELECT p.player, count(*) AS total, count(*) FILTER (WHERE p.record_date >= now() - interval '30 days') AS recent
 FROM participants p GROUP BY p.player
 ), best AS (
 SELECT *, dense_rank() OVER (PARTITION BY map_id ORDER BY score_count,score_time) AS rank FROM participants
 ), holders AS (
 SELECT player,count(DISTINCT map_id) AS total FROM best WHERE rank=1 GROUP BY player
 ), map_counts AS (
 SELECT map_id,count(*) AS total, count(*) FILTER (WHERE record_date >= now() - interval '30 days') AS recent FROM runs GROUP BY map_id
 ), months AS (
 SELECT to_char(date_trunc('month',record_date),'YYYY-MM') AS month,count(*) AS total FROM runs GROUP BY date_trunc('month',record_date)
 )
 SELECT json_build_object(
 'active_all', COALESCE((SELECT json_agg(x) FROM (SELECT u.steam_id AS id,u.user_name AS name,u.avatar_link,a.total AS count FROM active a JOIN users u ON u.steam_id=a.player ORDER BY a.total DESC,u.user_name,u.steam_id LIMIT 10) x),'[]'::json),
 'active_recent', COALESCE((SELECT json_agg(x) FROM (SELECT u.steam_id AS id,u.user_name AS name,u.avatar_link,a.recent AS count FROM active a JOIN users u ON u.steam_id=a.player WHERE a.recent>0 ORDER BY a.recent DESC,u.user_name,u.steam_id LIMIT 10) x),'[]'::json),
 'holders', COALESCE((SELECT json_agg(x) FROM (SELECT u.steam_id AS id,u.user_name AS name,u.avatar_link,h.total AS count FROM holders h JOIN users u ON u.steam_id=h.player ORDER BY h.total DESC,u.user_name,u.steam_id LIMIT 10) x),'[]'::json),
 'maps', COALESCE((SELECT json_agg(x) FROM (SELECT m.id,m.name,mc.total AS count FROM map_counts mc JOIN maps m ON m.id=mc.map_id ORDER BY mc.total DESC,m.name,m.id LIMIT 12) x),'[]'::json),
 'maps_recent', COALESCE((SELECT json_agg(x) FROM (SELECT m.id,m.name,mc.recent AS count FROM map_counts mc JOIN maps m ON m.id=mc.map_id WHERE mc.recent > 0 ORDER BY mc.recent DESC,m.name,m.id LIMIT 12) x),'[]'::json),
 'months', COALESCE((SELECT json_agg(x ORDER BY x.month) FROM months x),'[]'::json)
 )`
	var data []byte
	if err := database.DB.QueryRow(query, game).Scan(&data); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse("could not load statistics"))
		return
	}
	var result json.RawMessage = data
	c.JSON(http.StatusOK, models.Response{Success: true, Data: result})
}
