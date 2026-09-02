package handlers

import (
	"encoding/json"
	"io"
	"net/http"
	"os"
	"sort"

	"lphub/database"
	"lphub/models"

	"github.com/gin-gonic/gin"
)

type SearchResponse struct {
	Players []models.UserShortWithAvatar `json:"players"`
	Maps    []MapShortWithGame           `json:"maps"`
}

type RankingsResponse struct {
	Singleplayer []models.UserRanking `json:"rankings_singleplayer"`
	Multiplayer  []models.UserRanking `json:"rankings_multiplayer"`
	Overall      []models.UserRanking `json:"rankings_overall"`
}

type SteamUserRanking struct {
	UserName     string `json:"user_name"`
	AvatarLink   string `json:"avatar_link"`
	SteamID      string `json:"steam_id"`
	SpScore      int    `json:"sp_score"`
	MpScore      int    `json:"mp_score"`
	OverallScore int    `json:"overall_score"`
	SpRank       int    `json:"sp_rank"`
	MpRank       int    `json:"mp_rank"`
	OverallRank  int    `json:"overall_rank"`
}

type RankingsSteamResponse struct {
	Singleplayer []SteamUserRanking `json:"rankings_singleplayer"`
	Multiplayer  []SteamUserRanking `json:"rankings_multiplayer"`
	Overall      []SteamUserRanking `json:"rankings_overall"`
}

type MapShortWithGame struct {
	ID           int    `json:"id"`
	GameID       int    `json:"game_id"`
	Game         string `json:"game"`
	ChapterID    int    `json:"chapter_id"`
	SectionKind  string `json:"section_kind"`
	SectionLabel string `json:"section_label"`
	SectionName  string `json:"section_name"`
	Map          string `json:"map"`
}

// GET Rankings LPHUB
//
//	@Description	Get rankings of every player from LPHUB.
//	@Tags			rankings
//	@Produce		json
//	@Success		200	{object}	models.Response{data=RankingsResponse}
//	@Router			/rankings/lphub [get]
func RankingsLPHUB(c *gin.Context) {
	response := RankingsResponse{
		Singleplayer: []models.UserRanking{},
		Multiplayer:  []models.UserRanking{},
		Overall:      []models.UserRanking{},
	}
	rows, err := database.DB.Query(`SELECT * FROM get_rankings_singleplayer()`)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	defer rows.Close()
	for rows.Next() {
		ranking := models.UserRanking{}
		if err := rows.Scan(
			&ranking.User.SteamID,
			&ranking.User.UserName,
			&ranking.User.AvatarLink,
			&ranking.TotalScore,
		); err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
		response.Singleplayer = append(response.Singleplayer, ranking)
	}
	if err := rows.Err(); err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}

	rows, err = database.DB.Query(`SELECT * FROM get_rankings_multiplayer()`)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	defer rows.Close()
	for rows.Next() {
		ranking := models.UserRanking{}
		if err := rows.Scan(
			&ranking.User.SteamID,
			&ranking.User.UserName,
			&ranking.User.AvatarLink,
			&ranking.TotalScore,
		); err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
		response.Multiplayer = append(response.Multiplayer, ranking)
	}
	if err := rows.Err(); err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}

	for _, spRanking := range response.Singleplayer {
		for _, mpRanking := range response.Multiplayer {
			if spRanking.User.SteamID == mpRanking.User.SteamID {
				response.Overall = append(response.Overall, models.UserRanking{
					User:       spRanking.User,
					TotalScore: spRanking.TotalScore + mpRanking.TotalScore,
				})
				break
			}
		}
	}
	sort.Slice(response.Overall, func(i, j int) bool {
		a, b := response.Overall[i], response.Overall[j]
		if a.TotalScore == b.TotalScore {
			return a.User.SteamID < b.User.SteamID
		}
		return a.TotalScore < b.TotalScore
	})
	assignPlacements(response.Singleplayer)
	assignPlacements(response.Multiplayer)
	assignPlacements(response.Overall)

	c.JSON(http.StatusOK, models.Response{
		Success: true,
		Message: "Successfully retrieved rankings.",
		Data:    response,
	})
}

