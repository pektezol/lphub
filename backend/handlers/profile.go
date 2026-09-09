package handlers

import (
	"context"
	"fmt"
	"sort"

	"lphub/database"
	"lphub/models"
)

func fetchProfile(ctx context.Context, user models.User, links models.Links) (ProfileResponse, error) {
	response := ProfileResponse{
		SteamID:     user.SteamID,
		UserName:    user.UserName,
		AvatarLink:  user.AvatarLink,
		CountryCode: user.CountryCode,
		Titles:      user.Titles,
		Links:       links,
	}
	var err error
	response.Rankings, err = fetchProfileRankings(ctx, user.SteamID)
	if err != nil {
		return ProfileResponse{}, err
	}
	response.Records, err = fetchProfileRecords(ctx, user.SteamID)
	if err != nil {
		return ProfileResponse{}, err
	}
	response.ModeCompletions, err = fetchModeCompletions(ctx, user.SteamID)
	if err != nil {
		return ProfileResponse{}, err
	}
	return response, nil
}

func fetchProfileTitles(ctx context.Context, userID string) ([]models.Title, error) {
	rows, err := database.DB.QueryContext(ctx, `SELECT t.title_name, t.title_color FROM titles t INNER JOIN user_titles ut ON t.id = ut.title_id WHERE ut.user_id = $1`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	titles := []models.Title{}
	for rows.Next() {
		var title models.Title
		if err := rows.Scan(&title.Name, &title.Color); err != nil {
			return nil, err
		}
		titles = append(titles, title)
	}
	return titles, rows.Err()
}

func fetchProfileCompletions(ctx context.Context, userID string) (ProfileRankings, error) {
	rankings := ProfileRankings{}
	err := database.DB.QueryRowContext(ctx, `SELECT count(id), (SELECT count(id) FROM maps m WHERE m.game_id = 2 AND m.is_disabled = false) FROM maps m WHERE m.game_id = 1 AND m.is_disabled = false`).Scan(&rankings.Singleplayer.CompletionTotal, &rankings.Cooperative.CompletionTotal)
	if err != nil {
		return ProfileRankings{}, err
	}
	rankings.Overall.CompletionTotal = rankings.Singleplayer.CompletionTotal + rankings.Cooperative.CompletionTotal
	rows, err := database.DB.QueryContext(ctx, `SELECT 'records_sp' AS table_name, COUNT(*) FROM (
		    SELECT sp.map_id FROM records_sp sp INNER JOIN maps record_map ON record_map.id = sp.map_id JOIN (
		        SELECT mh.map_id, MIN(mh.score_count) AS min_score_count FROM map_history mh INNER JOIN maps history_map ON history_map.id = mh.map_id WHERE mh.category_id = 1 AND history_map.game_id = 1 GROUP BY mh.map_id
		    ) AS subquery_sp ON sp.map_id = subquery_sp.map_id AND sp.score_count = subquery_sp.min_score_count
		    WHERE sp.user_id = $1 AND sp.is_deleted = false AND record_map.game_id = 1 GROUP BY sp.map_id
	) AS unique_maps
	UNION ALL
	SELECT 'records_mp' AS table_name, COUNT(*) FROM (
		    SELECT mp.map_id FROM records_mp mp INNER JOIN maps record_map ON record_map.id = mp.map_id JOIN (
		        SELECT mh.map_id, MIN(mh.score_count) AS min_score_count FROM map_history mh INNER JOIN maps history_map ON history_map.id = mh.map_id WHERE mh.category_id = 1 AND history_map.game_id = 2 GROUP BY mh.map_id
		    ) AS subquery_mp ON mp.map_id = subquery_mp.map_id AND mp.score_count = subquery_mp.min_score_count
		    WHERE (mp.host_id = $1 OR mp.partner_id = $1) AND mp.is_deleted = false AND record_map.game_id = 2 GROUP BY mp.map_id
	) AS unique_maps`, userID)
	if err != nil {
		return ProfileRankings{}, err
	}
	defer rows.Close()
	for rows.Next() {
		var tableName string
		var count int
		if err := rows.Scan(&tableName, &count); err != nil {
			return ProfileRankings{}, err
		}
		switch tableName {
		case "records_sp":
			rankings.Singleplayer.CompletionCount = count
		case "records_mp":
			rankings.Cooperative.CompletionCount = count
		}
	}
	rankings.Overall.CompletionCount = rankings.Singleplayer.CompletionCount + rankings.Cooperative.CompletionCount
	return rankings, rows.Err()
}

func fetchProfileRankings(ctx context.Context, userID string) (ProfileRankings, error) {
	rankings, err := fetchProfileCompletions(ctx, userID)
	if err != nil {
		return ProfileRankings{}, err
	}
	singleplayer, err := fetchProfileLeaderboard(ctx, `SELECT * FROM get_rankings_singleplayer()`)
	if err != nil {
		return ProfileRankings{}, err
	}
	multiplayer, err := fetchProfileLeaderboard(ctx, `SELECT * FROM get_rankings_multiplayer()`)
	if err != nil {
		return ProfileRankings{}, err
	}
	overall := []models.UserRanking{}
	for _, sp := range singleplayer {
		for _, mp := range multiplayer {
			if sp.User.SteamID == mp.User.SteamID {
				overall = append(overall, models.UserRanking{
					User:       sp.User,
					TotalScore: sp.TotalScore + mp.TotalScore,
				})
				break
			}
		}
	}
	sort.Slice(overall, func(i, j int) bool {
		if overall[i].TotalScore == overall[j].TotalScore {
			return overall[i].User.SteamID < overall[j].User.SteamID
		}
		return overall[i].TotalScore < overall[j].TotalScore
	})
	rankings.Singleplayer.Rank = profileRank(singleplayer, userID)
	rankings.Cooperative.Rank = profileRank(multiplayer, userID)
	rankings.Overall.Rank = profileRank(overall, userID)
	return rankings, nil
}

func fetchProfileLeaderboard(ctx context.Context, query string) ([]models.UserRanking, error) {
	rows, err := database.DB.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	rankings := []models.UserRanking{}
	for rows.Next() {
		var ranking models.UserRanking
		if err := rows.Scan(&ranking.User.SteamID, &ranking.User.UserName, &ranking.User.AvatarLink, &ranking.TotalScore); err != nil {
			return nil, err
		}
		rankings = append(rankings, ranking)
	}
	return rankings, rows.Err()
}

func profileRank(rankings []models.UserRanking, userID string) int {
	assignPlacements(rankings)
	for _, ranking := range rankings {
		if ranking.User.SteamID == userID {
			return ranking.Placement
		}
	}
	return 0
}

func fetchProfileRecords(ctx context.Context, userID string) ([]ProfileRecords, error) {
	singleplayer, err := fetchProfileRecordGroup(ctx, userID, `SELECT sp.id, m.game_id, m.chapter_id, sp.map_id, m."name", COALESCE((SELECT mh.score_count FROM map_history mh WHERE mh.map_id = sp.map_id AND mh.category_id = 1 ORDER BY mh.score_count ASC LIMIT 1), 0) AS wr_count, sp.score_count, sp.score_time, sp.demo_id, sp.record_date, g.name, g.section_kind, g.section_label, c.name
	FROM records_sp sp
	INNER JOIN maps m ON sp.map_id = m.id
	INNER JOIN games g ON g.id = m.game_id
	INNER JOIN chapters c ON c.id = m.chapter_id
	WHERE sp.user_id = $1 AND sp.is_deleted = false AND m.game_id = 1 ORDER BY sp.map_id, sp.score_count, sp.score_time`, `SELECT * FROM get_placements_singleplayer($1)`)
	if err != nil {
		return nil, err
	}
	mel, err := fetchProfileRecordGroup(ctx, userID, `SELECT sp.id, m.game_id, m.chapter_id, sp.map_id, m."name", COALESCE((SELECT mh.score_count FROM map_history mh WHERE mh.map_id = sp.map_id AND mh.category_id = 1 ORDER BY mh.score_count ASC LIMIT 1), 0) AS wr_count, sp.score_count, sp.score_time, sp.demo_id, sp.record_date, g.name, g.section_kind, g.section_label, c.name
	FROM records_sp sp
	INNER JOIN maps m ON sp.map_id = m.id
	INNER JOIN games g ON g.id = m.game_id
	INNER JOIN chapters c ON c.id = m.chapter_id
	WHERE sp.user_id = $1 AND sp.is_deleted = false AND m.game_id = 3 ORDER BY sp.map_id, sp.score_count, sp.score_time`, `SELECT * FROM get_placements_mel($1)`)
	if err != nil {
		return nil, err
	}
	multiplayer, err := fetchProfileRecordGroup(ctx, userID, `SELECT mp.id, m.game_id, m.chapter_id, mp.map_id, m."name", COALESCE((SELECT mh.score_count FROM map_history mh WHERE mh.map_id = mp.map_id AND mh.category_id = 1 ORDER BY mh.score_count ASC LIMIT 1), 0) AS wr_count,  mp.score_count, mp.score_time, CASE WHEN host_id = $1 THEN mp.host_demo_id WHEN partner_id = $1 THEN mp.partner_demo_id END demo_id, mp.record_date, g.name, g.section_kind, g.section_label, c.name
	FROM records_mp mp
	INNER JOIN maps m ON mp.map_id = m.id
	INNER JOIN games g ON g.id = m.game_id
	INNER JOIN chapters c ON c.id = m.chapter_id
	WHERE (mp.host_id = $1 OR mp.partner_id = $1) AND mp.is_deleted = false AND m.game_id = 2 ORDER BY mp.map_id, mp.score_count, mp.score_time`, `SELECT * FROM get_placements_multiplayer($1)`)
	if err != nil {
		return nil, err
	}
	return append(append(singleplayer, multiplayer...), mel...), nil
}

func fetchProfilePlacements(ctx context.Context, userID, query string) (map[int]int, error) {
	rows, err := database.DB.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	placements := make(map[int]int)
	for rows.Next() {
		var mapID, placement int
		if err := rows.Scan(&mapID, &placement); err != nil {
			return nil, err
		}
		placements[mapID] = placement
	}
	return placements, rows.Err()
}

func fetchProfileRecordGroup(ctx context.Context, userID, recordsQuery, placementsQuery string) ([]ProfileRecords, error) {
	// Finish the placement query before opening record rows, so this path only
	// needs one database connection at a time.
	placements, err := fetchProfilePlacements(ctx, userID, placementsQuery)
	if err != nil {
		return nil, err
	}
	rows, err := database.DB.QueryContext(ctx, recordsQuery, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	records := []ProfileRecords{}
	for rows.Next() {
		var record ProfileRecords
		var score ProfileScores
		if err := rows.Scan(
			&score.RecordID, &record.GameID, &record.ChapterID, &record.MapID,
			&record.MapName, &record.MapWRCount, &score.ScoreCount, &score.ScoreTime,
			&score.DemoID, &score.Date, &record.GameName, &record.SectionKind,
			&record.SectionLabel, &record.SectionName,
		); err != nil {
			return nil, err
		}
		// Preserve the legacy category_id field, which contains the chapter ID.
		record.CategoryID = record.ChapterID
		if len(records) > 0 && records[len(records)-1].MapID == record.MapID {
			records[len(records)-1].Scores = append(records[len(records)-1].Scores, score)
			continue
		}
		placement, ok := placements[record.MapID]
		if !ok {
			return nil, fmt.Errorf("placement not found for map %d", record.MapID)
		}
		record.Placement = placement
		record.Scores = []ProfileScores{score}
		records = append(records, record)
	}
	return records, rows.Err()
}

func fetchModeCompletions(ctx context.Context, userID string) ([]ProfileSectionCompletion, error) {
	rows, err := database.DB.QueryContext(ctx, `
		WITH current_cm AS (
			SELECT mh.map_id, MIN(mh.score_count) AS score_count
			FROM map_history mh
			INNER JOIN maps m ON m.id = mh.map_id
			INNER JOIN games g ON g.id = m.game_id
			WHERE mh.category_id = 1 AND g.section_kind = 'mode'
			GROUP BY mh.map_id
		),
		completed_maps AS (
			SELECT DISTINCT sp.map_id
			FROM records_sp sp
			INNER JOIN maps m ON m.id = sp.map_id
			INNER JOIN games g ON g.id = m.game_id
			INNER JOIN current_cm cm
				ON cm.map_id = sp.map_id AND cm.score_count = sp.score_count
			WHERE sp.user_id = $1
				AND sp.is_deleted = false
				AND g.section_kind = 'mode'
		)
		SELECT
			m.game_id,
			g.name,
			m.chapter_id,
			g.section_label,
			c.name,
			COUNT(m.id),
			COUNT(completed_maps.map_id)
		FROM maps m
		INNER JOIN games g ON g.id = m.game_id
		INNER JOIN chapters c ON c.id = m.chapter_id
		LEFT JOIN completed_maps ON completed_maps.map_id = m.id
		WHERE g.section_kind = 'mode' AND m.is_disabled = false
		GROUP BY m.game_id, g.name, m.chapter_id, g.section_label, c.name
		ORDER BY m.game_id, m.chapter_id
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	completions := []ProfileSectionCompletion{}
	for rows.Next() {
		completion := ProfileSectionCompletion{}
		if err := rows.Scan(
			&completion.GameID,
			&completion.GameName,
			&completion.ChapterID,
			&completion.SectionLabel,
			&completion.SectionName,
			&completion.CompletionTotal,
			&completion.CompletionCount,
		); err != nil {
			return nil, err
		}
		completions = append(completions, completion)
	}
	return completions, rows.Err()
}
