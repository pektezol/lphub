package handlers

import (
	"net/http"
	"strconv"
	"time"

	"lphub/database"
	"lphub/models"

	"github.com/gin-gonic/gin"
)

type MapSummaryResponse struct {
	Map     models.Map        `json:"map"`
	Summary models.MapSummary `json:"summary"`
}

type MapLeaderboardsResponse struct {
	Map        models.Map        `json:"map"`
	Records    any               `json:"records"`
	Pagination models.Pagination `json:"pagination"`
}

type ChaptersResponse struct {
	Game     models.Game      `json:"game"`
	Chapters []models.Chapter `json:"chapters"`
}

type ChapterMapsResponse struct {
	Chapter models.Chapter     `json:"chapter"`
	Maps    []models.MapSelect `json:"maps"`
}

type GameMapsResponse struct {
	Game models.Game        `json:"game"`
	Maps []models.MapSelect `json:"maps"`
}

type RecordSingleplayer struct {
	Placement  int                        `json:"placement"`
	RecordID   int                        `json:"record_id"`
	ScoreCount int                        `json:"score_count"`
	ScoreTime  int                        `json:"score_time"`
	User       models.UserShortWithAvatar `json:"user"`
	DemoID     string                     `json:"demo_id"`
	RecordDate time.Time                  `json:"record_date"`
}

type RecordMultiplayer struct {
	Placement     int                        `json:"placement"`
	RecordID      int                        `json:"record_id"`
	ScoreCount    int                        `json:"score_count"`
	ScoreTime     int                        `json:"score_time"`
	Host          models.UserShortWithAvatar `json:"host"`
	Partner       models.UserShortWithAvatar `json:"partner"`
	HostDemoID    string                     `json:"host_demo_id"`
	PartnerDemoID string                     `json:"partner_demo_id"`
	RecordDate    time.Time                  `json:"record_date"`
}

// GET Map Summary
//
//	@Description	Get map summary with specified id.
//	@Tags			maps / summary
//	@Produce		json
//	@Param			mapid	path		int	true	"Map ID"
//	@Success		200		{object}	models.Response{data=MapSummaryResponse}
//	@Router			/maps/{mapid}/summary [get]
func FetchMapSummary(c *gin.Context) {
	id := c.Param("mapid")
	response := MapSummaryResponse{Map: models.Map{}, Summary: models.MapSummary{Routes: []models.MapRoute{}}}
	intID, err := strconv.Atoi(id)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	// Get map data
	response.Map.ID = intID
	sql := `SELECT m.id, g.name, c.name, m.name, m.image, g.is_coop, m.is_disabled, m.difficulty
	FROM maps m
	INNER JOIN games g ON m.game_id = g.id
	INNER JOIN chapters c ON m.chapter_id = c.id
	WHERE m.id = $1`
	err = database.DB.QueryRow(sql, id).Scan(&response.Map.ID, &response.Map.GameName, &response.Map.ChapterName, &response.Map.MapName, &response.Map.Image, &response.Map.IsCoop, &response.Map.IsDisabled, &response.Map.Difficulty)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	// Get map routes and histories
	sql = `SELECT mh.id, c.id, c.name, mh.user_name, mh.score_count, mh.record_date, mh.description, mh.showcase, COALESCE(avg(rating), 0.0) FROM map_history mh
    INNER JOIN categories c ON mh.category_id = c.id
    LEFT JOIN map_ratings rt ON mh.map_id = rt.map_id AND mh.category_id = rt.category_id 
	WHERE mh.map_id = $1 AND mh.score_count = mh.score_count GROUP BY mh.id, c.id, mh.user_name, mh.score_count, mh.record_date, mh.description, mh.showcase
	ORDER BY mh.category_id ASC, mh.score_count ASC;`
	rows, err := database.DB.Query(sql, id)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	for rows.Next() {
		route := models.MapRoute{Category: models.Category{}, History: models.MapHistory{}}
		err = rows.Scan(&route.RouteID, &route.Category.ID, &route.Category.Name, &route.History.RunnerName, &route.History.ScoreCount, &route.History.Date, &route.Description, &route.Showcase, &route.Rating)
		if err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
		// Get completion count
		if response.Map.IsCoop {
			sql = `SELECT count(*) FROM ( SELECT host_id, partner_id, score_count, score_time,
				ROW_NUMBER() OVER (PARTITION BY host_id, partner_id ORDER BY score_count, score_time) AS rn
				FROM records_mp WHERE map_id = $1 AND is_deleted = false
				) sub WHERE sub.rn = 1 AND score_count = $2`
			err = database.DB.QueryRow(sql, response.Map.ID, route.History.ScoreCount).Scan(&route.CompletionCount)
			if err != nil {
				c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
				return
			}
		} else {
			sql = `SELECT count(*) FROM ( SELECT user_id, score_count, score_time, 
				ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY score_count, score_time) AS rn
				FROM records_sp WHERE map_id = $1 AND is_deleted = false
				) sub WHERE rn = 1 AND score_count = $2`
			err = database.DB.QueryRow(sql, response.Map.ID, route.History.ScoreCount).Scan(&route.CompletionCount)
			if err != nil {
				c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
				return
			}
		}
		response.Summary.Routes = append(response.Summary.Routes, route)
	}
	// Return response
	c.JSON(http.StatusOK, models.Response{
		Success: true,
		Message: "Successfully retrieved map summary.",
		Data:    response,
	})
}

