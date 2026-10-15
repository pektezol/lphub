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
	Game         models.Game      `json:"game"`
	User         models.UserShort `json:"user"`
	Map          models.MapShort  `json:"map"`
	ScoreCount   int              `json:"score_count"`
	ScoreTime    int              `json:"score_time"`
	ScoreRank    int              `json:"score_rank"`
	ScoreWRDelta int              `json:"score_wr_delta"`
	DemoID       string           `json:"demo_id"`
	Date         time.Time        `json:"date"`
}

type TimelinePoint struct {
	Date         string                `json:"date"`
	Count        int                   `json:"count"`
	Improvements []TimelineImprovement `json:"improvements"`
}

type TimelineImprovement struct {
	User       models.UserShort `json:"user"`
	Map        models.MapShort  `json:"map"`
	ScoreDelta int              `json:"score_delta"`
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
//	@Param			max_ticks	query	int	false	"Only return runs with score_time less than or equal this tick count"
//	@Param			max_rank	query	int	false	"Only return runs ranked at or better than this rank by score count and time (1 selects world records)"
//	@Param			hide_obsolete	query	bool	false	"Only return each user's personal best runs per map"
//	@Param			wr_delta	query	int	false	"Only return runs with this exact wr_delta (0 selects WR-count runs)"
//	@Param			start		query	string	false	"Include scores on or after this date (YYYY-MM-DD)"
//	@Param			end			query	string	false	"Include scores through this date (YYYY-MM-DD)"
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
	var maxRank *int
	if value, exists := c.GetQuery("max_rank"); exists {
		parsed, parseErr := strconv.Atoi(value)
		if parseErr != nil || parsed < 1 {
			c.JSON(http.StatusBadRequest, models.ErrorResponse("max_rank must be a positive integer"))
			return
		}
		maxRank = &parsed
	}
	hideObsolete := false
	if value, exists := c.GetQuery("hide_obsolete"); exists {
		parsed, parseErr := strconv.ParseBool(value)
		if parseErr != nil {
			c.JSON(http.StatusBadRequest, models.ErrorResponse("hide_obsolete must be a boolean"))
			return
		}
		hideObsolete = parsed
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
	var startDate *time.Time
	if value, exists := c.GetQuery("start"); exists {
		parsed, parseErr := time.Parse("2006-01-02", value)
		if parseErr != nil {
			c.JSON(http.StatusBadRequest, models.ErrorResponse("start must be a date in YYYY-MM-DD format"))
			return
		}
		startDate = &parsed
	}
	var endDate *time.Time
	if value, exists := c.GetQuery("end"); exists {
		parsed, parseErr := time.Parse("2006-01-02", value)
		if parseErr != nil {
			c.JSON(http.StatusBadRequest, models.ErrorResponse("end must be a date in YYYY-MM-DD format"))
			return
		}
		// Make the supplied end date inclusive while using an exclusive SQL bound.
		parsed = parsed.AddDate(0, 0, 1)
		endDate = &parsed
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
	), user_runs AS (
		SELECT map_id, user_id, score_count, score_time
		FROM records_sp WHERE is_deleted = false
		UNION ALL
		SELECT map_id, host_id AS user_id, score_count, score_time
		FROM records_mp WHERE is_deleted = false
		UNION ALL
		SELECT map_id, partner_id AS user_id, score_count, score_time
		FROM records_mp WHERE is_deleted = false
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
	), leaderboard_wrs AS (
		SELECT map_id, MIN(score_count) AS score_count
		FROM (
			SELECT map_id, score_count FROM records_sp WHERE is_deleted = false
			UNION ALL
			SELECT map_id, score_count FROM records_mp WHERE is_deleted = false
		) leaderboard_records
		GROUP BY map_id
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
	LEFT JOIN leaderboard_wrs wr ON wr.map_id = rs.map_id
	WHERE ($1::integer IS NULL OR rs.score_time <= $1)
		AND ($2::integer IS NULL OR GREATEST(rs.score_count - COALESCE(wr.score_count, rs.score_count), 0) = $2)
		AND ($3::date IS NULL OR rs.record_date >= $3)
		AND ($4::date IS NULL OR rs.record_date < $4)
		AND ($5::integer IS NULL OR placements.score_rank <= $5)
		AND (NOT $6::boolean OR NOT EXISTS (
			SELECT 1 FROM user_runs better
			WHERE better.map_id = rs.map_id AND better.user_id = rs.user_id
				AND (better.score_count < rs.score_count
					OR (better.score_count = rs.score_count AND better.score_time < rs.score_time))
		))
	ORDER BY rs.record_date DESC LIMIT $7;`
	rows, err := database.DB.Query(sql, maxTicks, wrDelta, startDate, endDate, maxRank, hideObsolete, limit)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	for rows.Next() {
		score := ScoresDetails{}
		err = rows.Scan(&score.Game.ID, &score.Game.Name, &score.Game.IsCoop, &score.Map.ID, &score.Map.Name, &score.User.SteamID, &score.User.UserName, &score.ScoreCount, &score.ScoreTime, &score.ScoreRank, &score.ScoreWRDelta, &score.DemoID, &score.Date)
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
			Date:         dateTime.Format("2006-01-02"),
			Count:        count,
			Improvements: []TimelineImprovement{},
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
			Date:         dateTime.Format("2006-01-02"),
			Count:        count,
			Improvements: []TimelineImprovement{},
		})
	}
	if err := rows.Err(); err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	rows, err = database.DB.Query(`
			WITH history AS (
			SELECT mh.id, mh.map_id, mh.record_date, mh.user_name, mh.score_count,
					m.game_id, m.name,
					LAG(mh.score_count) OVER (
						PARTITION BY mh.map_id ORDER BY mh.record_date, mh.id
					) AS previous_score_count
				FROM map_history mh
				INNER JOIN maps m ON m.id = mh.map_id
				WHERE mh.category_id = 1 AND m.game_id IN (1, 2)
					AND mh.user_name <> 'Placeholder'
			)
			SELECT history.record_date, history.game_id, history.user_name, history.name,
				history.map_id, COALESCE(u.steam_id, ''),
				COALESCE(history.previous_score_count, history.score_count) - history.score_count AS score_delta
			FROM history
			LEFT JOIN LATERAL (
				SELECT steam_id FROM users WHERE user_name = history.user_name
				ORDER BY updated_at DESC LIMIT 1
			) u ON TRUE
			WHERE history.record_date >= '2013-01-01'
			ORDER BY history.record_date, history.name, history.id`)
	if err != nil {
		return
	}
	defer rows.Close()
	for rows.Next() {
		var date time.Time
		var gameID int
		var improvement TimelineImprovement
		if err := rows.Scan(&date, &gameID, &improvement.User.UserName, &improvement.Map.Name, &improvement.Map.ID, &improvement.User.SteamID, &improvement.ScoreDelta); err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
		points := result.Singleplayer
		if gameID == 2 {
			points = result.Multiplayer
		}
		for i := range points {
			if points[i].Date == date.Format("2006-01-02") {
				if points[i].Improvements == nil {
					points[i].Improvements = []TimelineImprovement{}
				}
				points[i].Improvements = append(points[i].Improvements, improvement)
				break
			}
		}
	}
	if err := rows.Err(); err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, models.Response{
		Success: true,
		Message: "Successfully retrieved portal count timeline.",
		Data:    result,
	})
}
