package handlers

import (
	"net/http"
	"strconv"
	"time"

	"lphub/database"
	"lphub/models"

	"github.com/gin-gonic/gin"
)

type CreateMapSummaryRequest struct {
	CategoryID  int       `json:"category_id" binding:"required"`
	Description string    `json:"description" binding:"required"`
	Showcase    string    `json:"showcase"`
	UserName    string    `json:"user_name" binding:"required"`
	ScoreCount  *int      `json:"score_count" binding:"required"`
	RecordDate  time.Time `json:"record_date" binding:"required"`
}

type EditMapSummaryRequest struct {
	RouteID     int       `json:"route_id" binding:"required"`
	Description string    `json:"description" binding:"required"`
	Showcase    string    `json:"showcase"`
	UserName    string    `json:"user_name" binding:"required"`
	ScoreCount  *int      `json:"score_count" binding:"required"`
	RecordDate  time.Time `json:"record_date" binding:"required"`
}

type DeleteMapSummaryRequest struct {
	RouteID int `json:"route_id" binding:"required"`
}

type EditMapImageRequest struct {
	Image string `json:"image" binding:"required"`
}

// POST Map Summary
//
//	@Description	Create map summary with specified map id.
//	@Tags			maps / summary
//	@Produce		json
//	@Param			Authorization	header		string					true	"JWT Token"
//	@Param			mapid			path		int						true	"Map ID"
//	@Param			request			body		CreateMapSummaryRequest	true	"Body"
//	@Success		200				{object}	models.Response{data=CreateMapSummaryRequest}
//	@Router			/maps/{mapid}/summary [post]
func CreateMapSummary(c *gin.Context) {
	mod, exists := c.Get("mod")
	if !exists || !mod.(bool) {
		c.JSON(http.StatusOK, models.ErrorResponse("Insufficient permissions."))
		return
	}
	// Bind parameter and body
	id := c.Param("mapid")
	mapID, err := strconv.Atoi(id)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	var request CreateMapSummaryRequest
	if err := c.BindJSON(&request); err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	// Start database transaction
	tx, err := database.DB.Begin()
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	defer tx.Rollback()
	// Fetch route category and score count
	var checkMapID int
	sql := `SELECT m.id FROM maps m WHERE m.id = $1`
	err = database.DB.QueryRow(sql, mapID).Scan(&checkMapID)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	if mapID != checkMapID {
		c.JSON(http.StatusOK, models.ErrorResponse("Map ID does not exist."))
		return
	}
	// Update database with new data
	sql = `INSERT INTO map_history (map_id,category_id,user_name,score_count,description,showcase,record_date)
	VALUES ($1,$2,$3,$4,$5,$6,$7)`
	_, err = tx.Exec(sql, mapID, request.CategoryID, request.UserName, *request.ScoreCount, request.Description, request.Showcase, request.RecordDate)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	if err = tx.Commit(); err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, models.Response{
		Success: true,
		Message: "Successfully created map summary.",
		Data:    request,
	})
}

// PUT Map Summary
//
//	@Description	Edit map summary with specified map id.
//	@Tags			maps / summary
//	@Produce		json
//	@Param			Authorization	header		string					true	"JWT Token"
//	@Param			mapid			path		int						true	"Map ID"
//	@Param			request			body		EditMapSummaryRequest	true	"Body"
//	@Success		200				{object}	models.Response{data=EditMapSummaryRequest}
//	@Router			/maps/{mapid}/summary [put]
func EditMapSummary(c *gin.Context) {
	mod, exists := c.Get("mod")
	if !exists || !mod.(bool) {
		c.JSON(http.StatusOK, models.ErrorResponse("Insufficient permissions."))
		return
	}
	// Bind parameter and body
	id := c.Param("mapid")
	// we get mapid in path parameters, but it's not really used anywhere here lol.
	_, err := strconv.Atoi(id)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	var request EditMapSummaryRequest
	if err := c.BindJSON(&request); err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	// Start database transaction
	tx, err := database.DB.Begin()
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	defer tx.Rollback()
	// Update database with new data
	sql := `UPDATE map_history SET user_name = $2, score_count = $3, record_date = $4, description = $5, showcase = $6 WHERE id = $1`
	_, err = tx.Exec(sql, request.RouteID, request.UserName, *request.ScoreCount, request.RecordDate, request.Description, request.Showcase)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	if err = tx.Commit(); err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, models.Response{
		Success: true,
		Message: "Successfully updated map summary.",
		Data:    request,
	})
}

// DELETE Map Summary
//
//	@Description	Delete map summary with specified map id.
//	@Tags			maps / summary
//	@Produce		json
//	@Param			Authorization	header		string					true	"JWT Token"
//	@Param			mapid			path		int						true	"Map ID"
//	@Param			request			body		DeleteMapSummaryRequest	true	"Body"
//	@Success		200				{object}	models.Response{data=DeleteMapSummaryRequest}
//	@Router			/maps/{mapid}/summary [delete]
func DeleteMapSummary(c *gin.Context) {
	mod, exists := c.Get("mod")
	if !exists || !mod.(bool) {
		c.JSON(http.StatusOK, models.ErrorResponse("Insufficient permissions."))
		return
	}
	// Bind parameter and body
	id := c.Param("mapid")
	// we get mapid in path parameters, but it's not really used anywhere here lol.
	_, err := strconv.Atoi(id)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	var request DeleteMapSummaryRequest
	if err := c.BindJSON(&request); err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	// Start database transaction
	tx, err := database.DB.Begin()
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	defer tx.Rollback()
	// Update database with new data
	sql := `DELETE FROM map_history mh WHERE mh.id = $1`
	_, err = tx.Exec(sql, request.RouteID)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	if err = tx.Commit(); err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, models.Response{
		Success: true,
		Message: "Successfully delete map summary.",
		Data:    request,
	})
}

// PUT Map Image
//
//	@Description	Edit map image with specified map id.
//	@Tags			maps / summary
//	@Produce		json
//	@Param			Authorization	header		string				true	"JWT Token"
//	@Param			mapid			path		int					true	"Map ID"
//	@Param			request			body		EditMapImageRequest	true	"Body"
//	@Success		200				{object}	models.Response{data=EditMapImageRequest}
//	@Router			/maps/{mapid}/image [put]
func EditMapImage(c *gin.Context) {
	mod, exists := c.Get("mod")
	if !exists || !mod.(bool) {
		c.JSON(http.StatusOK, models.ErrorResponse("Insufficient permissions."))
		return
	}
	// Bind parameter and body
	id := c.Param("mapid")
	mapID, err := strconv.Atoi(id)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	var request EditMapImageRequest
	if err := c.BindJSON(&request); err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	// Update database with new data
	sql := `UPDATE maps SET image = $2 WHERE id = $1`
	_, err = database.DB.Exec(sql, mapID, request.Image)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, models.Response{
		Success: true,
		Message: "Successfully updated map image.",
		Data:    request,
	})
}