// GET Map Leaderboards
//
//	@Description	Get map leaderboards with specified id.
//	@Tags			maps / leaderboards
//	@Produce		json
//	@Param			mapid		path		int	true	"Map ID"
//	@Param			page		query		int	false	"Page Number (default: 1)"
//	@Param			pageSize	query		int	false	"Number of Records Per Page (default: 20)"
//	@Success		200			{object}	models.Response{data=MapLeaderboardsResponse}
//	@Router			/maps/{mapid}/leaderboards [get]
func FetchMapLeaderboards(c *gin.Context) {
	id := c.Param("mapid")
	// Get map data
	response := MapLeaderboardsResponse{Map: models.Map{}, Records: nil, Pagination: models.Pagination{}}
	page, err := strconv.Atoi(c.DefaultQuery("page", "1"))
	if err != nil || page < 1 {
		page = 1
	}
	pageSize, err := strconv.Atoi(c.DefaultQuery("pageSize", "20"))
	if err != nil || pageSize < 1 {
		pageSize = 20
	}
	var isDisabled bool
	intID, err := strconv.Atoi(id)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	response.Map.ID = intID
	sql := `SELECT g.name, c.name, m.name, m.is_disabled, m.image, g.is_coop
	FROM maps m
	INNER JOIN games g ON m.game_id = g.id
	INNER JOIN chapters c ON m.chapter_id = c.id
	WHERE m.id = $1`
	err = database.DB.QueryRow(sql, id).Scan(&response.Map.GameName, &response.Map.ChapterName, &response.Map.MapName, &isDisabled, &response.Map.Image, &response.Map.IsCoop)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	if isDisabled {
		c.JSON(http.StatusOK, models.ErrorResponse("Map is not available for competitive boards."))
		return
	}
	totalRecords := 0
	totalPages := 0
	if response.Map.GameName == "Portal 2 - Cooperative" {
		records := []RecordMultiplayer{}
		sql = `SELECT
		sub.id,
		sub.host_id,
		host.user_name AS host_user_name,
		host.avatar_link AS host_avatar_link,
		sub.partner_id,
		partner.user_name AS partner_user_name,
		partner.avatar_link AS partner_avatar_link,
		sub.score_count,
		sub.score_time,
		sub.host_demo_id,
		sub.partner_demo_id,
		sub.record_date
	FROM (
		SELECT
			id,
			host_id,
			partner_id,
			score_count,
			score_time,
			host_demo_id,
			partner_demo_id,
			record_date,
			ROW_NUMBER() OVER (PARTITION BY host_id, partner_id ORDER BY score_count, score_time) AS rn
		FROM records_mp
		WHERE map_id = $1 AND is_deleted = false
	) sub
	JOIN users AS host ON sub.host_id = host.steam_id 
	JOIN users AS partner ON sub.partner_id = partner.steam_id 
	WHERE sub.rn = 1
	ORDER BY score_count, score_time`
		rows, err := database.DB.Query(sql, id)
		if err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
		placement := 1
		ties := 0
		for rows.Next() {
			var record RecordMultiplayer
			err := rows.Scan(&record.RecordID, &record.Host.SteamID, &record.Host.UserName, &record.Host.AvatarLink, &record.Partner.SteamID, &record.Partner.UserName, &record.Partner.AvatarLink, &record.ScoreCount, &record.ScoreTime, &record.HostDemoID, &record.PartnerDemoID, &record.RecordDate)
			if err != nil {
				c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
				return
			}
			if len(records) != 0 && records[len(records)-1].ScoreCount == record.ScoreCount && records[len(records)-1].ScoreTime == record.ScoreTime {
				ties++
				record.Placement = placement - ties
			} else {
				ties = 0
				record.Placement = placement
			}
			records = append(records, record)
			placement++
		}
		response.Records = records
		totalRecords = len(records)
		if totalRecords != 0 {
			totalPages = (totalRecords + pageSize - 1) / pageSize
			if page > totalPages {
				c.JSON(http.StatusOK, models.ErrorResponse("Invalid page number."))
				return
			}
			startIndex := (page - 1) * pageSize
			endIndex := startIndex + pageSize
			if endIndex > totalRecords {
				endIndex = totalRecords
			}
			response.Records = records[startIndex:endIndex]
		}
	} else {
		records := []RecordSingleplayer{}
		sql = `SELECT id, user_id, users.user_name, users.avatar_link, score_count, score_time, demo_id, record_date
		FROM (
		  SELECT id, user_id, score_count, score_time, demo_id, record_date,
				 ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY score_count, score_time) AS rn
		  FROM records_sp
		  WHERE map_id = $1 AND is_deleted = false
		) sub
		INNER JOIN users ON user_id = users.steam_id
		WHERE rn = 1
		ORDER BY score_count, score_time`
		rows, err := database.DB.Query(sql, id)
		if err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
		placement := 1
		ties := 0
		for rows.Next() {
			var record RecordSingleplayer
			err := rows.Scan(&record.RecordID, &record.User.SteamID, &record.User.UserName, &record.User.AvatarLink, &record.ScoreCount, &record.ScoreTime, &record.DemoID, &record.RecordDate)
			if err != nil {
				c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
				return
			}
			if len(records) != 0 && records[len(records)-1].ScoreCount == record.ScoreCount && records[len(records)-1].ScoreTime == record.ScoreTime {
				ties++
				record.Placement = placement - ties
			} else {
				ties = 0
				record.Placement = placement
			}
			records = append(records, record)
			placement++
		}
		response.Records = records
		totalRecords = len(records)
		if totalRecords != 0 {
			totalPages = (totalRecords + pageSize - 1) / pageSize
			if page > totalPages {
				c.JSON(http.StatusOK, models.ErrorResponse("Invalid page number."))
				return
			}
			startIndex := (page - 1) * pageSize
			endIndex := startIndex + pageSize
			if endIndex > totalRecords {
				endIndex = totalRecords
			}
			response.Records = records[startIndex:endIndex]
		}
	}
	response.Pagination = models.Pagination{
		TotalRecords: totalRecords,
		TotalPages:   totalPages,
		CurrentPage:  page,
		PageSize:     pageSize,
	}
	c.JSON(http.StatusOK, models.Response{
		Success: true,
		Message: "Successfully retrieved map leaderboards.",
		Data:    response,
	})
}

