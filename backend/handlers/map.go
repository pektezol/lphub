package handlers

import (
	stdsql "database/sql"
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
	Game    models.Game        `json:"game"`
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

func fetchGameCategories(gameID int) ([]models.Category, error) {
	rows, err := database.DB.Query(`
		SELECT c.id, c.name
		FROM game_categories gc
		INNER JOIN categories c ON c.id = gc.category_id
		WHERE gc.game_id = $1
		ORDER BY c.id
	`, gameID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	categories := []models.Category{}
	for rows.Next() {
		var category models.Category
		if err := rows.Scan(&category.ID, &category.Name); err != nil {
			return nil, err
		}
		categories = append(categories, category)
	}
	return categories, rows.Err()
}

// chapterID is zero for a game-wide total. Mode games deliberately only expose
// totals through a selected section, never across Story and Advanced together.
func fetchCategoryPortals(gameID, chapterID int) ([]models.CategoryPortal, error) {
	rows, err := database.DB.Query(`
		SELECT c.id, c.name, COALESCE(SUM(best.score_count), 0)
		FROM game_categories gc
		INNER JOIN categories c ON c.id = gc.category_id
		LEFT JOIN (
			SELECT mh.map_id, mh.category_id, MIN(mh.score_count) AS score_count
			FROM map_history mh
			INNER JOIN maps listed_map ON listed_map.id = mh.map_id
			WHERE listed_map.game_id = $1
				AND ($2 = 0 OR listed_map.chapter_id = $2)
			GROUP BY mh.map_id, mh.category_id
		) best ON best.category_id = gc.category_id
		WHERE gc.game_id = $1
		GROUP BY c.id, c.name
		ORDER BY c.id
	`, gameID, chapterID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	portals := []models.CategoryPortal{}
	for rows.Next() {
		var categoryPortal models.CategoryPortal
		if err := rows.Scan(
			&categoryPortal.Category.ID,
			&categoryPortal.Category.Name,
			&categoryPortal.PortalCount,
		); err != nil {
			return nil, err
		}
		portals = append(portals, categoryPortal)
	}
	return portals, rows.Err()
}

func fetchGame(gameID int) (models.Game, error) {
	game := models.Game{
		Categories:      []models.Category{},
		CategoryPortals: []models.CategoryPortal{},
	}
	err := database.DB.QueryRow(`
		SELECT id, name, image, is_coop, section_kind, section_label
		FROM games
		WHERE id = $1
	`, gameID).Scan(
		&game.ID,
		&game.Name,
		&game.Image,
		&game.IsCoop,
		&game.SectionKind,
		&game.SectionLabel,
	)
	if err != nil {
		return models.Game{}, err
	}
	categories, err := fetchGameCategories(game.ID)
	if err != nil {
		return models.Game{}, err
	}
	game.Categories = categories
	if game.SectionKind != "mode" {
		portals, err := fetchCategoryPortals(game.ID, 0)
		if err != nil {
			return models.Game{}, err
		}
		game.CategoryPortals = portals
	}
	return game, nil
}

func fetchMapCounterpart(gameID, mapID int, variantKey string) (*models.MapCounterpart, error) {
	if variantKey == "" {
		return nil, nil
	}
	counterpart := models.MapCounterpart{}
	err := database.DB.QueryRow(`
		SELECT m.id, m.game_id, m.chapter_id, g.section_kind, g.section_label, c.name, m.name
		FROM maps m
		INNER JOIN games g ON g.id = m.game_id
		INNER JOIN chapters c ON c.id = m.chapter_id
		WHERE m.game_id = $1 AND m.variant_key = $2 AND m.id <> $3
		ORDER BY m.id
		LIMIT 1
	`, gameID, variantKey, mapID).Scan(
		&counterpart.ID,
		&counterpart.GameID,
		&counterpart.ChapterID,
		&counterpart.SectionKind,
		&counterpart.SectionLabel,
		&counterpart.SectionName,
		&counterpart.MapName,
	)
	if err == stdsql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &counterpart, nil
}

func fetchMap(mapID int) (models.Map, error) {
	mapData := models.Map{Categories: []models.Category{}}
	err := database.DB.QueryRow(`
		SELECT
			m.id, m.game_id, g.name, m.chapter_id, c.name,
			g.section_kind, g.section_label, m.name, m.image,
			g.is_coop, m.is_disabled, m.difficulty,
			COALESCE(m.engine_map_name, ''), COALESCE(m.variant_key, ''), m.sort_order
		FROM maps m
		INNER JOIN games g ON g.id = m.game_id
		INNER JOIN chapters c ON c.id = m.chapter_id
		WHERE m.id = $1
	`, mapID).Scan(
		&mapData.ID,
		&mapData.GameID,
		&mapData.GameName,
		&mapData.ChapterID,
		&mapData.ChapterName,
		&mapData.SectionKind,
		&mapData.SectionLabel,
		&mapData.MapName,
		&mapData.Image,
		&mapData.IsCoop,
		&mapData.IsDisabled,
		&mapData.Difficulty,
		&mapData.EngineMapName,
		&mapData.VariantKey,
		&mapData.SortOrder,
	)
	if err != nil {
		return models.Map{}, err
	}
	categories, err := fetchGameCategories(mapData.GameID)
	if err != nil {
		return models.Map{}, err
	}
	mapData.Categories = categories
	mapData.Counterpart, err = fetchMapCounterpart(mapData.GameID, mapData.ID, mapData.VariantKey)
	if err != nil {
		return models.Map{}, err
	}
	return mapData, nil
}

func fetchMapsForScope(gameID, chapterID int) ([]models.MapSelect, error) {
	rows, err := database.DB.Query(`
		SELECT
			m.id, m.game_id, m.chapter_id, g.section_kind, g.section_label, c.name,
			m.name, m.image, m.is_disabled, m.difficulty, m.sort_order,
			cat.id, cat.name, COALESCE(best.score_count, 0)
		FROM maps m
		INNER JOIN games g ON g.id = m.game_id
		INNER JOIN chapters c ON c.id = m.chapter_id
		INNER JOIN game_categories gc ON gc.game_id = m.game_id
		INNER JOIN categories cat ON cat.id = gc.category_id
		LEFT JOIN (
			SELECT map_id, category_id, MIN(score_count) AS score_count
			FROM map_history
			GROUP BY map_id, category_id
		) best ON best.map_id = m.id AND best.category_id = gc.category_id
		WHERE m.game_id = $1 AND ($2 = 0 OR m.chapter_id = $2)
		ORDER BY m.chapter_id, m.sort_order, m.id, cat.id
	`, gameID, chapterID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	maps := []models.MapSelect{}
	lastMapID := -1
	for rows.Next() {
		mapData := models.MapSelect{}
		categoryPortal := models.CategoryPortal{}
		if err := rows.Scan(
			&mapData.ID,
			&mapData.GameID,
			&mapData.ChapterID,
			&mapData.SectionKind,
			&mapData.SectionLabel,
			&mapData.SectionName,
			&mapData.Name,
			&mapData.Image,
			&mapData.IsDisabled,
			&mapData.Difficulty,
			&mapData.SortOrder,
			&categoryPortal.Category.ID,
			&categoryPortal.Category.Name,
			&categoryPortal.PortalCount,
		); err != nil {
			return nil, err
		}
		if mapData.ID == lastMapID {
			maps[len(maps)-1].CategoryPortals = append(maps[len(maps)-1].CategoryPortals, categoryPortal)
			continue
		}
		mapData.CategoryPortals = []models.CategoryPortal{categoryPortal}
		maps = append(maps, mapData)
		lastMapID = mapData.ID
	}
	return maps, rows.Err()
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
	mapID, err := strconv.Atoi(c.Param("mapid"))
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	mapData, err := fetchMap(mapID)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	response := MapSummaryResponse{
		Map:     mapData,
		Summary: models.MapSummary{Routes: []models.MapRoute{}},
	}

	rows, err := database.DB.Query(`
		SELECT
			mh.id, c.id, c.name, mh.user_name, mh.score_count, mh.record_date,
			mh.description, mh.showcase, COALESCE(AVG(rt.rating), 0.0)
		FROM map_history mh
		INNER JOIN categories c ON c.id = mh.category_id
		INNER JOIN maps m ON m.id = mh.map_id
		INNER JOIN game_categories gc ON gc.game_id = m.game_id
			AND gc.category_id = mh.category_id
		LEFT JOIN map_ratings rt ON rt.map_id = mh.map_id
			AND rt.category_id = mh.category_id
		WHERE mh.map_id = $1
		GROUP BY
			mh.id, c.id, c.name, mh.user_name, mh.score_count, mh.record_date,
			mh.description, mh.showcase
		ORDER BY mh.category_id, mh.score_count
	`, mapID)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	defer rows.Close()

	for rows.Next() {
		route := models.MapRoute{Category: models.Category{}, History: models.MapHistory{}}
		if err := rows.Scan(
			&route.RouteID,
			&route.Category.ID,
			&route.Category.Name,
			&route.History.RunnerName,
			&route.History.ScoreCount,
			&route.History.Date,
			&route.Description,
			&route.Showcase,
			&route.Rating,
		); err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
		if mapData.IsCoop {
			err = database.DB.QueryRow(`
				SELECT COUNT(*)
				FROM (
					SELECT host_id, partner_id, score_count, score_time,
						ROW_NUMBER() OVER (
							PARTITION BY host_id, partner_id
							ORDER BY score_count, score_time
						) AS rank
					FROM records_mp
					WHERE map_id = $1 AND is_deleted = false
				) best_record
				WHERE best_record.rank = 1 AND best_record.score_count = $2
			`, mapData.ID, route.History.ScoreCount).Scan(&route.CompletionCount)
		} else {
			err = database.DB.QueryRow(`
				SELECT COUNT(*)
				FROM (
					SELECT user_id, score_count, score_time,
						ROW_NUMBER() OVER (
							PARTITION BY user_id
							ORDER BY score_count, score_time
						) AS rank
					FROM records_sp
					WHERE map_id = $1 AND is_deleted = false
				) best_record
				WHERE best_record.rank = 1 AND best_record.score_count = $2
			`, mapData.ID, route.History.ScoreCount).Scan(&route.CompletionCount)
		}
		if err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
		response.Summary.Routes = append(response.Summary.Routes, route)
	}
	if err := rows.Err(); err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}

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
	mapID, err := strconv.Atoi(c.Param("mapid"))
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	page, err := strconv.Atoi(c.DefaultQuery("page", "1"))
	if err != nil || page < 1 {
		page = 1
	}
	pageSize, err := strconv.Atoi(c.DefaultQuery("pageSize", "20"))
	if err != nil || pageSize < 1 {
		pageSize = 20
	}

	mapData, err := fetchMap(mapID)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	if mapData.IsDisabled {
		c.JSON(http.StatusOK, models.ErrorResponse("Map is not available for competitive boards."))
		return
	}

	response := MapLeaderboardsResponse{
		Map:     mapData,
		Records: []RecordSingleplayer{},
	}
	totalRecords := 0
	if mapData.IsCoop {
		records := []RecordMultiplayer{}
		rows, err := database.DB.Query(`
			SELECT
				sub.id, sub.host_id, host.user_name, host.avatar_link,
				sub.partner_id, partner.user_name, partner.avatar_link,
				sub.score_count, sub.score_time, sub.host_demo_id,
				sub.partner_demo_id, sub.record_date
			FROM (
				SELECT
					id, host_id, partner_id, score_count, score_time,
					host_demo_id, partner_demo_id, record_date,
					ROW_NUMBER() OVER (
						PARTITION BY host_id, partner_id
						ORDER BY score_count, score_time
					) AS rank
				FROM records_mp
				WHERE map_id = $1 AND is_deleted = false
			) sub
			INNER JOIN users host ON host.steam_id = sub.host_id
			INNER JOIN users partner ON partner.steam_id = sub.partner_id
			WHERE sub.rank = 1
			ORDER BY sub.score_count, sub.score_time
		`, mapID)
		if err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
		defer rows.Close()
		placement, ties := 1, 0
		for rows.Next() {
			record := RecordMultiplayer{}
			if err := rows.Scan(
				&record.RecordID,
				&record.Host.SteamID,
				&record.Host.UserName,
				&record.Host.AvatarLink,
				&record.Partner.SteamID,
				&record.Partner.UserName,
				&record.Partner.AvatarLink,
				&record.ScoreCount,
				&record.ScoreTime,
				&record.HostDemoID,
				&record.PartnerDemoID,
				&record.RecordDate,
			); err != nil {
				c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
				return
			}
			if len(records) > 0 &&
				records[len(records)-1].ScoreCount == record.ScoreCount &&
				records[len(records)-1].ScoreTime == record.ScoreTime {
				ties++
				record.Placement = placement - ties
			} else {
				ties = 0
				record.Placement = placement
			}
			records = append(records, record)
			placement++
		}
		if err := rows.Err(); err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
		response.Records = records
		totalRecords = len(records)
	} else {
		records := []RecordSingleplayer{}
		rows, err := database.DB.Query(`
			SELECT
				sub.id, sub.user_id, users.user_name, users.avatar_link,
				sub.score_count, sub.score_time, sub.demo_id, sub.record_date
			FROM (
				SELECT
					id, user_id, score_count, score_time, demo_id, record_date,
					ROW_NUMBER() OVER (
						PARTITION BY user_id
						ORDER BY score_count, score_time
					) AS rank
				FROM records_sp
				WHERE map_id = $1 AND is_deleted = false
			) sub
			INNER JOIN users ON users.steam_id = sub.user_id
			WHERE sub.rank = 1
			ORDER BY sub.score_count, sub.score_time
		`, mapID)
		if err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
		defer rows.Close()
		placement, ties := 1, 0
		for rows.Next() {
			record := RecordSingleplayer{}
			if err := rows.Scan(
				&record.RecordID,
				&record.User.SteamID,
				&record.User.UserName,
				&record.User.AvatarLink,
				&record.ScoreCount,
				&record.ScoreTime,
				&record.DemoID,
				&record.RecordDate,
			); err != nil {
				c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
				return
			}
			if len(records) > 0 &&
				records[len(records)-1].ScoreCount == record.ScoreCount &&
				records[len(records)-1].ScoreTime == record.ScoreTime {
				ties++
				record.Placement = placement - ties
			} else {
				ties = 0
				record.Placement = placement
			}
			records = append(records, record)
			placement++
		}
		if err := rows.Err(); err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
		response.Records = records
		totalRecords = len(records)
	}

	totalPages := 0
	if totalRecords > 0 {
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
		switch records := response.Records.(type) {
		case []RecordSingleplayer:
			response.Records = records[startIndex:endIndex]
		case []RecordMultiplayer:
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
	rows, err := database.DB.Query(`SELECT id FROM games ORDER BY id`)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	defer rows.Close()

	games := []models.Game{}
	for rows.Next() {
		var gameID int
		if err := rows.Scan(&gameID); err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
		game, err := fetchGame(gameID)
		if err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
		games = append(games, game)
	}
	if err := rows.Err(); err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, models.Response{
		Success: true,
		Message: "Successfully retrieved games.",
		Data:    games,
	})
}

// GET Chapters of a Game
//
//	@Description	Get sections from the specified game id.
//	@Tags			games & chapters
//	@Produce		json
//	@Param			gameid	path		int	true	"Game ID"
//	@Success		200		{object}	models.Response{data=ChaptersResponse}
//	@Router			/games/{gameid} [get]
func FetchChapters(c *gin.Context) {
	gameID, err := strconv.Atoi(c.Param("gameid"))
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	game, err := fetchGame(gameID)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	rows, err := database.DB.Query(`
		SELECT id, game_id, name, is_disabled, image
		FROM chapters
		WHERE game_id = $1
		ORDER BY id
	`, gameID)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	defer rows.Close()

	chapters := []models.Chapter{}
	for rows.Next() {
		chapter := models.Chapter{
			SectionKind:     game.SectionKind,
			SectionLabel:    game.SectionLabel,
			CategoryPortals: []models.CategoryPortal{},
		}
		if err := rows.Scan(
			&chapter.ID,
			&chapter.GameID,
			&chapter.Name,
			&chapter.IsDisabled,
			&chapter.Image,
		); err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
		chapters = append(chapters, chapter)
	}
	if err := rows.Err(); err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, models.Response{
		Success: true,
		Message: "Successfully retrieved sections.",
		Data:    ChaptersResponse{Game: game, Chapters: chapters},
	})
}

// GET Maps of a Game
//
//	@Description	Get maps from the specified game id.
//	@Tags			games & chapters
//	@Produce		json
//	@Param			gameid	path		int	true	"Game ID"
//	@Success		200	{object}	models.Response{data=GameMapsResponse}
//	@Router			/games/{gameid}/maps [get]
func FetchMaps(c *gin.Context) {
	gameID, err := strconv.Atoi(c.Param("gameid"))
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	game, err := fetchGame(gameID)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	maps, err := fetchMapsForScope(gameID, 0)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, models.Response{
		Success: true,
		Message: "Successfully retrieved maps.",
		Data:    GameMapsResponse{Game: game, Maps: maps},
	})
}

// GET Maps of a Chapter
//
//	@Description	Get maps from the specified section id.
//	@Tags			games & chapters
//	@Produce		json
//	@Param			chapterid	path		int	true	"Chapter ID"
//	@Success		200			{object}	models.Response{data=ChapterMapsResponse}
//	@Failure		400			{object}	models.Response
//	@Router			/chapters/{chapterid} [get]
func FetchChapterMaps(c *gin.Context) {
	chapterID, err := strconv.Atoi(c.Param("chapterid"))
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	chapter := models.Chapter{CategoryPortals: []models.CategoryPortal{}}
	err = database.DB.QueryRow(`
		SELECT
			c.id, c.game_id, c.name, c.is_disabled, c.image,
			g.section_kind, g.section_label
		FROM chapters c
		INNER JOIN games g ON g.id = c.game_id
		WHERE c.id = $1
	`, chapterID).Scan(
		&chapter.ID,
		&chapter.GameID,
		&chapter.Name,
		&chapter.IsDisabled,
		&chapter.Image,
		&chapter.SectionKind,
		&chapter.SectionLabel,
	)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	game, err := fetchGame(chapter.GameID)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	portals, err := fetchCategoryPortals(chapter.GameID, chapter.ID)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	chapter.CategoryPortals = portals
	maps, err := fetchMapsForScope(chapter.GameID, chapter.ID)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, models.Response{
		Success: true,
		Message: "Successfully retrieved maps.",
		Data: ChapterMapsResponse{
			Game:    game,
			Chapter: chapter,
			Maps:    maps,
		},
	})
}
