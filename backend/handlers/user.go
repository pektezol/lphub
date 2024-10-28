package handlers

import (
	"net/http"
	"os"
	"regexp"
	"time"

	"lphub/database"
	"lphub/models"

	"github.com/gin-gonic/gin"
)

type ProfileResponse struct {
	Profile     bool              `json:"profile"`
	SteamID     string            `json:"steam_id"`
	UserName    string            `json:"user_name"`
	AvatarLink  string            `json:"avatar_link"`
	CountryCode string            `json:"country_code"`
	Titles      []models.Title    `json:"titles"`
	Links       models.Links      `json:"links"`
	Rankings    ProfileRankings   `json:"rankings"`
	Records     []ProfileRecords  `json:"records"`
	Pagination  models.Pagination `json:"pagination"`
}

type ProfileRankings struct {
	Overall      ProfileRankingsDetails `json:"overall"`
	Singleplayer ProfileRankingsDetails `json:"singleplayer"`
	Cooperative  ProfileRankingsDetails `json:"cooperative"`
}

type ProfileRankingsDetails struct {
	Rank            int `json:"rank"`
	CompletionCount int `json:"completion_count"`
	CompletionTotal int `json:"completion_total"`
}
type ProfileRecords struct {
	GameID     int             `json:"game_id"`
	CategoryID int             `json:"category_id"`
	MapID      int             `json:"map_id"`
	MapName    string          `json:"map_name"`
	MapWRCount int             `json:"map_wr_count"`
	Placement  int             `json:"placement"`
	Scores     []ProfileScores `json:"scores"`
}

type ProfileScores struct {
	RecordID   int       `json:"record_id"`
	DemoID     string    `json:"demo_id"`
	ScoreCount int       `json:"score_count"`
	ScoreTime  int       `json:"score_time"`
	Date       time.Time `json:"date"`
}

type ScoreResponse struct {
	MapID   int `json:"map_id"`
	Records any `json:"records"`
}

