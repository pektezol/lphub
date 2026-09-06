package handlers

import (
	"net/http"
	"os"
	"regexp"
	"time"

	"lphub/database"
	"lphub/models"

	"github.com/gin-gonic/gin"
)

type ProfileResponse struct {
	Profile         bool                       `json:"profile"`
	SteamID         string                     `json:"steam_id"`
	UserName        string                     `json:"user_name"`
	AvatarLink      string                     `json:"avatar_link"`
	CountryCode     string                     `json:"country_code"`
	Titles          []models.Title             `json:"titles"`
	Links           models.Links               `json:"links"`
	Rankings        ProfileRankings            `json:"rankings"`
	ModeCompletions []ProfileSectionCompletion `json:"mode_completions"`
	Records         []ProfileRecords           `json:"records"`
	Pagination      models.Pagination          `json:"pagination"`
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

type ProfileSectionCompletion struct {
	GameID          int    `json:"game_id"`
	GameName        string `json:"game_name"`
	ChapterID       int    `json:"chapter_id"`
	SectionLabel    string `json:"section_label"`
	SectionName     string `json:"section_name"`
	CompletionCount int    `json:"completion_count"`
	CompletionTotal int    `json:"completion_total"`
}

type ProfileRecords struct {
	GameID       int             `json:"game_id"`
	GameName     string          `json:"game_name"`
	CategoryID   int             `json:"category_id"`
	ChapterID    int             `json:"chapter_id"`
	SectionKind  string          `json:"section_kind"`
	SectionLabel string          `json:"section_label"`
	SectionName  string          `json:"section_name"`
	MapID        int             `json:"map_id"`
	MapName      string          `json:"map_name"`
	MapWRCount   int             `json:"map_wr_count"`
	Placement    int             `json:"placement"`
	Scores       []ProfileScores `json:"scores"`
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
	sessionUser, _ := c.Get("user")
	user := sessionUser.(models.User)
	links := models.Links{}
	err := database.DB.QueryRowContext(c.Request.Context(), `SELECT u.p2sr, u.steam, u.youtube, u.twitch FROM users u WHERE u.steam_id = $1`, user.SteamID).Scan(&links.P2SR, &links.Steam, &links.YouTube, &links.Twitch)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	respondProfile(c, user, links, true)
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
	err := database.DB.QueryRowContext(c.Request.Context(), sql, id).Scan(&user.SteamID, &user.UserName, &user.AvatarLink, &user.CountryCode, &user.CreatedAt, &user.UpdatedAt, &links.P2SR, &links.Steam, &links.YouTube, &links.Twitch)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	if user.SteamID == "" {
		// User does not exist
		c.JSON(http.StatusOK, models.ErrorResponse("User not found."))
		return
	}
	user.Titles, err = fetchProfileTitles(c.Request.Context(), user.SteamID)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	respondProfile(c, user, links, false)
}

func respondProfile(c *gin.Context, user models.User, links models.Links, ownProfile bool) {
	response, err := fetchProfile(c.Request.Context(), user, links)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	response.Profile = ownProfile
	c.JSON(http.StatusOK, models.Response{
		Success: true,
		Message: "Successfully retrieved user scores.",
		Data:    response,
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
