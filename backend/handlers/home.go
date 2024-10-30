package handlers

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
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
	ID      int    `json:"id"`
	Game    string `json:"game"`
	Chapter string `json:"chapter"`
	Map     string `json:"map"`
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
	// Singleplayer rankings
	rows, err := database.DB.Query(`SELECT * FROM get_rankings_singleplayer();`)
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
		response.Singleplayer = append(response.Singleplayer, ranking)
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
		response.Multiplayer = append(response.Multiplayer, ranking)
	}
	// Has both so they are qualified for overall ranking
	for _, spRanking := range response.Singleplayer {
		for _, mpRanking := range response.Multiplayer {
			if spRanking.User.SteamID == mpRanking.User.SteamID {
				totalScore := spRanking.TotalScore + mpRanking.TotalScore
				overallRanking := models.UserRanking{
					User:       spRanking.User,
					TotalScore: totalScore,
				}
				response.Overall = append(response.Overall, overallRanking)
				break
			}
		}
	}

	placement := 1
	ties := 0
	for index := 0; index < len(response.Singleplayer); index++ {
		if index != 0 && response.Singleplayer[index-1].TotalScore == response.Singleplayer[index].TotalScore {
			ties++
			response.Singleplayer[index].Placement = placement - ties
		} else {
			ties = 0
			response.Singleplayer[index].Placement = placement
		}
		placement++
	}

	placement = 1
	ties = 0
	for index := 0; index < len(response.Multiplayer); index++ {
		if index != 0 && response.Multiplayer[index-1].TotalScore == response.Multiplayer[index].TotalScore {
			ties++
			response.Multiplayer[index].Placement = placement - ties
		} else {
			ties = 0
			response.Multiplayer[index].Placement = placement
		}
		placement++
	}

	placement = 1
	ties = 0
	for index := 0; index < len(response.Overall); index++ {
		if index != 0 && response.Overall[index-1].TotalScore == response.Overall[index].TotalScore {
			ties++
			response.Overall[index].Placement = placement - ties
		} else {
			ties = 0
			response.Overall[index].Placement = placement
		}
		placement++
	}

	c.JSON(http.StatusOK, models.Response{
		Success: true,
		Message: "Successfully retrieved rankings.",
		Data:    response,
	})
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
	spJson, err := os.Open("../rankings/output/sp.json")
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	defer spJson.Close()
	spJsonBytes, err := io.ReadAll(spJson)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	err = json.Unmarshal(spJsonBytes, &response.Singleplayer)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	mpJson, err := os.Open("../rankings/output/mp.json")
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	defer mpJson.Close()
	mpJsonBytes, err := io.ReadAll(mpJson)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	err = json.Unmarshal(mpJsonBytes, &response.Multiplayer)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	overallJson, err := os.Open("../rankings/output/overall.json")
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	defer overallJson.Close()
	overallJsonBytes, err := io.ReadAll(overallJson)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	err = json.Unmarshal(overallJsonBytes, &response.Overall)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
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
	query = strings.ToLower(query)
	var response SearchResponse
	// Cache all maps for faster response
	var maps = []MapShortWithGame{
		{ID: 1, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 1 - The Courtesy Call", Map: "Container Ride"},
		{ID: 2, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 1 - The Courtesy Call", Map: "Portal Carousel"},
		{ID: 3, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 1 - The Courtesy Call", Map: "Portal Gun"},
		{ID: 4, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 1 - The Courtesy Call", Map: "Smooth Jazz"},
		{ID: 5, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 1 - The Courtesy Call", Map: "Cube Momentum"},
		{ID: 6, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 1 - The Courtesy Call", Map: "Future Starter"},
		{ID: 7, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 1 - The Courtesy Call", Map: "Secret Panel"},
		{ID: 8, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 1 - The Courtesy Call", Map: "Wakeup"},
		{ID: 9, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 1 - The Courtesy Call", Map: "Incinerator"},
		{ID: 10, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 2 - The Cold Boot", Map: "Laser Intro"},
		{ID: 11, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 2 - The Cold Boot", Map: "Laser Stairs"},
		{ID: 12, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 2 - The Cold Boot", Map: "Dual Lasers"},
		{ID: 13, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 2 - The Cold Boot", Map: "Laser Over Goo"},
		{ID: 14, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 2 - The Cold Boot", Map: "Catapult Intro"},
		{ID: 15, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 2 - The Cold Boot", Map: "Trust Fling"},
		{ID: 16, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 2 - The Cold Boot", Map: "Pit Flings"},
		{ID: 17, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 2 - The Cold Boot", Map: "Fizzler Intro"},
		{ID: 18, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 3 - The Return", Map: "Ceiling Catapult"},
		{ID: 19, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 3 - The Return", Map: "Ricochet"},
		{ID: 20, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 3 - The Return", Map: "Bridge Intro"},
		{ID: 21, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 3 - The Return", Map: "Bridge The Gap"},
		{ID: 22, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 3 - The Return", Map: "Turret Intro"},
		{ID: 23, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 3 - The Return", Map: "Laser Relays"},
		{ID: 24, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 3 - The Return", Map: "Turret Blocker"},
		{ID: 25, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 3 - The Return", Map: "Laser vs Turret"},
		{ID: 26, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 3 - The Return", Map: "Pull The Rug"},
		{ID: 27, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 4 - The Surprise", Map: "Column Blocker"},
		{ID: 28, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 4 - The Surprise", Map: "Laser Chaining"},
		{ID: 29, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 4 - The Surprise", Map: "Triple Laser"},
		{ID: 30, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 4 - The Surprise", Map: "Jail Break"},
		{ID: 31, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 4 - The Surprise", Map: "Escape"},
		{ID: 32, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 5 - The Escape", Map: "Turret Factory"},
		{ID: 33, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 5 - The Escape", Map: "Turret Sabotage"},
		{ID: 34, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 5 - The Escape", Map: "Neurotoxin Sabotage"},
		{ID: 35, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 5 - The Escape", Map: "Core"},
		{ID: 36, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 6 - The Fall", Map: "Underground"},
		{ID: 37, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 6 - The Fall", Map: "Cave Johnson"},
		{ID: 38, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 6 - The Fall", Map: "Repulsion Intro"},
		{ID: 39, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 6 - The Fall", Map: "Bomb Flings"},
		{ID: 40, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 6 - The Fall", Map: "Crazy Box"},
		{ID: 41, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 6 - The Fall", Map: "PotatOS"},
		{ID: 42, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 7 - The Reunion", Map: "Propulsion Intro"},
		{ID: 43, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 7 - The Reunion", Map: "Propulsion Flings"},
		{ID: 44, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 7 - The Reunion", Map: "Conversion Intro"},
		{ID: 45, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 7 - The Reunion", Map: "Three Gels"},
		{ID: 46, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 8 - The Itch", Map: "Test"},
		{ID: 47, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 8 - The Itch", Map: "Funnel Intro"},
		{ID: 48, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 8 - The Itch", Map: "Ceiling Button"},
		{ID: 49, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 8 - The Itch", Map: "Wall Button"},
		{ID: 50, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 8 - The Itch", Map: "Polarity"},
		{ID: 51, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 8 - The Itch", Map: "Funnel Catch"},
		{ID: 52, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 8 - The Itch", Map: "Stop The Box"},
		{ID: 53, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 8 - The Itch", Map: "Laser Catapult"},
		{ID: 54, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 8 - The Itch", Map: "Laser Platform"},
		{ID: 55, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 8 - The Itch", Map: "Propulsion Catch"},
		{ID: 56, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 8 - The Itch", Map: "Repulsion Polarity"},
		{ID: 57, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 9 - The Part Where He Kills You", Map: "Finale 1"},
		{ID: 58, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 9 - The Part Where He Kills You", Map: "Finale 2"},
		{ID: 59, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 9 - The Part Where He Kills You", Map: "Finale 3"},
		{ID: 60, Game: "Portal 2 - Singleplayer", Chapter: "Chapter 9 - The Part Where He Kills You", Map: "Finale 4"},
		{ID: 61, Game: "Portal 2 - Cooperative", Chapter: "Course 0 - Introduction", Map: "Calibration"},
		{ID: 62, Game: "Portal 2 - Cooperative", Chapter: "Course 0 - Introduction", Map: "Hub"},
		{ID: 63, Game: "Portal 2 - Cooperative", Chapter: "Course 1 - Team Building", Map: "Doors"},
		{ID: 64, Game: "Portal 2 - Cooperative", Chapter: "Course 1 - Team Building", Map: "Buttons"},
		{ID: 65, Game: "Portal 2 - Cooperative", Chapter: "Course 1 - Team Building", Map: "Lasers"},
		{ID: 66, Game: "Portal 2 - Cooperative", Chapter: "Course 1 - Team Building", Map: "Rat Maze"},
		{ID: 67, Game: "Portal 2 - Cooperative", Chapter: "Course 1 - Team Building", Map: "Laser Crusher"},
		{ID: 68, Game: "Portal 2 - Cooperative", Chapter: "Course 1 - Team Building", Map: "Behind The Scenes"},
		{ID: 69, Game: "Portal 2 - Cooperative", Chapter: "Course 2 - Mass And Velocity", Map: "Flings"},
		{ID: 70, Game: "Portal 2 - Cooperative", Chapter: "Course 2 - Mass And Velocity", Map: "Infinifling"},
		{ID: 71, Game: "Portal 2 - Cooperative", Chapter: "Course 2 - Mass And Velocity", Map: "Team Retrieval"},
		{ID: 72, Game: "Portal 2 - Cooperative", Chapter: "Course 2 - Mass And Velocity", Map: "Vertical Flings"},
		{ID: 73, Game: "Portal 2 - Cooperative", Chapter: "Course 2 - Mass And Velocity", Map: "Catapults"},
		{ID: 74, Game: "Portal 2 - Cooperative", Chapter: "Course 2 - Mass And Velocity", Map: "Multifling"},
		{ID: 75, Game: "Portal 2 - Cooperative", Chapter: "Course 2 - Mass And Velocity", Map: "Fling Crushers"},
		{ID: 76, Game: "Portal 2 - Cooperative", Chapter: "Course 2 - Mass And Velocity", Map: "Industrial Fan"},
		{ID: 77, Game: "Portal 2 - Cooperative", Chapter: "Course 3 - Hard-Light Surfaces", Map: "Cooperative Bridges"},
		{ID: 78, Game: "Portal 2 - Cooperative", Chapter: "Course 3 - Hard-Light Surfaces", Map: "Bridge Swap"},
		{ID: 79, Game: "Portal 2 - Cooperative", Chapter: "Course 3 - Hard-Light Surfaces", Map: "Fling Block"},
		{ID: 80, Game: "Portal 2 - Cooperative", Chapter: "Course 3 - Hard-Light Surfaces", Map: "Catapult Block"},
		{ID: 81, Game: "Portal 2 - Cooperative", Chapter: "Course 3 - Hard-Light Surfaces", Map: "Bridge Fling"},
		{ID: 82, Game: "Portal 2 - Cooperative", Chapter: "Course 3 - Hard-Light Surfaces", Map: "Turret Walls"},
		{ID: 83, Game: "Portal 2 - Cooperative", Chapter: "Course 3 - Hard-Light Surfaces", Map: "Turret Assasin"},
		{ID: 84, Game: "Portal 2 - Cooperative", Chapter: "Course 3 - Hard-Light Surfaces", Map: "Bridge Testing"},
		{ID: 85, Game: "Portal 2 - Cooperative", Chapter: "Course 4 - Excursion Funnels", Map: "Cooperative Funnels"},
		{ID: 86, Game: "Portal 2 - Cooperative", Chapter: "Course 4 - Excursion Funnels", Map: "Funnel Drill"},
		{ID: 87, Game: "Portal 2 - Cooperative", Chapter: "Course 4 - Excursion Funnels", Map: "Funnel Catch"},
		{ID: 88, Game: "Portal 2 - Cooperative", Chapter: "Course 4 - Excursion Funnels", Map: "Funnel Laser"},
		{ID: 89, Game: "Portal 2 - Cooperative", Chapter: "Course 4 - Excursion Funnels", Map: "Cooperative Polarity"},
		{ID: 90, Game: "Portal 2 - Cooperative", Chapter: "Course 4 - Excursion Funnels", Map: "Funnel Hop"},
		{ID: 91, Game: "Portal 2 - Cooperative", Chapter: "Course 4 - Excursion Funnels", Map: "Advanced Polarity"},
		{ID: 92, Game: "Portal 2 - Cooperative", Chapter: "Course 4 - Excursion Funnels", Map: "Funnel Maze"},
		{ID: 93, Game: "Portal 2 - Cooperative", Chapter: "Course 4 - Excursion Funnels", Map: "Turret Warehouse"},
		{ID: 94, Game: "Portal 2 - Cooperative", Chapter: "Course 5 - Mobility Gels", Map: "Repulsion Jumps"},
		{ID: 95, Game: "Portal 2 - Cooperative", Chapter: "Course 5 - Mobility Gels", Map: "Double Bounce"},
		{ID: 96, Game: "Portal 2 - Cooperative", Chapter: "Course 5 - Mobility Gels", Map: "Bridge Repulsion"},
		{ID: 97, Game: "Portal 2 - Cooperative", Chapter: "Course 5 - Mobility Gels", Map: "Wall Repulsion"},
		{ID: 98, Game: "Portal 2 - Cooperative", Chapter: "Course 5 - Mobility Gels", Map: "Propulsion Crushers"},
		{ID: 99, Game: "Portal 2 - Cooperative", Chapter: "Course 5 - Mobility Gels", Map: "Turret Ninja"},
		{ID: 100, Game: "Portal 2 - Cooperative", Chapter: "Course 5 - Mobility Gels", Map: "Propulsion Retrieval"},
		{ID: 101, Game: "Portal 2 - Cooperative", Chapter: "Course 5 - Mobility Gels", Map: "Vault Entrance"},
		{ID: 102, Game: "Portal 2 - Cooperative", Chapter: "Course 6 - Art Therapy", Map: "Separation"},
		{ID: 103, Game: "Portal 2 - Cooperative", Chapter: "Course 6 - Art Therapy", Map: "Triple Axis"},
		{ID: 104, Game: "Portal 2 - Cooperative", Chapter: "Course 6 - Art Therapy", Map: "Catapult Catch"},
		{ID: 105, Game: "Portal 2 - Cooperative", Chapter: "Course 6 - Art Therapy", Map: "Bridge Gels"},
		{ID: 106, Game: "Portal 2 - Cooperative", Chapter: "Course 6 - Art Therapy", Map: "Maintenance"},
		{ID: 107, Game: "Portal 2 - Cooperative", Chapter: "Course 6 - Art Therapy", Map: "Bridge Catch"},
		{ID: 108, Game: "Portal 2 - Cooperative", Chapter: "Course 6 - Art Therapy", Map: "Double Lift"},
		{ID: 109, Game: "Portal 2 - Cooperative", Chapter: "Course 6 - Art Therapy", Map: "Gel Maze"},
		{ID: 110, Game: "Portal 2 - Cooperative", Chapter: "Course 6 - Art Therapy", Map: "Crazier Box"},
	}
	var filteredMaps []MapShortWithGame
	for _, m := range maps {
		if strings.Contains(strings.ToLower(m.Map), strings.ToLower(query)) {
			filteredMaps = append(filteredMaps, m)
		}
	}
	response.Maps = filteredMaps
	if len(response.Maps) == 0 {
		response.Maps = []MapShortWithGame{}
	}
	rows, err := database.DB.Query("SELECT steam_id, user_name, avatar_link FROM users WHERE lower(user_name) LIKE $1", "%"+query+"%")
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()
	for rows.Next() {
		var user models.UserShortWithAvatar
		if err := rows.Scan(&user.SteamID, &user.UserName, &user.AvatarLink); err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
		response.Players = append(response.Players, user)
	}
	if len(response.Players) == 0 {
		response.Players = []models.UserShortWithAvatar{}
	}
	c.JSON(http.StatusOK, models.Response{
		Success: true,
		Message: "Search successfully retrieved.",
		Data:    response,
	})
}
