package handlers

import (
	"net/http"
	"time"

	"lphub/database"
	"lphub/models"

	"github.com/gin-gonic/gin"
)

type Log struct {
	User        models.UserShort `json:"user"`
	Type        string           `json:"type"`
	Description string           `json:"description"`
	Message     string           `json:"message"`
	Date        time.Time        `json:"date"`
}

type LogsResponse struct {
	Logs []LogsResponseDetails `json:"logs"`
}

type LogsResponseDetails struct {
	User    models.UserShort `json:"user"`
	Log     string           `json:"detail"`
	Message string           `json:"message"`
	Date    time.Time        `json:"date"`
}

type ScoreLogsResponse struct {
	Logs []ScoreLogsResponseDetails `json:"scores"`
}

type ScoreLogsResponseDetails struct {
	Game       models.Game      `json:"game"`
	User       models.UserShort `json:"user"`
	Map        models.MapShort  `json:"map"`
	ScoreCount int              `json:"score_count"`
	ScoreTime  int              `json:"score_time"`
	DemoID     string           `json:"demo_id"`
	Date       time.Time        `json:"date"`
}

// GET Score Logs
//
//	@Description	Get score logs of every player.
//	@Tags			logs
//	@Produce		json
//	@Success		200	{object}	models.Response{data=ScoreLogsResponse}
//	@Router			/logs/score [get]
func ScoreLogs(c *gin.Context) {
	response := ScoreLogsResponse{Logs: []ScoreLogsResponseDetails{}}
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
		score := ScoreLogsResponseDetails{}
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
