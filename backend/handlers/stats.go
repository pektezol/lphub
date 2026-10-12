package handlers

import (
	"net/http"
	"strconv"
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
	ScoreRank  int              `json:"score_rank"`
	WRDelta    int              `json:"wr_delta"`
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
//	@Param			limit		query	int	false	"Maximum number of score entries to return (default 100)"
//	@Param			max_ticks	query	int	false	"Only return runs with score_time less than this tick count"
//	@Param			wr_delta	query	int	false	"Only return runs with this exact wr_delta (0 selects WR-count runs)"
//	@Produce		json
//	@Success		200	{object}	models.Response{data=ScoresResponse}
//	@Failure		400	{object}	models.Response	"Invalid query parameter"
//	@Router			/stats/scores [get]
func Scores(c *gin.Context) {
	response := ScoresResponse{Logs: []ScoresDetails{}}
	limit, err := strconv.Atoi(c.DefaultQuery("limit", "100"))
	if err != nil || limit <= 0 {
		c.JSON(http.StatusBadRequest, models.ErrorResponse("limit must be a positive integer"))
		return
	}
	var maxTicks *int
	if value, exists := c.GetQuery("max_ticks"); exists {
		parsed, parseErr := strconv.Atoi(value)
		if parseErr != nil || parsed < 0 {
			c.JSON(http.StatusBadRequest, models.ErrorResponse("max_ticks must be a non-negative integer"))
			return
		}
		maxTicks = &parsed
	}
	var wrDelta *int
	if value, exists := c.GetQuery("wr_delta"); exists {
		parsed, parseErr := strconv.Atoi(value)
		if parseErr != nil || parsed < 0 {
			c.JSON(http.StatusBadRequest, models.ErrorResponse("wr_delta must be a non-negative integer"))
			return
		}
		wrDelta = &parsed
	}
	sql := `WITH sp_best AS (
		SELECT DISTINCT ON (map_id, user_id)
			map_id, user_id, score_count, score_time
		FROM records_sp
		WHERE is_deleted = false
	ORDER BY map_id, user_id, score_count, score_time
	), sp_ranked AS (
		SELECT map_id, user_id,
			RANK() OVER (PARTITION BY map_id ORDER BY score_count, score_time) AS score_rank
		FROM sp_best
	), mp_best AS (
		SELECT DISTINCT ON (map_id, host_id, partner_id)
			map_id, host_id, partner_id, score_count, score_time
		FROM records_mp
		WHERE is_deleted = false
		ORDER BY map_id, host_id, partner_id, score_count, score_time
	), mp_ranked AS (
		SELECT map_id, host_id, partner_id,
			RANK() OVER (PARTITION BY map_id ORDER BY score_count, score_time) AS score_rank
		FROM mp_best
	), placements AS (
		SELECT map_id, user_id, MIN(score_rank) AS score_rank
		FROM (
			SELECT map_id, user_id, score_rank FROM sp_ranked
			UNION ALL
			SELECT map_id, host_id AS user_id, score_rank FROM mp_ranked
			UNION ALL
			SELECT map_id, partner_id AS user_id, score_rank FROM mp_ranked
		) user_ranks
		GROUP BY map_id, user_id
	)
	SELECT g.id,
		g."name",
		g.is_coop,
		rs.map_id,
		m.name AS map_name,
		u.steam_id,
		u.user_name,
		rs.score_count,
		rs.score_time,
		COALESCE(placements.score_rank, 0),
		GREATEST(rs.score_count - COALESCE(wr.score_count, rs.score_count), 0),
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
	LEFT JOIN placements ON placements.map_id = rs.map_id AND placements.user_id = rs.user_id
	LEFT JOIN (
		SELECT map_id, MIN(score_count) AS score_count
		FROM map_history
		WHERE category_id = 1 AND user_name <> 'Placeholder'
		GROUP BY map_id
	) wr ON wr.map_id = rs.map_id
	WHERE ($1::integer IS NULL OR rs.score_time < $1)
		AND ($2::integer IS NULL OR GREATEST(rs.score_count - COALESCE(wr.score_count, rs.score_count), 0) = $2)
	ORDER BY rs.record_date DESC LIMIT $3;`
	rows, err := database.DB.Query(sql, maxTicks, wrDelta, limit)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	for rows.Next() {
		score := ScoresDetails{}
		err = rows.Scan(&score.Game.ID, &score.Game.Name, &score.Game.IsCoop, &score.Map.ID, &score.Map.Name, &score.User.SteamID, &score.User.UserName, &score.ScoreCount, &score.ScoreTime, &score.ScoreRank, &score.WRDelta, &score.DemoID, &score.Date)
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
			FROM map_history mh
			INNER JOIN maps m ON m.id = mh.map_id
			WHERE mh.category_id = 1 AND m.game_id = 1 AND mh.record_date >= '2013-01-01'
				AND mh.user_name <> 'Placeholder'
			ORDER BY record_date
		),
		map_best_at_date AS (
			SELECT 
				ds.date,
				map_ids.map_id,
				MIN(mh.score_count) as best_count
			FROM date_series ds
			CROSS JOIN (
				SELECT DISTINCT mh.map_id
				FROM map_history mh
				INNER JOIN maps m ON m.id = mh.map_id
				WHERE mh.category_id = 1 AND m.game_id = 1
					AND mh.user_name <> 'Placeholder'
			) map_ids
			LEFT JOIN map_history mh ON mh.map_id = map_ids.map_id
				AND mh.category_id = 1 
				AND mh.record_date <= ds.date
				AND mh.user_name <> 'Placeholder'
			GROUP BY ds.date, map_ids.map_id
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
			FROM map_history mh
			INNER JOIN maps m ON m.id = mh.map_id
			WHERE mh.category_id = 1 AND m.game_id = 2 AND mh.record_date >= '2013-01-01'
				AND mh.user_name <> 'Placeholder'
			ORDER BY record_date
		),
		map_best_at_date AS (
			SELECT 
				ds.date,
				map_ids.map_id,
				MIN(mh.score_count) as best_count
			FROM date_series ds
			CROSS JOIN (
				SELECT DISTINCT mh.map_id
				FROM map_history mh
				INNER JOIN maps m ON m.id = mh.map_id
				WHERE mh.category_id = 1 AND m.game_id = 2
					AND mh.user_name <> 'Placeholder'
			) map_ids
			LEFT JOIN map_history mh ON mh.map_id = map_ids.map_id
				AND mh.category_id = 1 
				AND mh.record_date <= ds.date
				AND mh.user_name <> 'Placeholder'
			GROUP BY ds.date, map_ids.map_id
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
