package handlers

import (
	"net/http"
	"os"
	"regexp"
	"sort"
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
	user, _ := c.Get("user")
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
	// Get user rankings. We are basically doing the same thing in RankingsLPHUB endpoint lol.
	rankingsList := RankingsResponse{
		Singleplayer: []models.UserRanking{},
		Multiplayer:  []models.UserRanking{},
		Overall:      []models.UserRanking{},
	}
	// Singleplayer rankings
	rows, err = database.DB.Query(`SELECT * FROM get_rankings_singleplayer();`)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	for rows.Next() {
		ranking := models.UserRanking{}
		err = rows.Scan(&ranking.User.SteamID, &ranking.User.UserName, &ranking.User.AvatarLink, &ranking.TotalScore)
		if err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
		rankingsList.Singleplayer = append(rankingsList.Singleplayer, ranking)
	}
	// Multiplayer rankings
	rows, err = database.DB.Query(`SELECT * FROM get_rankings_multiplayer();`)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	for rows.Next() {
		ranking := models.UserRanking{}
		err = rows.Scan(&ranking.User.SteamID, &ranking.User.UserName, &ranking.User.AvatarLink, &ranking.TotalScore)
		if err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
		rankingsList.Multiplayer = append(rankingsList.Multiplayer, ranking)
	}
	// Overall rankings
	var hasOverallPlacement bool
	for _, spRanking := range rankingsList.Singleplayer {
		for _, mpRanking := range rankingsList.Multiplayer {
			if spRanking.User.SteamID == mpRanking.User.SteamID {
				if spRanking.User.SteamID == user.(models.User).SteamID {
					hasOverallPlacement = true
				}
				totalScore := spRanking.TotalScore + mpRanking.TotalScore
				overallRanking := models.UserRanking{
					User:       spRanking.User,
					TotalScore: totalScore,
				}
				rankingsList.Overall = append(rankingsList.Overall, overallRanking)
				break
			}
		}
	}
	// Sort the overall rankings
	sort.Slice(rankingsList.Overall, func(i, j int) bool {
		a := rankingsList.Overall[i]
		b := rankingsList.Overall[j]
		if a.TotalScore == b.TotalScore {
			return a.User.SteamID < b.User.SteamID
		}
		return a.TotalScore < b.TotalScore
	})

	placement := 1
	ties := 0
	for index := 0; index < len(rankingsList.Singleplayer); index++ {
		if index != 0 && rankingsList.Singleplayer[index-1].TotalScore == rankingsList.Singleplayer[index].TotalScore {
			ties++
			rankingsList.Singleplayer[index].Placement = placement - ties
		} else {
			ties = 0
			rankingsList.Singleplayer[index].Placement = placement
		}
		placement++
	}

	placement = 1
	ties = 0
	for index := 0; index < len(rankingsList.Multiplayer); index++ {
		if index != 0 && rankingsList.Multiplayer[index-1].TotalScore == rankingsList.Multiplayer[index].TotalScore {
			ties++
			rankingsList.Multiplayer[index].Placement = placement - ties
		} else {
			ties = 0
			rankingsList.Multiplayer[index].Placement = placement
		}
		placement++
	}

	placement = 1
	ties = 0
	for index := 0; index < len(rankingsList.Overall); index++ {
		if index != 0 && rankingsList.Overall[index-1].TotalScore == rankingsList.Overall[index].TotalScore {
			ties++
			rankingsList.Overall[index].Placement = placement - ties
		} else {
			ties = 0
			rankingsList.Overall[index].Placement = placement
		}
		placement++
	}
	// After we did that heavy calculation and got the rankings of ALL players, let's see if our user exists and grab the placements if they do.
	for _, singleplayer := range rankingsList.Singleplayer {
		if singleplayer.User.SteamID == user.(models.User).SteamID {
			rankings.Singleplayer.Rank = singleplayer.Placement
			break
		}
	}
	for _, multiplayer := range rankingsList.Multiplayer {
		if multiplayer.User.SteamID == user.(models.User).SteamID {
			rankings.Cooperative.Rank = multiplayer.Placement
			break
		}
	}
	if hasOverallPlacement {
		for _, overall := range rankingsList.Overall {
			if overall.User.SteamID == user.(models.User).SteamID {
				rankings.Overall.Rank = overall.Placement
				break
			}
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
	placementsRows, err := database.DB.Query(`SELECT * FROM get_placements_singleplayer($1);`, user.(models.User).SteamID)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	placements := []int{}
	placementIndex := 0
	for placementsRows.Next() {
		var mapID int
		var placement int
		placementsRows.Scan(&mapID, &placement)
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
	placementsRows, err = database.DB.Query(`SELECT * FROM get_placements_multiplayer($1);`, user.(models.User).SteamID)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	placements = []int{}
	placementIndex = 0
	for placementsRows.Next() {
		var mapID int
		var placement int
		placementsRows.Scan(&mapID, &placement)
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
	// Get user rankings. We are basically doing the same thing in RankingsLPHUB endpoint lol.
	rankingsList := RankingsResponse{
		Singleplayer: []models.UserRanking{},
		Multiplayer:  []models.UserRanking{},
		Overall:      []models.UserRanking{},
	}
	// Singleplayer rankings
	rows, err = database.DB.Query(`SELECT * FROM get_rankings_singleplayer();`)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	for rows.Next() {
		ranking := models.UserRanking{}
		err = rows.Scan(&ranking.User.SteamID, &ranking.User.UserName, &ranking.User.AvatarLink, &ranking.TotalScore)
		if err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
		rankingsList.Singleplayer = append(rankingsList.Singleplayer, ranking)
	}
	// Multiplayer rankings
	rows, err = database.DB.Query(`SELECT * FROM get_rankings_multiplayer();`)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	for rows.Next() {
		ranking := models.UserRanking{}
		err = rows.Scan(&ranking.User.SteamID, &ranking.User.UserName, &ranking.User.AvatarLink, &ranking.TotalScore)
		if err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
		rankingsList.Multiplayer = append(rankingsList.Multiplayer, ranking)
	}
	// Overall rankings
	var hasOverallPlacement bool
	for _, spRanking := range rankingsList.Singleplayer {
		for _, mpRanking := range rankingsList.Multiplayer {
			if spRanking.User.SteamID == mpRanking.User.SteamID {
				if spRanking.User.SteamID == user.SteamID {
					hasOverallPlacement = true
				}
				totalScore := spRanking.TotalScore + mpRanking.TotalScore
				overallRanking := models.UserRanking{
					User:       spRanking.User,
					TotalScore: totalScore,
				}
				rankingsList.Overall = append(rankingsList.Overall, overallRanking)
				break
			}
		}
	}
	// Sort the overall rankings
	sort.Slice(rankingsList.Overall, func(i, j int) bool {
		a := rankingsList.Overall[i]
		b := rankingsList.Overall[j]
		if a.TotalScore == b.TotalScore {
			return a.User.SteamID < b.User.SteamID
		}
		return a.TotalScore < b.TotalScore
	})

	placement := 1
	ties := 0
	for index := 0; index < len(rankingsList.Singleplayer); index++ {
		if index != 0 && rankingsList.Singleplayer[index-1].TotalScore == rankingsList.Singleplayer[index].TotalScore {
			ties++
			rankingsList.Singleplayer[index].Placement = placement - ties
		} else {
			ties = 0
			rankingsList.Singleplayer[index].Placement = placement
		}
		placement++
	}

	placement = 1
	ties = 0
	for index := 0; index < len(rankingsList.Multiplayer); index++ {
		if index != 0 && rankingsList.Multiplayer[index-1].TotalScore == rankingsList.Multiplayer[index].TotalScore {
			ties++
			rankingsList.Multiplayer[index].Placement = placement - ties
		} else {
			ties = 0
			rankingsList.Multiplayer[index].Placement = placement
		}
		placement++
	}

	placement = 1
	ties = 0
	for index := 0; index < len(rankingsList.Overall); index++ {
		if index != 0 && rankingsList.Overall[index-1].TotalScore == rankingsList.Overall[index].TotalScore {
			ties++
			rankingsList.Overall[index].Placement = placement - ties
		} else {
			ties = 0
			rankingsList.Overall[index].Placement = placement
		}
		placement++
	}
	// After we did that heavy calculation and got the rankings of ALL players, let's see if our user exists
	// and grab the placements if they do.
	for _, singleplayer := range rankingsList.Singleplayer {
		if singleplayer.User.SteamID == user.SteamID {
			rankings.Singleplayer.Rank = singleplayer.Placement
			break
		}
	}
	for _, multiplayer := range rankingsList.Multiplayer {
		if multiplayer.User.SteamID == user.SteamID {
			rankings.Cooperative.Rank = multiplayer.Placement
			break
		}
	}
	if hasOverallPlacement {
		for _, overall := range rankingsList.Overall {
			if overall.User.SteamID == user.SteamID {
				rankings.Overall.Rank = overall.Placement
				break
			}
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
	placementsRows, err := database.DB.Query(`SELECT * FROM get_placements_singleplayer($1);`, user.SteamID)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	placements := []int{}
	placementIndex := 0
	for placementsRows.Next() {
		var mapID int
		var placement int
		placementsRows.Scan(&mapID, &placement)
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
	placementsRows, err = database.DB.Query(`SELECT * FROM get_placements_multiplayer($1);`, user.SteamID)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	placements = []int{}
	placementIndex = 0
	for placementsRows.Next() {
		var mapID int
		var placement int
		placementsRows.Scan(&mapID, &placement)
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
	user, _ := c.Get("user")
	profile, err := GetPlayerSummaries(user.(models.User).SteamID, os.Getenv("API_KEY"))
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	// Update profile
	sql := `UPDATE users SET user_name = $1, avatar_link = $2, country_code = $3, updated_at = $4 WHERE steam_id = $5`
	_, err = database.DB.Exec(sql, profile.PersonaName, profile.AvatarFull, profile.LocCountryCode, time.Now().UTC(), user.(models.User).SteamID)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
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
	user, _ := c.Get("user")
	code := c.Query("country_code")
	if code == "" {
		c.JSON(http.StatusOK, models.ErrorResponse("Enter a valid country code."))
		return
	}
	var validCode string
	err := database.DB.QueryRow(`SELECT country_code FROM countries WHERE country_code = $1`, code).Scan(&validCode)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	// Valid code, update profile
	_, err = database.DB.Exec(`UPDATE users SET country_code = $1 WHERE steam_id = $2`, validCode, user.(models.User).SteamID)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, models.Response{
		Success: true,
		Message: "Successfully updated country code.",
	})
}
