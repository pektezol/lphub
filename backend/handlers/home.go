package handlers

import (
	"encoding/json"
	"io"
	"net/http"
	"os"
	"sort"
	"strings"

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

type cachedSearchMapGroup struct {
	firstID      int
	gameID       int
	game         string
	chapterID    int
	sectionKind  string
	sectionLabel string
	sectionName  string
	mapNames     []string
}

// cachedSearchMaps avoids a database query for every search request. Keep this
// in sync with backend/database/insert/maps.sql.
var cachedSearchMaps = buildCachedSearchMaps()

func buildCachedSearchMaps() []MapShortWithGame {
	groups := []cachedSearchMapGroup{
		{
			firstID:      1,
			gameID:       1,
			game:         "Portal 2 - Singleplayer",
			chapterID:    1,
			sectionKind:  "chapter",
			sectionLabel: "Chapter",
			sectionName:  "Chapter 1 - The Courtesy Call",
			mapNames: []string{
				"Container Ride", "Portal Carousel", "Portal Gun", "Smooth Jazz", "Cube Momentum",
				"Future Starter", "Secret Panel", "Wakeup", "Incinerator",
			},
		},
		{
			firstID:      10,
			gameID:       1,
			game:         "Portal 2 - Singleplayer",
			chapterID:    2,
			sectionKind:  "chapter",
			sectionLabel: "Chapter",
			sectionName:  "Chapter 2 - The Cold Boot",
			mapNames: []string{
				"Laser Intro", "Laser Stairs", "Dual Lasers", "Laser Over Goo", "Catapult Intro", "Trust Fling",
				"Pit Flings", "Fizzler Intro",
			},
		},
		{
			firstID:      18,
			gameID:       1,
			game:         "Portal 2 - Singleplayer",
			chapterID:    3,
			sectionKind:  "chapter",
			sectionLabel: "Chapter",
			sectionName:  "Chapter 3 - The Return",
			mapNames: []string{
				"Ceiling Catapult", "Ricochet", "Bridge Intro", "Bridge The Gap", "Turret Intro", "Laser Relays",
				"Turret Blocker", "Laser vs Turret", "Pull The Rug",
			},
		},
		{
			firstID:      27,
			gameID:       1,
			game:         "Portal 2 - Singleplayer",
			chapterID:    4,
			sectionKind:  "chapter",
			sectionLabel: "Chapter",
			sectionName:  "Chapter 4 - The Surprise",
			mapNames:     []string{"Column Blocker", "Laser Chaining", "Triple Laser", "Jail Break", "Escape"},
		},
		{
			firstID:      32,
			gameID:       1,
			game:         "Portal 2 - Singleplayer",
			chapterID:    5,
			sectionKind:  "chapter",
			sectionLabel: "Chapter",
			sectionName:  "Chapter 5 - The Escape",
			mapNames:     []string{"Turret Factory", "Turret Sabotage", "Neurotoxin Sabotage", "Core"},
		},
		{
			firstID:      36,
			gameID:       1,
			game:         "Portal 2 - Singleplayer",
			chapterID:    6,
			sectionKind:  "chapter",
			sectionLabel: "Chapter",
			sectionName:  "Chapter 6 - The Fall",
			mapNames:     []string{"Underground", "Cave Johnson", "Repulsion Intro", "Bomb Flings", "Crazy Box", "PotatOS"},
		},
		{
			firstID:      42,
			gameID:       1,
			game:         "Portal 2 - Singleplayer",
			chapterID:    7,
			sectionKind:  "chapter",
			sectionLabel: "Chapter",
			sectionName:  "Chapter 7 - The Reunion",
			mapNames:     []string{"Propulsion Intro", "Propulsion Flings", "Conversion Intro", "Three Gels"},
		},
		{
			firstID:      46,
			gameID:       1,
			game:         "Portal 2 - Singleplayer",
			chapterID:    8,
			sectionKind:  "chapter",
			sectionLabel: "Chapter",
			sectionName:  "Chapter 8 - The Itch",
			mapNames: []string{
				"Test", "Funnel Intro", "Ceiling Button", "Wall Button", "Polarity", "Funnel Catch", "Stop The Box",
				"Laser Catapult", "Laser Platform", "Propulsion Catch", "Repulsion Polarity",
			},
		},
		{
			firstID:      57,
			gameID:       1,
			game:         "Portal 2 - Singleplayer",
			chapterID:    9,
			sectionKind:  "chapter",
			sectionLabel: "Chapter",
			sectionName:  "Chapter 9 - The Part Where He Kills You",
			mapNames:     []string{"Finale 1", "Finale 2", "Finale 3", "Finale 4"},
		},
		{
			firstID:      61,
			gameID:       2,
			game:         "Portal 2 - Cooperative",
			chapterID:    10,
			sectionKind:  "course",
			sectionLabel: "Course",
			sectionName:  "Course 0 - Introduction",
			mapNames:     []string{"Calibration", "Hub"},
		},
		{
			firstID:      63,
			gameID:       2,
			game:         "Portal 2 - Cooperative",
			chapterID:    11,
			sectionKind:  "course",
			sectionLabel: "Course",
			sectionName:  "Course 1 - Team Building",
			mapNames:     []string{"Doors", "Buttons", "Lasers", "Rat Maze", "Laser Crusher", "Behind The Scenes"},
		},
		{
			firstID:      69,
			gameID:       2,
			game:         "Portal 2 - Cooperative",
			chapterID:    12,
			sectionKind:  "course",
			sectionLabel: "Course",
			sectionName:  "Course 2 - Mass And Velocity",
			mapNames: []string{
				"Flings", "Infinifling", "Team Retrieval", "Vertical Flings", "Catapults", "Multifling", "Fling Crushers",
				"Industrial Fan",
			},
		},
		{
			firstID:      77,
			gameID:       2,
			game:         "Portal 2 - Cooperative",
			chapterID:    13,
			sectionKind:  "course",
			sectionLabel: "Course",
			sectionName:  "Course 3 - Hard-Light Surfaces",
			mapNames: []string{
				"Cooperative Bridges", "Bridge Swap", "Fling Block", "Catapult Block", "Bridge Fling", "Turret Walls",
				"Turret Assassin", "Bridge Testing",
			},
		},
		{
			firstID:      85,
			gameID:       2,
			game:         "Portal 2 - Cooperative",
			chapterID:    14,
			sectionKind:  "course",
			sectionLabel: "Course",
			sectionName:  "Course 4 - Excursion Funnels",
			mapNames: []string{
				"Cooperative Funnels", "Funnel Drill", "Funnel Catch", "Funnel Laser", "Cooperative Polarity", "Funnel Hop",
				"Advanced Polarity", "Funnel Maze", "Turret Warehouse",
			},
		},
		{
			firstID:      94,
			gameID:       2,
			game:         "Portal 2 - Cooperative",
			chapterID:    15,
			sectionKind:  "course",
			sectionLabel: "Course",
			sectionName:  "Course 5 - Mobility Gels",
			mapNames: []string{
				"Repulsion Jumps", "Double Bounce", "Bridge Repulsion", "Wall Repulsion", "Propulsion Crushers", "Turret Ninja",
				"Propulsion Retrieval", "Vault Entrance",
			},
		},
		{
			firstID:      102,
			gameID:       2,
			game:         "Portal 2 - Cooperative",
			chapterID:    16,
			sectionKind:  "course",
			sectionLabel: "Course",
			sectionName:  "Course 6 - Art Therapy",
			mapNames: []string{
				"Separation", "Triple Axis", "Catapult Catch", "Bridge Gels", "Maintenance", "Bridge Catch", "Double Lift",
				"Gel Maze", "Crazier Box",
			},
		},
		{
			firstID:      111,
			gameID:       3,
			game:         "Portal Stories: Mel",
			chapterID:    17,
			sectionKind:  "mode",
			sectionLabel: "Mode",
			sectionName:  "Story Mode",
			mapNames: []string{
				"Tram Ride", "Mel Intro", "Lift", "Garden", "Destroyed Garden", "Underbounce", "Once Upon", "Past Power",
				"Ramp", "Firestorm", "Junkyard", "Concepts", "Paint Fling", "Faith Plate", "Transition", "Overgrown",
				"Funnel Over Goo", "Two Of A Kind", "Destroyed", "Factory", "Core Access", "Finale",
			},
		},
		{
			firstID:      133,
			gameID:       3,
			game:         "Portal Stories: Mel",
			chapterID:    18,
			sectionKind:  "mode",
			sectionLabel: "Mode",
			sectionName:  "Advanced Mode",
			mapNames: []string{
				"Tram Ride", "Mel Intro", "Lift", "Garden", "Destroyed Garden", "Underbounce", "Once Upon", "Past Power",
				"Ramp", "Firestorm", "Junkyard", "Concepts", "Paint Fling", "Faith Plate", "Transition", "Overgrown",
				"Funnel Over Goo", "Two Of A Kind", "Destroyed", "Factory", "Core Access", "Finale",
			},
		},
	}

	maps := make([]MapShortWithGame, 0, 154)
	for _, group := range groups {
		for offset, name := range group.mapNames {
			maps = append(maps, MapShortWithGame{
				ID:           group.firstID + offset,
				GameID:       group.gameID,
				Game:         group.game,
				ChapterID:    group.chapterID,
				SectionKind:  group.sectionKind,
				SectionLabel: group.sectionLabel,
				SectionName:  group.sectionName,
				Map:          name,
			})
		}
	}

	return maps
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
	query := strings.ToLower(c.Query("q"))
	response := SearchResponse{
		Players: []models.UserShortWithAvatar{},
		Maps:    []MapShortWithGame{},
	}

	for _, cachedMap := range cachedSearchMaps {
		if strings.Contains(strings.ToLower(cachedMap.Map), query) {
			response.Maps = append(response.Maps, cachedMap)
		}
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
