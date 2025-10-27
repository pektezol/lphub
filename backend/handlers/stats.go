package handlers

import (
	"net/http"
	"time"

	"lphub/database"
	"lphub/models"

	"github.com/gin-gonic/gin"
)

type ScoresResponse struct {
	Logs []ScoresDetails `json:"scores"`
}

type ScoresDetails struct {
	Game       models.Game      `json:"game"`
	User       models.UserShort `json:"user"`
	Map        models.MapShort  `json:"map"`
	ScoreCount int              `json:"score_count"`
	ScoreTime  int              `json:"score_time"`
	DemoID     string           `json:"demo_id"`
	Date       time.Time        `json:"date"`
}

type TimelinePoint struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
}

type TimelineResponse struct {
	Singleplayer []TimelinePoint `json:"timeline_singleplayer"`
	Multiplayer  []TimelinePoint `json:"timeline_multiplayer"`
}

// GET Scores
//
//	@Description	Get score logs of every player.
//	@Tags			stats
//	@Produce		json
//	@Success		200	{object}	models.Response{data=ScoresResponse}
//	@Router			/stats/scores [get]
func Scores(c *gin.Context) {
	response := ScoresResponse{Logs: []ScoresDetails{}}
	sql := `SELECT g.id,
		g."name",
		g.is_coop,
		rs.map_id,
		m.name AS map_name,
		u.steam_id,
		u.user_name,
		rs.score_count,
		rs.score_time,
		rs.demo_id,
		rs.record_date
	FROM (
		SELECT id, map_id, user_id, score_count, score_time, demo_id, record_date
		FROM records_sp WHERE is_deleted = false

		UNION ALL

		SELECT id, map_id, host_id AS user_id, score_count, score_time, host_demo_id AS demo_id, record_date
		FROM records_mp WHERE is_deleted = false

		UNION ALL

		SELECT id, map_id, partner_id AS user_id, score_count, score_time, partner_demo_id AS demo_id, record_date
		FROM records_mp WHERE is_deleted = false
	) AS rs
	JOIN users u ON rs.user_id = u.steam_id
	JOIN maps m ON rs.map_id = m.id
	JOIN games g ON m.game_id = g.id 
	ORDER BY rs.record_date DESC LIMIT 100;`
	rows, err := database.DB.Query(sql)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	for rows.Next() {
		score := ScoresDetails{}
		err = rows.Scan(&score.Game.ID, &score.Game.Name, &score.Game.IsCoop, &score.Map.ID, &score.Map.Name, &score.User.SteamID, &score.User.UserName, &score.ScoreCount, &score.ScoreTime, &score.DemoID, &score.Date)
		if err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
		response.Logs = append(response.Logs, score)
	}
	c.JSON(http.StatusOK, models.Response{
		Success: true,
		Message: "Successfully retrieved score logs.",
		Data:    response,
	})
}

// GET Timeline
//
//	@Description	Get the history of portal count world records over time.
//	@Tags			stats
//	@Produce		json
//	@Success		200	{object}	models.Response{data=TimelineResponse}
//	@Router			/stats/timeline [get]
func Timeline(c *gin.Context) {
	result := TimelineResponse{
		Singleplayer: []TimelinePoint{},
		Multiplayer:  []TimelinePoint{},
	}
	spQuery := `
		WITH date_series AS (
			SELECT DISTINCT record_date as date
			FROM map_history
			WHERE category_id = 1 AND map_id <= 60 AND record_date >= '2013-01-31'
			ORDER BY record_date
		),
		map_best_at_date AS (
			SELECT 
				ds.date,
				mh.map_id,
				MIN(mh.score_count) as best_count
			FROM date_series ds
			CROSS JOIN (SELECT DISTINCT map_id FROM map_history WHERE category_id = 1 AND map_id <= 60) maps
			LEFT JOIN map_history mh ON mh.map_id = maps.map_id 
				AND mh.category_id = 1 
				AND mh.record_date <= ds.date
			GROUP BY ds.date, mh.map_id
		)
		SELECT 
			date,
			SUM(best_count) as total_count
		FROM map_best_at_date
		GROUP BY date
		ORDER BY date ASC;
	`

	mpQuery := `
		WITH date_series AS (
			SELECT DISTINCT record_date as date
			FROM map_history
			WHERE category_id = 1 AND map_id > 60 AND record_date >= '2011-12-21'
			ORDER BY record_date
		),
		map_best_at_date AS (
			SELECT 
				ds.date,
				mh.map_id,
				MIN(mh.score_count) as best_count
			FROM date_series ds
			CROSS JOIN (SELECT DISTINCT map_id FROM map_history WHERE category_id = 1 AND map_id > 60) maps
			LEFT JOIN map_history mh ON mh.map_id = maps.map_id 
				AND mh.category_id = 1 
				AND mh.record_date <= ds.date
			GROUP BY ds.date, mh.map_id
		)
		SELECT 
			date,
			SUM(best_count) as total_count
		FROM map_best_at_date
		GROUP BY date
		ORDER BY date ASC;
	`

	rows, err := database.DB.Query(spQuery)
	if err != nil {
		return
	}
	defer rows.Close()

	for rows.Next() {
		var dateTime time.Time
		var count int
		if err := rows.Scan(&dateTime, &count); err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
		result.Singleplayer = append(result.Singleplayer, TimelinePoint{
			Date:  dateTime.Format("2006-01-02"),
			Count: count,
		})
	}

	rows, err = database.DB.Query(mpQuery)
	if err != nil {
		return
	}
	defer rows.Close()

	for rows.Next() {
		var dateTime time.Time
		var count int
		if err := rows.Scan(&dateTime, &count); err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
		result.Multiplayer = append(result.Multiplayer, TimelinePoint{
			Date:  dateTime.Format("2006-01-02"),
			Count: count,
		})
	}
	c.JSON(http.StatusOK, models.Response{
		Success: true,
		Message: "Successfully retrieved portal count timeline.",
		Data:    result,
	})
}