// GET Games
//
//	@Description	Get games from the leaderboards.
//	@Tags			games & chapters
//	@Produce		json
//	@Success		200	{object}	models.Response{data=[]models.Game}
//	@Failure		400	{object}	models.Response
//	@Router			/games [get]
func FetchGames(c *gin.Context) {
	rows, err := database.DB.Query(`SELECT id, name, is_coop, image FROM games ORDER BY id;`)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	var games []models.Game
	for rows.Next() {
		var game models.Game
		if err := rows.Scan(&game.ID, &game.Name, &game.IsCoop, &game.Image); err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
		categoryPortalRows, err := database.DB.Query(`SELECT c.id, c.name FROM game_categories gc JOIN categories c ON gc.category_id = c.id WHERE gc.game_id = $1 ORDER BY c.id;`, game.ID)
		if err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
		for categoryPortalRows.Next() {
			var categoryPortals models.CategoryPortal
			if err := categoryPortalRows.Scan(&categoryPortals.Category.ID, &categoryPortals.Category.Name); err != nil {
				c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
				return
			}
			getCategoryPortalCount := `
			SELECT
				SUM(mh.lowest_score_count) AS total_lowest_scores
			FROM (
				SELECT
					map_id,
					category_id,
					MIN(score_count) AS lowest_score_count
				FROM
					map_history
				GROUP BY
					map_id,
					category_id
			) mh
			JOIN maps m ON mh.map_id = m.id
			JOIN games g ON m.game_id = g.id
			WHERE
				mh.category_id = $1 and g.id = $2
			GROUP BY
				g.id,
				g.name,
				mh.category_id;
			`
			database.DB.QueryRow(getCategoryPortalCount, categoryPortals.Category.ID, game.ID).Scan(&categoryPortals.PortalCount)
			// not checking for errors since there can be no record for category - just let it have 0
			game.CategoryPortals = append(game.CategoryPortals, categoryPortals)
		}
		games = append(games, game)
	}
	c.JSON(http.StatusOK, models.Response{
		Success: true,
		Message: "Successfully retrieved games.",
		Data:    games,
	})
}

