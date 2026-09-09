package handlers

import (
	"context"
	stdsql "database/sql"
	"net/http"

	"lphub/database"
	"lphub/models"

	"github.com/gin-gonic/gin"
)

// ProfileStatisticsResponse is a competitive snapshot of a player's active
// least-portals submissions, with an overall summary and one summary per game.
// It intentionally does not imply leaderboard eligibility: best_portal_total
// is only the sum of the player's best active portal counts on maps they have
// played.
type ProfileStatisticsResponse struct {
	Overall ProfileStatisticsSummary `json:"overall"`
	Games   []ProfileGameStatistics  `json:"games"`
}

type ProfileStatisticsSummary struct {
	MapsPlayed          int      `json:"maps_played"`
	MapsAvailable       int      `json:"maps_available"`
	MinimumCountMatches int      `json:"minimum_count_matches"`
	ActiveSubmissions   int      `json:"active_submissions"`
	MedianWRDelta       *float64 `json:"median_wr_delta"`
	BestPortalTotal     int      `json:"best_portal_total"`
	First               int      `json:"first"`
	SecondToThird       int      `json:"second_to_third"`
	FourthToTenth       int      `json:"fourth_to_tenth"`
	EleventhPlus        int      `json:"eleventh_plus"`
}

type ProfileGameStatistics struct {
	GameID              int      `json:"game_id"`
	GameName            string   `json:"game_name"`
	IsCoop              bool     `json:"is_coop"`
	MapsPlayed          int      `json:"maps_played"`
	MapsAvailable       int      `json:"maps_available"`
	MinimumCountMatches int      `json:"minimum_count_matches"`
	ActiveSubmissions   int      `json:"active_submissions"`
	MedianWRDelta       *float64 `json:"median_wr_delta"`
	BestPortalTotal     int      `json:"best_portal_total"`
	First               int      `json:"first"`
	SecondToThird       int      `json:"second_to_third"`
	FourthToTenth       int      `json:"fourth_to_tenth"`
	EleventhPlus        int      `json:"eleventh_plus"`
}