// GET Profile
//
//	@Description	Get profile page of session user.
//	@Tags			users
//	@Accept			json
//	@Produce		json
//	@Param			Authorization	header		string	true	"JWT Token"
//	@Success		200				{object}	models.Response{data=ProfileResponse}
//	@Router			/profile [get]
func Profile(c *gin.Context) {
	// Check if user exists
	user, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusOK, models.ErrorResponse("User not logged in."))
		return
	}
	// Get user links
	links := models.Links{}
	sql := `SELECT u.p2sr, u.steam, u.youtube, u.twitch FROM users u WHERE u.steam_id = $1`
	err := database.DB.QueryRow(sql, user.(models.User).SteamID).Scan(&links.P2SR, &links.Steam, &links.YouTube, &links.Twitch)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	// Get rankings (all maps done in one game)
	rankings := ProfileRankings{
		Overall:      ProfileRankingsDetails{},
		Singleplayer: ProfileRankingsDetails{},
		Cooperative:  ProfileRankingsDetails{},
	}
	// Get total map count
	sql = `SELECT count(id), (SELECT count(id) FROM maps m WHERE m.game_id = 2 AND m.is_disabled = false) FROM maps m WHERE m.game_id = 1 AND m.is_disabled = false`
	err = database.DB.QueryRow(sql).Scan(&rankings.Singleplayer.CompletionTotal, &rankings.Cooperative.CompletionTotal)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	rankings.Overall.CompletionTotal = rankings.Singleplayer.CompletionTotal + rankings.Cooperative.CompletionTotal
	// Get user completion count
	sql = `SELECT 'records_sp' AS table_name, COUNT(*) FROM (
	    SELECT sp.map_id FROM records_sp sp JOIN (
	        SELECT mh.map_id, MIN(mh.score_count) AS min_score_count FROM map_history mh WHERE mh.category_id = 1 GROUP BY mh.map_id
	    ) AS subquery_sp ON sp.map_id = subquery_sp.map_id AND sp.score_count = subquery_sp.min_score_count
	    WHERE sp.user_id = $1 AND sp.is_deleted = false GROUP BY sp.map_id
	) AS unique_maps
	UNION ALL
	SELECT 'records_mp' AS table_name, COUNT(*) FROM (
	    SELECT mp.map_id FROM records_mp mp JOIN (
	        SELECT mh.map_id, MIN(mh.score_count) AS min_score_count FROM map_history mh WHERE mh.category_id = 1 GROUP BY mh.map_id
	    ) AS subquery_mp ON mp.map_id = subquery_mp.map_id AND mp.score_count = subquery_mp.min_score_count
	    WHERE (mp.host_id = $1 OR mp.partner_id = $1) AND mp.is_deleted = false GROUP BY mp.map_id
	) AS unique_maps`
	rows, err := database.DB.Query(sql, user.(models.User).SteamID)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	for rows.Next() {
		var tableName string
		var completionCount int
		err = rows.Scan(&tableName, &completionCount)
		if err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
		if tableName == "records_sp" {
			rankings.Singleplayer.CompletionCount = completionCount
			continue
		}
		if tableName == "records_mp" {
			rankings.Cooperative.CompletionCount = completionCount
			continue
		}
	}
	rankings.Overall.CompletionCount = rankings.Singleplayer.CompletionCount + rankings.Cooperative.CompletionCount
	// Get user ranking placement for singleplayer
	sql = `SELECT u.steam_id, COUNT(DISTINCT map_id), 
	(SELECT COUNT(maps.name) FROM maps INNER JOIN games g ON maps.game_id = g.id WHERE g."name" = 'Portal 2 - Singleplayer' AND maps.is_disabled = false), 
	(SELECT SUM(min_score_count) AS total_min_score_count FROM (
		SELECT user_id, MIN(score_count) AS min_score_count FROM records_sp WHERE is_deleted = false GROUP BY user_id, map_id) AS subquery WHERE user_id = u.steam_id)
	FROM records_sp sp JOIN users u ON u.steam_id = sp.user_id WHERE is_deleted = false GROUP BY u.steam_id, u.user_name
	HAVING COUNT(DISTINCT map_id) = (SELECT COUNT(maps.name) FROM maps INNER JOIN games g ON maps.game_id = g.id WHERE g.is_coop = FALSE AND is_disabled = false)
	ORDER BY total_min_score_count ASC`
	rows, err = database.DB.Query(sql)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	placement := 1
	for rows.Next() {
		var steamID string
		var completionCount int
		var totalCount int
		var userPortalCount int
		err = rows.Scan(&steamID, &completionCount, &totalCount, &userPortalCount)
		if err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
		if completionCount != totalCount {
			placement++
			continue
		}
		if steamID != user.(models.User).SteamID {
			placement++
			continue
		}
		rankings.Singleplayer.Rank = placement
	}
	// Get user ranking placement for multiplayer
	sql = `SELECT u.steam_id, COUNT(DISTINCT map_id), 
	(SELECT COUNT(maps.name) FROM maps INNER JOIN games g ON maps.game_id = g.id WHERE g."name" = 'Portal 2 - Cooperative' AND is_disabled = false), 
	(SELECT SUM(min_score_count) AS total_min_score_count FROM (
		SELECT host_id, partner_id, MIN(score_count) AS min_score_count FROM records_mp WHERE is_deleted = false GROUP BY host_id, partner_id, map_id) AS subquery WHERE host_id = u.steam_id OR partner_id = u.steam_id)
	FROM records_mp mp JOIN users u ON u.steam_id = mp.host_id OR u.steam_id = mp.partner_id WHERE mp.is_deleted = false GROUP BY u.steam_id, u.user_name
	HAVING  COUNT(DISTINCT map_id) = (SELECT COUNT(maps.name) FROM maps INNER JOIN games g ON maps.game_id = g.id WHERE g.is_coop = true AND is_disabled = false)
	ORDER BY total_min_score_count ASC`
	rows, err = database.DB.Query(sql)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	placement = 1
	for rows.Next() {
		var steamID string
		var completionCount int
		var totalCount int
		var userPortalCount int
		err = rows.Scan(&steamID, &completionCount, &totalCount, &userPortalCount)
		if err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
		if completionCount != totalCount {
			placement++
			continue
		}
		if steamID != user.(models.User).SteamID {
			placement++
			continue
		}
		rankings.Cooperative.Rank = placement
	}
	// Get user ranking placement for overall if they qualify
	if rankings.Singleplayer.Rank != 0 && rankings.Cooperative.Rank != 0 {
		sql = `WITH user_sp AS (
			SELECT u.steam_id,
				   SUM(subquery.min_score_count) AS total_min_score_count
			FROM users u
			LEFT JOIN (
				SELECT user_id, map_id, MIN(score_count) AS min_score_count
				FROM records_sp WHERE is_deleted = false
				GROUP BY user_id, map_id
			) AS subquery ON subquery.user_id = u.steam_id
			WHERE u.steam_id IN (
				SELECT user_id
				FROM records_sp sp
				JOIN maps m ON sp.map_id = m.id
				JOIN games g ON m.game_id = g.id
				WHERE g.is_coop = FALSE AND m.is_disabled = FALSE AND sp.is_deleted = false
				GROUP BY user_id
				HAVING COUNT(DISTINCT sp.map_id) = (
					SELECT COUNT(maps.name)
					FROM maps
					INNER JOIN games g ON maps.game_id = g.id
					WHERE g.is_coop = FALSE AND maps.is_disabled = FALSE
				)
			)
			GROUP BY u.steam_id
		), user_mp AS (
			SELECT u.steam_id,
				   SUM(subquery.min_score_count) AS total_min_score_count
			FROM users u
			LEFT JOIN (
				SELECT host_id, partner_id, map_id, MIN(score_count) AS min_score_count
				FROM records_mp WHERE is_deleted = false
				GROUP BY host_id, partner_id, map_id
			) AS subquery ON subquery.host_id = u.steam_id OR subquery.partner_id = u.steam_id
			WHERE u.steam_id IN (
				SELECT host_id
				FROM records_mp mp
				JOIN maps m ON mp.map_id = m.id
				JOIN games g ON m.game_id = g.id
				WHERE g.is_coop = TRUE AND m.is_disabled = FALSE AND mp.is_deleted = false
				GROUP BY host_id
				HAVING COUNT(DISTINCT mp.map_id) = (
					SELECT COUNT(maps.name)
					FROM maps
					INNER JOIN games g ON maps.game_id = g.id
					WHERE g.is_coop = TRUE AND maps.is_disabled = FALSE
				)
				UNION
				SELECT partner_id
				FROM records_mp mp
				JOIN maps m ON mp.map_id = m.id
				JOIN games g ON m.game_id = g.id
				WHERE g.is_coop = TRUE AND m.is_disabled = FALSE AND mp.is_deleted = false
				GROUP BY partner_id
				HAVING COUNT(DISTINCT mp.map_id) = (
					SELECT COUNT(maps.name)
					FROM maps
					INNER JOIN games g ON maps.game_id = g.id
					WHERE g.is_coop = TRUE AND maps.is_disabled = FALSE
				)
			)
			GROUP BY u.steam_id
		)
		SELECT COALESCE(sp.steam_id, mp.steam_id) AS steam_id,
			   sp.total_min_score_count + mp.total_min_score_count AS overall_total_min_score_count
		FROM user_sp sp
		INNER JOIN user_mp mp ON sp.steam_id = mp.steam_id
		ORDER BY overall_total_min_score_count ASC`
		rows, err = database.DB.Query(sql)
		if err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
		placement = 1
		for rows.Next() {
			var steamID string
			var userPortalCount int
			err = rows.Scan(&steamID, &userPortalCount)
			if err != nil {
				c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
				return
			}
			if steamID != user.(models.User).SteamID {
				placement++
				continue
			}
			rankings.Overall.Rank = placement
		}
	}
	records := []ProfileRecords{}
	// Get singleplayer records
	sql = `SELECT sp.id, m.game_id, m.chapter_id, sp.map_id, m."name", (SELECT mh.score_count FROM map_history mh WHERE mh.map_id = sp.map_id AND mh.category_id = 1 ORDER BY mh.score_count ASC LIMIT 1) AS wr_count, sp.score_count, sp.score_time, sp.demo_id, sp.record_date
	FROM records_sp sp INNER JOIN maps m ON sp.map_id = m.id WHERE sp.user_id = $1 AND sp.is_deleted = false ORDER BY sp.map_id, sp.score_count, sp.score_time`
	rows, err = database.DB.Query(sql, user.(models.User).SteamID)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	sql = `WITH best_scores AS (WITH RankedScores AS (SELECT sp.user_id, sp.map_id, sp.score_count, sp.score_time, ROW_NUMBER() OVER (
    PARTITION BY sp.user_id, sp.map_id ORDER BY sp.score_count ASC, sp.score_time ASC) AS rank FROM records_sp sp WHERE sp.is_deleted = false)
	SELECT user_id, map_id, score_count AS best_score_count, score_time AS best_score_time FROM RankedScores WHERE rank = 1)
	SELECT (SELECT COUNT(*) + 1 FROM best_scores AS inner_scores WHERE inner_scores.map_id = bs.map_id 
	AND (inner_scores.best_score_count < bs.best_score_count OR (inner_scores.best_score_count = bs.best_score_count 
	AND inner_scores.best_score_time < bs.best_score_time))) AS placement FROM best_scores AS bs WHERE bs.user_id = $1 ORDER BY map_id, placement`
	placementsRows, err := database.DB.Query(sql, user.(models.User).SteamID)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	placements := []int{}
	placementIndex := 0
	for placementsRows.Next() {
		var placement int
		placementsRows.Scan(&placement)
		placements = append(placements, placement)
	}
	for rows.Next() {
		var gameID int
		var categoryID int
		var mapID int
		var mapName string
		var mapWR int
		score := ProfileScores{}
		err = rows.Scan(&score.RecordID, &gameID, &categoryID, &mapID, &mapName, &mapWR, &score.ScoreCount, &score.ScoreTime, &score.DemoID, &score.Date)
		if err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
		// More than one record in one map
		if len(records) != 0 && mapID == records[len(records)-1].MapID {
			records[len(records)-1].Scores = append(records[len(records)-1].Scores, score)
			continue
		}
		// New map
		records = append(records, ProfileRecords{
			GameID:     gameID,
			CategoryID: categoryID,
			MapID:      mapID,
			MapName:    mapName,
			MapWRCount: mapWR,
			Placement:  placements[placementIndex],
			Scores:     []ProfileScores{},
		})
		placementIndex++
		records[len(records)-1].Scores = append(records[len(records)-1].Scores, score)
	}
	// Get multiplayer records
	sql = `SELECT mp.id, m.game_id, m.chapter_id, mp.map_id, m."name", (SELECT mh.score_count FROM map_history mh WHERE mh.map_id = mp.map_id AND mh.category_id = 1 ORDER BY mh.score_count ASC LIMIT 1) AS wr_count,  mp.score_count, mp.score_time, CASE WHEN host_id = $1 THEN mp.host_demo_id WHEN partner_id = $1 THEN mp.partner_demo_id END demo_id, mp.record_date
	FROM records_mp mp INNER JOIN maps m ON mp.map_id = m.id WHERE (mp.host_id = $1 OR mp.partner_id = $1) AND mp.is_deleted = false ORDER BY mp.map_id, mp.score_count, mp.score_time`
	rows, err = database.DB.Query(sql, user.(models.User).SteamID)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	sql = `WITH best_scores AS (WITH RankedScores AS (SELECT mp.host_id, mp.partner_id, mp.map_id, mp.score_count, mp.score_time, ROW_NUMBER() OVER (
	PARTITION BY mp.host_id, mp.partner_id, mp.map_id ORDER BY mp.score_count ASC, mp.score_time ASC) AS rank FROM records_mp mp WHERE mp.is_deleted = false)
	SELECT host_id, partner_id, map_id, score_count AS best_score_count, score_time AS best_score_time FROM RankedScores WHERE rank = 1)
	SELECT (SELECT COUNT(*) + 1 FROM best_scores AS inner_scores WHERE inner_scores.map_id = bs.map_id 
	AND (inner_scores.best_score_count < bs.best_score_count OR (inner_scores.best_score_count = bs.best_score_count 
	AND inner_scores.best_score_time < bs.best_score_time))) AS placement FROM best_scores AS bs WHERE bs.host_id = $1 or bs.partner_id = $1 ORDER BY map_id, placement`
	placementsRows, err = database.DB.Query(sql, user.(models.User).SteamID)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	placements = []int{}
	placementIndex = 0
	for placementsRows.Next() {
		var placement int
		placementsRows.Scan(&placement)
		placements = append(placements, placement)
	}
	for rows.Next() {
		var gameID int
		var categoryID int
		var mapID int
		var mapName string
		var mapWR int
		score := ProfileScores{}
		rows.Scan(&score.RecordID, &gameID, &categoryID, &mapID, &mapName, &mapWR, &score.ScoreCount, &score.ScoreTime, &score.DemoID, &score.Date)
		// More than one record in one map
		if len(records) != 0 && mapID == records[len(records)-1].MapID {
			records[len(records)-1].Scores = append(records[len(records)-1].Scores, score)
			continue
		}
		// New map
		records = append(records, ProfileRecords{
			GameID:     gameID,
			CategoryID: categoryID,
			MapID:      mapID,
			MapName:    mapName,
			MapWRCount: mapWR,
			Placement:  placements[placementIndex],
			Scores:     []ProfileScores{},
		})
		placementIndex++
		records[len(records)-1].Scores = append(records[len(records)-1].Scores, score)
	}
	c.JSON(http.StatusOK, models.Response{
		Success: true,
		Message: "Successfully retrieved user scores.",
		Data: ProfileResponse{
			Profile:     true,
			SteamID:     user.(models.User).SteamID,
			UserName:    user.(models.User).UserName,
			AvatarLink:  user.(models.User).AvatarLink,
			CountryCode: user.(models.User).CountryCode,
			Titles:      user.(models.User).Titles,
			Links:       links,
			Rankings:    rankings,
			Records:     records,
		},
	})
}