// GET Chapters of a Game
//
//	@Description	Get chapters from the specified game id.
//	@Tags			games & chapters
//	@Produce		json
//	@Param			gameid	path		int	true	"Game ID"
//	@Success		200		{object}	models.Response{data=ChaptersResponse}
//	@Router			/games/{gameid} [get]
func FetchChapters(c *gin.Context) {
	gameID := c.Param("gameid")
	intID, err := strconv.Atoi(gameID)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	var response ChaptersResponse
	rows, err := database.DB.Query(`SELECT c.id, c.name, g.name, c.is_disabled, c.image FROM chapters c INNER JOIN games g ON c.game_id = g.id WHERE game_id = $1 ORDER BY c.id;`, gameID)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	var chapters []models.Chapter
	var gameName string
	for rows.Next() {
		var chapter models.Chapter
		if err := rows.Scan(&chapter.ID, &chapter.Name, &gameName, &chapter.IsDisabled, &chapter.Image); err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
		chapters = append(chapters, chapter)
	}
	response.Game.ID = intID
	response.Game.Name = gameName
	response.Chapters = chapters
	c.JSON(http.StatusOK, models.Response{
		Success: true,
		Message: "Successfully retrieved chapters.",
		Data:    response,
	})
}

// GET Maps of a Game
//
//	@Description	Get maps from the specified game id.
//	@Tags			games & chapters
//	@Produce		json
//	@Param			gameid	path		int	true	"Game ID"
//	@Success		200		{object}	models.Response{data=ChaptersResponse}
//	@Router			/games/{gameid}/maps [get]
func FetchMaps(c *gin.Context) {
	gameID, err := strconv.Atoi(c.Param("gameid"))
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	var response GameMapsResponse
	err = database.DB.QueryRow(`SELECT g.id, g.name, g.is_coop, g.image FROM games g WHERE g.id = $1;`, gameID).Scan(&response.Game.ID, &response.Game.Name, &response.Game.IsCoop, &response.Game.Image)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	categoryPortalRows, err := database.DB.Query(`SELECT c.id, c.name FROM game_categories gc JOIN categories c ON gc.category_id = c.id WHERE gc.game_id = $1 ORDER BY c.id;`, gameID)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	for categoryPortalRows.Next() {
		var categoryPortals models.CategoryPortal
		if err := categoryPortalRows.Scan(&categoryPortals.Category.ID, &categoryPortals.Category.Name); err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
		getCategoryPortalCount := `
			SELECT
				SUM(mh.lowest_score_count) AS total_lowest_scores
			FROM (
				SELECT
					map_id,
					category_id,
					MIN(score_count) AS lowest_score_count
				FROM
					map_history
				GROUP BY
					map_id,
					category_id
			) mh
			JOIN maps m ON mh.map_id = m.id
			JOIN games g ON m.game_id = g.id
			WHERE
				mh.category_id = $1 and g.id = $2
			GROUP BY
				g.id,
				g.name,
				mh.category_id;
			`
		database.DB.QueryRow(getCategoryPortalCount, categoryPortals.Category.ID, gameID).Scan(&categoryPortals.PortalCount)
		// not checking for errors since there can be no record for category - just let it have 0
		response.Game.CategoryPortals = append(response.Game.CategoryPortals, categoryPortals)
	}

	rows, err := database.DB.Query(`
	SELECT 
		m.id,
		m.name, 
		m.is_disabled,
		m.difficulty,
		m.image,
		cat.id,
		cat.name,
		mh.min_score_count AS score_count
	FROM 
		maps m
	INNER JOIN 
		chapters c ON m.chapter_id = c.id
	INNER JOIN 
		game_categories gc ON gc.game_id = c.game_id
	INNER JOIN
		categories cat ON cat.id = gc.category_id
	INNER JOIN 
		(
			SELECT 
				map_id, 
				category_id, 
				MIN(score_count) AS min_score_count
			FROM 
				map_history
			GROUP BY 
				map_id, 
				category_id
		) mh ON m.id = mh.map_id AND gc.category_id = mh.category_id
	WHERE 
		m.game_id = $1
	ORDER BY 
		m.id, gc.category_id, mh.min_score_count ASC;
	`, gameID)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	var lastMapID int
	for rows.Next() {
		var mapShort models.MapSelect
		var categoryPortal models.CategoryPortal
		if err := rows.Scan(&mapShort.ID, &mapShort.Name, &mapShort.IsDisabled, &mapShort.Difficulty, &mapShort.Image, &categoryPortal.Category.ID, &categoryPortal.Category.Name, &categoryPortal.PortalCount); err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
		if mapShort.ID == lastMapID {
			response.Maps[len(response.Maps)-1].CategoryPortals = append(response.Maps[len(response.Maps)-1].CategoryPortals, categoryPortal)
		} else {
			mapShort.CategoryPortals = append(mapShort.CategoryPortals, categoryPortal)
			response.Maps = append(response.Maps, mapShort)
			lastMapID = mapShort.ID
		}
	}
	c.JSON(http.StatusOK, models.Response{
		Success: true,
		Message: "Successfully retrieved maps.",
		Data:    response,
	})
}