const profileStatisticsQuery = `
	WITH active_maps AS (
		SELECT m.id AS map_id, m.game_id, g.name AS game_name, g.is_coop
		FROM maps m
		INNER JOIN games g ON g.id = m.game_id
		WHERE m.is_disabled = false
	),
	player_submissions AS (
		SELECT
			sp.id AS record_id,
			sp.map_id,
			sp.score_count,
			sp.score_time,
			am.game_id,
			am.is_coop
		FROM records_sp sp
		INNER JOIN active_maps am ON am.map_id = sp.map_id
		WHERE sp.user_id = $1 AND sp.is_deleted = false

		UNION ALL

		SELECT
			mp.id AS record_id,
			mp.map_id,
			mp.score_count,
			mp.score_time,
			am.game_id,
			am.is_coop
		FROM records_mp mp
		INNER JOIN active_maps am ON am.map_id = mp.map_id
		WHERE (mp.host_id = $1 OR mp.partner_id = $1) AND mp.is_deleted = false
	),
	player_best AS (
		SELECT DISTINCT ON (map_id)
			map_id,
			game_id,
			is_coop,
			score_count,
			score_time,
			record_id
		FROM player_submissions
		ORDER BY map_id, score_count ASC, score_time ASC, record_id ASC
	),
	player_maps AS (
		SELECT map_id FROM player_best
	),
	player_submission_counts AS (
		SELECT map_id, COUNT(*) AS active_submissions
		FROM player_submissions
		GROUP BY map_id
	),
	historical_minimums AS (
		SELECT mh.map_id, MIN(mh.score_count) AS minimum_count
		FROM map_history mh
		INNER JOIN player_maps pm ON pm.map_id = mh.map_id
		WHERE mh.category_id = 1
		GROUP BY mh.map_id
	),
	sp_best_scores AS (
		SELECT DISTINCT ON (sp.map_id, sp.user_id)
			sp.map_id,
			sp.user_id,
			sp.score_count,
			sp.score_time
		FROM records_sp sp
		INNER JOIN player_maps pm ON pm.map_id = sp.map_id
		WHERE sp.is_deleted = false
		ORDER BY sp.map_id, sp.user_id, sp.score_count ASC, sp.score_time ASC, sp.id ASC
	),
	sp_ranked_scores AS (
		SELECT
			map_id,
			user_id,
			RANK() OVER (
				PARTITION BY map_id
				ORDER BY score_count ASC, score_time ASC
			) AS placement
		FROM sp_best_scores
	),
	mp_best_teams AS (
		SELECT DISTINCT ON (mp.map_id, mp.host_id, mp.partner_id)
			mp.map_id,
			mp.host_id,
			mp.partner_id,
			mp.score_count,
			mp.score_time
		FROM records_mp mp
		INNER JOIN player_maps pm ON pm.map_id = mp.map_id
		WHERE mp.is_deleted = false
		ORDER BY mp.map_id, mp.host_id, mp.partner_id, mp.score_count ASC, mp.score_time ASC, mp.id ASC
	),
	mp_ranked_teams AS (
		SELECT
			map_id,
			host_id,
			partner_id,
			RANK() OVER (
				PARTITION BY map_id
				ORDER BY score_count ASC, score_time ASC
			) AS placement
		FROM mp_best_teams
	),
	mp_player_placements AS (
		SELECT map_id, MIN(placement) AS placement
		FROM mp_ranked_teams
		WHERE host_id = $1 OR partner_id = $1
		GROUP BY map_id
	),
	player_placements AS (
		SELECT pb.map_id, sp.placement
		FROM player_best pb
		INNER JOIN sp_ranked_scores sp
			ON sp.map_id = pb.map_id AND sp.user_id = $1
		WHERE pb.is_coop = false

		UNION ALL

		SELECT pb.map_id, mp.placement
		FROM player_best pb
		INNER JOIN mp_player_placements mp ON mp.map_id = pb.map_id
		WHERE pb.is_coop = true
	),
	player_map_stats AS (
		SELECT
			pb.map_id,
			pb.game_id,
			pb.is_coop,
			pb.score_count AS best_portal_count,
			hm.minimum_count,
			COALESCE(pp.placement, 0) AS placement
		FROM player_best pb
		LEFT JOIN historical_minimums hm ON hm.map_id = pb.map_id
		LEFT JOIN player_placements pp ON pp.map_id = pb.map_id
	),
	overall_row AS (
		SELECT
			'overall'::text AS row_type,
			NULL::integer AS game_id,
			NULL::text AS game_name,
			NULL::boolean AS is_coop,
			COUNT(am.map_id) AS maps_available,
			COUNT(pms.map_id) AS maps_played,
			COUNT(pms.map_id) FILTER (
				WHERE pms.minimum_count IS NOT NULL
					AND pms.best_portal_count = pms.minimum_count
			) AS minimum_count_matches,
			COALESCE(SUM(psc.active_submissions), 0) AS active_submissions,
			PERCENTILE_CONT(0.5) WITHIN GROUP (
				ORDER BY (pms.best_portal_count - pms.minimum_count)
			) FILTER (WHERE pms.minimum_count IS NOT NULL) AS median_wr_delta,
			COALESCE(SUM(pms.best_portal_count), 0) AS best_portal_total,
			COUNT(pms.map_id) FILTER (WHERE pms.placement = 1) AS first,
			COUNT(pms.map_id) FILTER (WHERE pms.placement BETWEEN 2 AND 3) AS second_to_third,
			COUNT(pms.map_id) FILTER (WHERE pms.placement BETWEEN 4 AND 10) AS fourth_to_tenth,
			COUNT(pms.map_id) FILTER (WHERE pms.placement >= 11) AS eleventh_plus
		FROM active_maps am
		LEFT JOIN player_map_stats pms ON pms.map_id = am.map_id
		LEFT JOIN player_submission_counts psc ON psc.map_id = am.map_id
	),
	game_rows AS (
		SELECT
			'game'::text AS row_type,
			g.id AS game_id,
			g.name AS game_name,
			g.is_coop,
			COUNT(am.map_id) AS maps_available,
			COUNT(pms.map_id) AS maps_played,
			COUNT(pms.map_id) FILTER (
				WHERE pms.minimum_count IS NOT NULL
					AND pms.best_portal_count = pms.minimum_count
			) AS minimum_count_matches,
			COALESCE(SUM(psc.active_submissions), 0) AS active_submissions,
			PERCENTILE_CONT(0.5) WITHIN GROUP (
				ORDER BY (pms.best_portal_count - pms.minimum_count)
			) FILTER (WHERE pms.minimum_count IS NOT NULL) AS median_wr_delta,
			COALESCE(SUM(pms.best_portal_count), 0) AS best_portal_total,
			COUNT(pms.map_id) FILTER (WHERE pms.placement = 1) AS first,
			COUNT(pms.map_id) FILTER (WHERE pms.placement BETWEEN 2 AND 3) AS second_to_third,
			COUNT(pms.map_id) FILTER (WHERE pms.placement BETWEEN 4 AND 10) AS fourth_to_tenth,
			COUNT(pms.map_id) FILTER (WHERE pms.placement >= 11) AS eleventh_plus
		FROM games g
		LEFT JOIN active_maps am ON am.game_id = g.id
		LEFT JOIN player_map_stats pms ON pms.map_id = am.map_id
		LEFT JOIN player_submission_counts psc ON psc.map_id = am.map_id
		GROUP BY g.id, g.name, g.is_coop
	)
	SELECT * FROM overall_row
	UNION ALL
	SELECT * FROM game_rows
	ORDER BY row_type, game_id
`