// GET User
//
//	@Description	Get profile page of another user.
//	@Tags			users
//	@Accept			json
//	@Produce		json
//	@Param			userid	path		int	true	"User ID"
//	@Success		200		{object}	models.Response{data=ProfileResponse}
//	@Router			/users/{userid} [get]
func FetchUser(c *gin.Context) {
	id := c.Param("userid")
	// Check if id is all numbers and 17 length
	match, _ := regexp.MatchString("^[0-9]{17}$", id)
	if !match {
		c.JSON(http.StatusOK, models.ErrorResponse("User not found."))
		return
	}
	// Check if user exists
	var user models.User
	links := models.Links{}
	sql := `SELECT u.steam_id, u.user_name, u.avatar_link, u.country_code, u.created_at, u.updated_at, u.p2sr, u.steam, u.youtube, u.twitch FROM users u WHERE u.steam_id = $1`
	err := database.DB.QueryRow(sql, id).Scan(&user.SteamID, &user.UserName, &user.AvatarLink, &user.CountryCode, &user.CreatedAt, &user.UpdatedAt, &links.P2SR, &links.Steam, &links.YouTube, &links.Twitch)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	if user.SteamID == "" {
		// User does not exist
		c.JSON(http.StatusOK, models.ErrorResponse("User not found."))
		return
	}
	// Get titles
	titles := []models.Title{}
	rows, err := database.DB.Query(`SELECT t.title_name, t.title_color FROM titles t INNER JOIN user_titles ut ON t.id=ut.title_id WHERE ut.user_id = $1`, user.SteamID)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	for rows.Next() {
		var title models.Title
		rows.Scan(&title.Name, &title.Color)
		titles = append(titles, title)
	}
	// Get rankings (all maps done in one game)
	rankings := ProfileRankings{
		Overall:      ProfileRankingsDetails{},
		Singleplayer: ProfileRankingsDetails{},
		Cooperative:  ProfileRankingsDetails{},
	}
	// Get total map count
	sql = `SELECT count(id), (SELECT count(id) FROM maps m WHERE m.game_id = 2 AND m.is_disabled = false) FROM maps m WHERE m.game_id = 1 AND m.is_disabled = false`
	err = database.DB.QueryRow(sql).Scan(&rankings.Singleplayer.CompletionTotal, &rankings.Cooperative.CompletionTotal)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	rankings.Overall.CompletionTotal = rankings.Singleplayer.CompletionTotal + rankings.Cooperative.CompletionTotal
	// Get user completion count
	sql = `SELECT 'records_sp' AS table_name, COUNT(*) FROM (
	    SELECT sp.map_id FROM records_sp sp JOIN (
	        SELECT mh.map_id, MIN(mh.score_count) AS min_score_count FROM map_history mh WHERE mh.category_id = 1 GROUP BY mh.map_id
	    ) AS subquery_sp ON sp.map_id = subquery_sp.map_id AND sp.score_count = subquery_sp.min_score_count
	    WHERE sp.user_id = $1 AND sp.is_deleted = false GROUP BY sp.map_id
	) AS unique_maps
	UNION ALL
	SELECT 'records_mp' AS table_name, COUNT(*) FROM (
	    SELECT mp.map_id FROM records_mp mp JOIN (
	        SELECT mh.map_id, MIN(mh.score_count) AS min_score_count FROM map_history mh WHERE mh.category_id = 1 GROUP BY mh.map_id
	    ) AS subquery_mp ON mp.map_id = subquery_mp.map_id AND mp.score_count = subquery_mp.min_score_count
	    WHERE (mp.host_id = $1 OR mp.partner_id = $1) AND mp.is_deleted = false GROUP BY mp.map_id
	) AS unique_maps`
	rows, err = database.DB.Query(sql, user.SteamID)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	for rows.Next() {
		var tableName string
		var completionCount int
		err = rows.Scan(&tableName, &completionCount)
		if err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
		if tableName == "records_sp" {
			rankings.Singleplayer.CompletionCount = completionCount
			continue
		}
		if tableName == "records_mp" {
			rankings.Cooperative.CompletionCount = completionCount
			continue
		}
	}
	rankings.Overall.CompletionCount = rankings.Singleplayer.CompletionCount + rankings.Cooperative.CompletionCount
	// Get user ranking placement for singleplayer
	sql = `SELECT u.steam_id, COUNT(DISTINCT map_id), 
	(SELECT COUNT(maps.name) FROM maps INNER JOIN games g ON maps.game_id = g.id WHERE g."name" = 'Portal 2 - Singleplayer' AND maps.is_disabled = false), 
	(SELECT SUM(min_score_count) AS total_min_score_count FROM (
		SELECT user_id, MIN(score_count) AS min_score_count FROM records_sp WHERE is_deleted = false GROUP BY user_id, map_id) AS subquery WHERE user_id = u.steam_id)
	FROM records_sp sp JOIN users u ON u.steam_id = sp.user_id WHERE is_deleted = false GROUP BY u.steam_id, u.user_name
	HAVING COUNT(DISTINCT map_id) = (SELECT COUNT(maps.name) FROM maps INNER JOIN games g ON maps.game_id = g.id WHERE g.is_coop = FALSE AND is_disabled = false)
	ORDER BY total_min_score_count ASC`
	rows, err = database.DB.Query(sql)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	placement := 1
	for rows.Next() {
		var steamID string
		var completionCount int
		var totalCount int
		var userPortalCount int
		err = rows.Scan(&steamID, &completionCount, &totalCount, &userPortalCount)
		if err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
		if completionCount != totalCount {
			placement++
			continue
		}
		if steamID != user.SteamID {
			placement++
			continue
		}
		rankings.Singleplayer.Rank = placement
	}
	// Get user ranking placement for multiplayer
	sql = `SELECT u.steam_id, COUNT(DISTINCT map_id), 
	(SELECT COUNT(maps.name) FROM maps INNER JOIN games g ON maps.game_id = g.id WHERE g."name" = 'Portal 2 - Cooperative' AND is_disabled = false), 
	(SELECT SUM(min_score_count) AS total_min_score_count FROM (
		SELECT host_id, partner_id, MIN(score_count) AS min_score_count FROM records_mp WHERE is_deleted = false GROUP BY host_id, partner_id, map_id) AS subquery WHERE host_id = u.steam_id OR partner_id = u.steam_id)
	FROM records_mp mp JOIN users u ON u.steam_id = mp.host_id OR u.steam_id = mp.partner_id WHERE mp.is_deleted = false GROUP BY u.steam_id, u.user_name
	HAVING  COUNT(DISTINCT map_id) = (SELECT COUNT(maps.name) FROM maps INNER JOIN games g ON maps.game_id = g.id WHERE g.is_coop = true AND is_disabled = false)
	ORDER BY total_min_score_count ASC`
	rows, err = database.DB.Query(sql)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	placement = 1
	for rows.Next() {
		var steamID string
		var completionCount int
		var totalCount int
		var userPortalCount int
		err = rows.Scan(&steamID, &completionCount, &totalCount, &userPortalCount)
		if err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
		if completionCount != totalCount {
			placement++
			continue
		}
		if steamID != user.SteamID {
			placement++
			continue
		}
		rankings.Cooperative.Rank = placement
	}
	// Get user ranking placement for overall if they qualify
	if rankings.Singleplayer.Rank != 0 && rankings.Cooperative.Rank != 0 {
		sql = `WITH user_sp AS (
			SELECT u.steam_id,
				   SUM(subquery.min_score_count) AS total_min_score_count
			FROM users u
			LEFT JOIN (
				SELECT user_id, map_id, MIN(score_count) AS min_score_count
				FROM records_sp WHERE is_deleted = false
				GROUP BY user_id, map_id
			) AS subquery ON subquery.user_id = u.steam_id
			WHERE u.steam_id IN (
				SELECT user_id
				FROM records_sp sp
				JOIN maps m ON sp.map_id = m.id
				JOIN games g ON m.game_id = g.id
				WHERE g.is_coop = FALSE AND m.is_disabled = FALSE AND sp.is_deleted = false
				GROUP BY user_id
				HAVING COUNT(DISTINCT sp.map_id) = (
					SELECT COUNT(maps.name)
					FROM maps
					INNER JOIN games g ON maps.game_id = g.id
					WHERE g.is_coop = FALSE AND maps.is_disabled = FALSE
				)
			)
			GROUP BY u.steam_id
		), user_mp AS (
			SELECT u.steam_id,
				   SUM(subquery.min_score_count) AS total_min_score_count
			FROM users u
			LEFT JOIN (
				SELECT host_id, partner_id, map_id, MIN(score_count) AS min_score_count
				FROM records_mp WHERE is_deleted = false
				GROUP BY host_id, partner_id, map_id
			) AS subquery ON subquery.host_id = u.steam_id OR subquery.partner_id = u.steam_id
			WHERE u.steam_id IN (
				SELECT host_id
				FROM records_mp mp
				JOIN maps m ON mp.map_id = m.id
				JOIN games g ON m.game_id = g.id
				WHERE g.is_coop = TRUE AND m.is_disabled = FALSE AND mp.is_deleted = false
				GROUP BY host_id
				HAVING COUNT(DISTINCT mp.map_id) = (
					SELECT COUNT(maps.name)
					FROM maps
					INNER JOIN games g ON maps.game_id = g.id
					WHERE g.is_coop = TRUE AND maps.is_disabled = FALSE
				)
				UNION
				SELECT partner_id
				FROM records_mp mp
				JOIN maps m ON mp.map_id = m.id
				JOIN games g ON m.game_id = g.id
				WHERE g.is_coop = TRUE AND m.is_disabled = FALSE AND mp.is_deleted = false
				GROUP BY partner_id
				HAVING COUNT(DISTINCT mp.map_id) = (
					SELECT COUNT(maps.name)
					FROM maps
					INNER JOIN games g ON maps.game_id = g.id
					WHERE g.is_coop = TRUE AND maps.is_disabled = FALSE
				)
			)
			GROUP BY u.steam_id
		)
		SELECT COALESCE(sp.steam_id, mp.steam_id) AS steam_id,
			   sp.total_min_score_count + mp.total_min_score_count AS overall_total_min_score_count
		FROM user_sp sp
		INNER JOIN user_mp mp ON sp.steam_id = mp.steam_id
		ORDER BY overall_total_min_score_count ASC`
		rows, err = database.DB.Query(sql)
		if err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
		placement = 1
		for rows.Next() {
			var steamID string
			var userPortalCount int
			err = rows.Scan(&steamID, &userPortalCount)
			if err != nil {
				c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
				return
			}
			if steamID != user.SteamID {
				placement++
				continue
			}
			rankings.Overall.Rank = placement
		}
	}
	records := []ProfileRecords{}
	// Get singleplayer records
	sql = `SELECT sp.id, m.game_id, m.chapter_id, sp.map_id, m."name", (SELECT mh.score_count FROM map_history mh WHERE mh.map_id = sp.map_id AND mh.category_id = 1 ORDER BY mh.score_count ASC LIMIT 1) AS wr_count, sp.score_count, sp.score_time, sp.demo_id, sp.record_date
	FROM records_sp sp INNER JOIN maps m ON sp.map_id = m.id WHERE sp.user_id = $1 AND sp.is_deleted = false ORDER BY sp.map_id, sp.score_count, sp.score_time`
	rows, err = database.DB.Query(sql, user.SteamID)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	sql = `WITH best_scores AS (WITH RankedScores AS (SELECT sp.user_id, sp.map_id, sp.score_count, sp.score_time, ROW_NUMBER() OVER (
	PARTITION BY sp.user_id, sp.map_id ORDER BY sp.score_count ASC, sp.score_time ASC) AS rank FROM records_sp sp WHERE sp.is_deleted = false)
	SELECT user_id, map_id, score_count AS best_score_count, score_time AS best_score_time FROM RankedScores WHERE rank = 1)
	SELECT (SELECT COUNT(*) + 1 FROM best_scores AS inner_scores WHERE inner_scores.map_id = bs.map_id 
	AND (inner_scores.best_score_count < bs.best_score_count OR (inner_scores.best_score_count = bs.best_score_count 
	AND inner_scores.best_score_time < bs.best_score_time))) AS placement FROM best_scores AS bs WHERE bs.user_id = $1 ORDER BY map_id, placement`
	placementsRows, err := database.DB.Query(sql, user.SteamID)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	placements := []int{}
	placementIndex := 0
	for placementsRows.Next() {
		var placement int
		placementsRows.Scan(&placement)
		placements = append(placements, placement)
	}
	for rows.Next() {
		var gameID int
		var categoryID int
		var mapID int
		var mapName string
		var mapWR int
		score := ProfileScores{}
		err = rows.Scan(&score.RecordID, &gameID, &categoryID, &mapID, &mapName, &mapWR, &score.ScoreCount, &score.ScoreTime, &score.DemoID, &score.Date)
		if err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
		// More than one record in one map
		if len(records) != 0 && mapID == records[len(records)-1].MapID {
			records[len(records)-1].Scores = append(records[len(records)-1].Scores, score)
			continue
		}
		// New map
		records = append(records, ProfileRecords{
			GameID:     gameID,
			CategoryID: categoryID,
			MapID:      mapID,
			MapName:    mapName,
			MapWRCount: mapWR,
			Placement:  placements[placementIndex],
			Scores:     []ProfileScores{},
		})
		placementIndex++
		records[len(records)-1].Scores = append(records[len(records)-1].Scores, score)
	}
	// Get multiplayer records
	sql = `SELECT mp.id, m.game_id, m.chapter_id, mp.map_id, m."name", (SELECT mh.score_count FROM map_history mh WHERE mh.map_id = mp.map_id AND mh.category_id = 1 ORDER BY mh.score_count ASC LIMIT 1) AS wr_count,  mp.score_count, mp.score_time, CASE WHEN host_id = $1 THEN mp.host_demo_id WHEN partner_id = $1 THEN mp.partner_demo_id END demo_id, mp.record_date
	FROM records_mp mp INNER JOIN maps m ON mp.map_id = m.id WHERE (mp.host_id = $1 OR mp.partner_id = $1) AND mp.is_deleted = false ORDER BY mp.map_id, mp.score_count, mp.score_time`
	rows, err = database.DB.Query(sql, user.SteamID)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	sql = `WITH best_scores AS (WITH RankedScores AS (SELECT mp.host_id, mp.partner_id, mp.map_id, mp.score_count, mp.score_time, ROW_NUMBER() OVER (
	PARTITION BY mp.host_id, mp.partner_id, mp.map_id ORDER BY mp.score_count ASC, mp.score_time ASC) AS rank FROM records_mp mp WHERE mp.is_deleted = false)
	SELECT host_id, partner_id, map_id, score_count AS best_score_count, score_time AS best_score_time FROM RankedScores WHERE rank = 1)
	SELECT (SELECT COUNT(*) + 1 FROM best_scores AS inner_scores WHERE inner_scores.map_id = bs.map_id 
	AND (inner_scores.best_score_count < bs.best_score_count OR (inner_scores.best_score_count = bs.best_score_count 
	AND inner_scores.best_score_time < bs.best_score_time))) AS placement FROM best_scores AS bs WHERE bs.host_id = $1 or bs.partner_id = $1 ORDER BY map_id, placement`
	placementsRows, err = database.DB.Query(sql, user.SteamID)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	placements = []int{}
	placementIndex = 0
	for placementsRows.Next() {
		var placement int
		placementsRows.Scan(&placement)
		placements = append(placements, placement)
	}
	for rows.Next() {
		var gameID int
		var categoryID int
		var mapID int
		var mapName string
		var mapWR int
		score := ProfileScores{}
		rows.Scan(&score.RecordID, &gameID, &categoryID, &mapID, &mapName, &mapWR, &score.ScoreCount, &score.ScoreTime, &score.DemoID, &score.Date)
		// More than one record in one map
		if len(records) != 0 && mapID == records[len(records)-1].MapID {
			records[len(records)-1].Scores = append(records[len(records)-1].Scores, score)
			continue
		}
		// New map
		records = append(records, ProfileRecords{
			GameID:     gameID,
			CategoryID: categoryID,
			MapID:      mapID,
			MapName:    mapName,
			MapWRCount: mapWR,
			Placement:  placements[placementIndex],
			Scores:     []ProfileScores{},
		})
		placementIndex++
		records[len(records)-1].Scores = append(records[len(records)-1].Scores, score)
	}
	c.JSON(http.StatusOK, models.Response{
		Success: true,
		Message: "Successfully retrieved user scores.",
		Data: ProfileResponse{
			Profile:     false,
			SteamID:     user.SteamID,
			UserName:    user.UserName,
			AvatarLink:  user.AvatarLink,
			CountryCode: user.CountryCode,
			Titles:      titles,
			Links:       links,
			Rankings:    rankings,
			Records:     records,
		},
	})
}