// GET Maps of a Chapter
//
//	@Description	Get maps from the specified chapter id.
//	@Tags			games & chapters
//	@Produce		json
//	@Param			chapterid	path		int	true	"Chapter ID"
//	@Success		200			{object}	models.Response{data=ChapterMapsResponse}
//	@Failure		400			{object}	models.Response
//	@Router			/chapters/{chapterid} [get]
func FetchChapterMaps(c *gin.Context) {
	chapterID := c.Param("chapterid")
	intID, err := strconv.Atoi(chapterID)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	var response ChapterMapsResponse
	rows, err := database.DB.Query(`
	SELECT 
		m.id, 
		m.name AS map_name, 
		c.name AS chapter_name, 
		m.is_disabled,
		m.difficulty,
		m.image,
		cat.id,
		cat.name,
		mh.min_score_count AS score_count
	FROM 
		maps m
	INNER JOIN 
		chapters c ON m.chapter_id = c.id
	INNER JOIN 
		game_categories gc ON gc.game_id = c.game_id
	INNER JOIN
		categories cat ON cat.id = gc.category_id
	INNER JOIN 
		(
			SELECT 
				map_id, 
				category_id, 
				MIN(score_count) AS min_score_count
			FROM 
				map_history
			GROUP BY 
				map_id, 
				category_id
		) mh ON m.id = mh.map_id AND gc.category_id = mh.category_id
	WHERE 
		m.chapter_id = $1
	ORDER BY 
		m.id, gc.category_id, mh.min_score_count ASC;
	`, chapterID)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	var maps []models.MapSelect
	var chapterName string
	var lastMapID int
	for rows.Next() {
		var mapShort models.MapSelect
		var categoryPortal models.CategoryPortal
		if err := rows.Scan(&mapShort.ID, &mapShort.Name, &chapterName, &mapShort.IsDisabled, &mapShort.Difficulty, &mapShort.Image, &categoryPortal.Category.ID, &categoryPortal.Category.Name, &categoryPortal.PortalCount); err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
		if mapShort.ID == lastMapID {
			maps[len(maps)-1].CategoryPortals = append(maps[len(maps)-1].CategoryPortals, categoryPortal)
		} else {
			mapShort.CategoryPortals = append(mapShort.CategoryPortals, categoryPortal)
			maps = append(maps, mapShort)
			lastMapID = mapShort.ID
		}
	}
	response.Chapter.ID = intID
	response.Chapter.Name = chapterName
	response.Maps = maps
	c.JSON(http.StatusOK, models.Response{
		Success: true,
		Message: "Successfully retrieved maps.",
		Data:    response,
	})
}