func assignPlacements(rankings []models.UserRanking) {
	placement, ties := 1, 0
	for index := range rankings {
		if index > 0 && rankings[index-1].TotalScore == rankings[index].TotalScore {
			ties++
			rankings[index].Placement = placement - ties
		} else {
			ties = 0
			rankings[index].Placement = placement
		}
		placement++
	}
}

// GET Rankings Steam
//
//	@Description	Get rankings of every player from Steam.
//	@Tags			rankings
//	@Produce		json
//	@Success		200	{object}	models.Response{data=RankingsSteamResponse}
//	@Router			/rankings/steam [get]
func RankingsSteam(c *gin.Context) {
	response := RankingsSteamResponse{
		Singleplayer: []SteamUserRanking{},
		Multiplayer:  []SteamUserRanking{},
		Overall:      []SteamUserRanking{},
	}
	files := []struct {
		path   string
		target *[]SteamUserRanking
	}{
		{path: "../rankings/output/sp.json", target: &response.Singleplayer},
		{path: "../rankings/output/mp.json", target: &response.Multiplayer},
		{path: "../rankings/output/overall.json", target: &response.Overall},
	}
	for _, item := range files {
		file, err := os.Open(item.path)
		if err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
		contents, readErr := io.ReadAll(file)
		closeErr := file.Close()
		if readErr != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(readErr.Error()))
			return
		}
		if closeErr != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(closeErr.Error()))
			return
		}
		if err := json.Unmarshal(contents, item.target); err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
	}
	c.JSON(http.StatusOK, models.Response{
		Success: true,
		Message: "Successfully retrieved rankings.",
		Data:    response,
	})
}

// GET Search With Query
//
//	@Description	Get all user and map data matching to the query.
//	@Tags			search
//	@Produce		json
//	@Param			q	query		string	false	"Search user or map name."
//	@Success		200	{object}	models.Response{data=SearchResponse}
//	@Router			/search [get]
func SearchWithQuery(c *gin.Context) {
	query := c.Query("q")
	response := SearchResponse{
		Players: []models.UserShortWithAvatar{},
		Maps:    []MapShortWithGame{},
	}

	mapRows, err := database.DB.Query(`
		SELECT
			m.id,
			m.game_id,
			g.name,
			m.chapter_id,
			g.section_kind,
			g.section_label,
			c.name,
			m.name
		FROM maps m
		INNER JOIN games g ON g.id = m.game_id
		INNER JOIN chapters c ON c.id = m.chapter_id
		WHERE m.name ILIKE '%' || $1 || '%'
		ORDER BY g.id, c.id, m.sort_order, m.id
	`, query)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	defer mapRows.Close()
	for mapRows.Next() {
		mapResult := MapShortWithGame{}
		if err := mapRows.Scan(
			&mapResult.ID,
			&mapResult.GameID,
			&mapResult.Game,
			&mapResult.ChapterID,
			&mapResult.SectionKind,
			&mapResult.SectionLabel,
			&mapResult.SectionName,
			&mapResult.Map,
		); err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
		response.Maps = append(response.Maps, mapResult)
	}
	if err := mapRows.Err(); err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}

	playerRows, err := database.DB.Query(
		`SELECT steam_id, user_name, avatar_link FROM users WHERE user_name ILIKE '%' || $1 || '%'`,
		query,
	)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	defer playerRows.Close()
	for playerRows.Next() {
		player := models.UserShortWithAvatar{}
		if err := playerRows.Scan(&player.SteamID, &player.UserName, &player.AvatarLink); err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
		response.Players = append(response.Players, player)
	}
	if err := playerRows.Err(); err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusOK, models.Response{
		Success: true,
		Message: "Search successfully retrieved.",
		Data:    response,
	})
}