func fetchProfileStatistics(ctx context.Context, userID string) (ProfileStatisticsResponse, error) {
	response := ProfileStatisticsResponse{
		Games: []ProfileGameStatistics{},
	}

	rows, err := database.DB.QueryContext(ctx, profileStatisticsQuery, userID)
	if err != nil {
		return ProfileStatisticsResponse{}, err
	}
	defer rows.Close()

	for rows.Next() {
		var rowType string
		var gameID stdsql.NullInt64
		var gameName stdsql.NullString
		var isCoop stdsql.NullBool
		var summary ProfileStatisticsSummary
		var medianWRDelta stdsql.NullFloat64

		if err := rows.Scan(
			&rowType,
			&gameID,
			&gameName,
			&isCoop,
			&summary.MapsAvailable,
			&summary.MapsPlayed,
			&summary.MinimumCountMatches,
			&summary.ActiveSubmissions,
			&medianWRDelta,
			&summary.BestPortalTotal,
			&summary.First,
			&summary.SecondToThird,
			&summary.FourthToTenth,
			&summary.EleventhPlus,
		); err != nil {
			return ProfileStatisticsResponse{}, err
		}

		if medianWRDelta.Valid {
			median := medianWRDelta.Float64
			summary.MedianWRDelta = &median
		}

		switch rowType {
		case "overall":
			response.Overall = summary
		case "game":
			if !gameID.Valid || !gameName.Valid || !isCoop.Valid {
				return ProfileStatisticsResponse{}, stdsql.ErrNoRows
			}
			response.Games = append(response.Games, ProfileGameStatistics{
				GameID:              int(gameID.Int64),
				GameName:            gameName.String,
				IsCoop:              isCoop.Bool,
				MapsPlayed:          summary.MapsPlayed,
				MapsAvailable:       summary.MapsAvailable,
				MinimumCountMatches: summary.MinimumCountMatches,
				ActiveSubmissions:   summary.ActiveSubmissions,
				MedianWRDelta:       summary.MedianWRDelta,
				BestPortalTotal:     summary.BestPortalTotal,
				First:               summary.First,
				SecondToThird:       summary.SecondToThird,
				FourthToTenth:       summary.FourthToTenth,
				EleventhPlus:        summary.EleventhPlus,
			})
		}
	}

	if err := rows.Err(); err != nil {
		return ProfileStatisticsResponse{}, err
	}
	return response, nil
}

// GET User statistics
//
//	@Description	Get a public competitive snapshot for a user, with an overall summary and one summary per game. Statistics include only active submissions on enabled maps.
//	@Tags			users
//	@Produce		json
//	@Param			userid	path		string	true	"Steam ID"
//	@Success		200		{object}	models.Response{data=ProfileStatisticsResponse}
//	@Router			/users/{userid}/statistics [get]
func FetchUserStatistics(c *gin.Context) {
	userID := c.Param("userid")
	if !isProfileUserID(userID) {
		c.JSON(http.StatusOK, models.ErrorResponse("User not found."))
		return
	}

	var exists bool
	if err := database.DB.QueryRowContext(
		c.Request.Context(),
		`SELECT EXISTS (SELECT 1 FROM users WHERE steam_id = $1)`,
		userID,
	).Scan(&exists); err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse("Could not retrieve user statistics."))
		return
	}
	if !exists {
		c.JSON(http.StatusOK, models.ErrorResponse("User not found."))
		return
	}

	response, err := fetchProfileStatistics(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse("Could not retrieve user statistics."))
		return
	}

	c.JSON(http.StatusOK, models.Response{
		Success: true,
		Message: "Successfully retrieved user statistics.",
		Data:    response,
	})
}