// PUT Profile
//
//	@Description	Update profile page of session user.
//	@Tags			users
//	@Accept			json
//	@Produce		json
//	@Param			Authorization	header		string	true	"JWT Token"
//	@Success		200				{object}	models.Response{data=ProfileResponse}
//	@Router			/profile [post]
func UpdateUser(c *gin.Context) {
	// Check if user exists
	user, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusOK, models.ErrorResponse("User not logged in."))
		return
	}
	profile, err := GetPlayerSummaries(user.(models.User).SteamID, os.Getenv("API_KEY"))
	if err != nil {
		CreateLog(user.(models.User).SteamID, LogTypeUser, LogDescriptionUserUpdateSummaryFail, err.Error())
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	// Update profile
	sql := `UPDATE users SET user_name = $1, avatar_link = $2, country_code = $3, updated_at = $4 WHERE steam_id = $5`
	_, err = database.DB.Exec(sql, profile.PersonaName, profile.AvatarFull, profile.LocCountryCode, time.Now().UTC(), user.(models.User).SteamID)
	if err != nil {
		CreateLog(user.(models.User).SteamID, LogTypeUser, LogDescriptionUserUpdateFail, "UPDATE#users: "+err.Error())
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	CreateLog(user.(models.User).SteamID, LogTypeUser, LogDescriptionUserUpdateSuccess)
	c.JSON(http.StatusOK, models.Response{
		Success: true,
		Message: "Successfully updated user.",
		Data: ProfileResponse{
			Profile:     true,
			SteamID:     user.(models.User).SteamID,
			UserName:    profile.PersonaName,
			AvatarLink:  profile.AvatarFull,
			CountryCode: profile.LocCountryCode,
		},
	})
}

// PUT Profile/CountryCode
//
//	@Description	Update country code of session user.
//	@Tags			users
//	@Accept			json
//	@Produce		json
//	@Param			Authorization	header		string	true	"JWT Token"
//	@Param			country_code	query		string	true	"Country Code [XX]"
//	@Success		200				{object}	models.Response
//	@Router			/profile [put]
func UpdateCountryCode(c *gin.Context) {
	// Check if user exists
	user, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusOK, models.ErrorResponse("User not logged in."))
		return
	}
	code := c.Query("country_code")
	if code == "" {
		CreateLog(user.(models.User).SteamID, LogTypeUser, LogDescriptionUserUpdateCountryFail)
		c.JSON(http.StatusOK, models.ErrorResponse("Enter a valid country code."))
		return
	}
	var validCode string
	err := database.DB.QueryRow(`SELECT country_code FROM countries WHERE country_code = $1`, code).Scan(&validCode)
	if err != nil {
		CreateLog(user.(models.User).SteamID, LogTypeUser, LogDescriptionUserUpdateCountryFail)
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	// Valid code, update profile
	_, err = database.DB.Exec(`UPDATE users SET country_code = $1 WHERE steam_id = $2`, validCode, user.(models.User).SteamID)
	if err != nil {
		CreateLog(user.(models.User).SteamID, LogTypeUser, LogDescriptionUserUpdateCountryFail)
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	CreateLog(user.(models.User).SteamID, LogTypeUser, LogDescriptionUserUpdateCountrySuccess)
	c.JSON(http.StatusOK, models.Response{
		Success: true,
		Message: "Successfully updated country code.",
	})
}
