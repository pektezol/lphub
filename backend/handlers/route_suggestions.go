package handlers

import (
	stdsql "database/sql"
	"net/http"
	"strconv"
	"strings"
	"time"

	"lphub/database"
	"lphub/models"

	"github.com/gin-gonic/gin"
)

type routeDescriptionSuggestion struct {
	ID                   int        `json:"id"`
	MapID                int        `json:"map_id"`
	RouteID              int        `json:"route_id"`
	MapName              string     `json:"map_name"`
	GameName             string     `json:"game_name"`
	SectionName          string     `json:"section_name"`
	CategoryName         string     `json:"category_name"`
	SubmitterID          string     `json:"submitter_id"`
	SubmitterName        string     `json:"submitter_name"`
	SubmittedDescription string     `json:"submitted_description"`
	CurrentDescription   string     `json:"current_description"`
	ProposedDescription  string     `json:"proposed_description"`
	Status               string     `json:"status"`
	CreatedAt            time.Time  `json:"created_at"`
	ReviewedBy           *string    `json:"reviewed_by"`
	ReviewedAt           *time.Time `json:"reviewed_at"`
}

func CreateRouteDescriptionSuggestion(c *gin.Context) {
	userValue, _ := c.Get("user")
	user := userValue.(models.User)
	mapID, err := strconv.Atoi(c.Param("mapid"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse("Invalid map ID."))
		return
	}
	routeID, err := strconv.Atoi(c.Param("routeid"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse("Invalid route ID."))
		return
	}
	var request struct {
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&request); err != nil || strings.TrimSpace(request.Description) == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse("A proposed description is required."))
		return
	}
	var baseline string
	err = database.DB.QueryRowContext(c.Request.Context(), `
		SELECT description FROM map_history WHERE id = $1 AND map_id = $2
	`, routeID, mapID).Scan(&baseline)
	if err == stdsql.ErrNoRows {
		c.JSON(http.StatusNotFound, models.ErrorResponse("Route does not belong to this map."))
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse(err.Error()))
		return
	}
	var id int
	err = database.DB.QueryRowContext(c.Request.Context(), `
		INSERT INTO route_description_suggestions
			(map_id, route_id, submitter_id, submitted_description, proposed_description)
		VALUES ($1, $2, $3, $4, $5) RETURNING id
	`, mapID, routeID, user.SteamID, baseline, request.Description).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, models.Response{Success: true, Message: "Suggestion submitted.", Data: gin.H{"id": id}})
}

func requireModerator(c *gin.Context) bool {
	mod, ok := c.Get("mod")
	if !ok || mod != true {
		c.JSON(http.StatusForbidden, models.ErrorResponse("Insufficient permissions."))
		return false
	}
	return true
}

func ListRouteDescriptionSuggestions(c *gin.Context) {
	if !requireModerator(c) {
		return
	}
	rows, err := database.DB.QueryContext(c.Request.Context(), `
		SELECT s.id, s.map_id, s.route_id, m.name, g.name, ch.name, cat.name,
			s.submitter_id, u.user_name, s.submitted_description, mh.description,
			s.proposed_description, s.status, s.created_at, s.reviewed_by, s.reviewed_at
		FROM route_description_suggestions s
		JOIN maps m ON m.id = s.map_id
		JOIN games g ON g.id = m.game_id
		JOIN chapters ch ON ch.id = m.chapter_id
		JOIN map_history mh ON mh.id = s.route_id
		JOIN categories cat ON cat.id = mh.category_id
		JOIN users u ON u.steam_id = s.submitter_id
		WHERE s.status = 'pending'
		ORDER BY s.created_at, s.id
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse(err.Error()))
		return
	}
	defer rows.Close()
	suggestions := []routeDescriptionSuggestion{}
	for rows.Next() {
		var item routeDescriptionSuggestion
		if err := rows.Scan(&item.ID, &item.MapID, &item.RouteID, &item.MapName, &item.GameName, &item.SectionName,
			&item.CategoryName, &item.SubmitterID, &item.SubmitterName, &item.SubmittedDescription,
			&item.CurrentDescription, &item.ProposedDescription, &item.Status, &item.CreatedAt, &item.ReviewedBy, &item.ReviewedAt); err != nil {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse(err.Error()))
			return
		}
		suggestions = append(suggestions, item)
	}
	if err := rows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, models.Response{Success: true, Data: gin.H{"suggestions": suggestions}})
}

func ReviewRouteDescriptionSuggestion(c *gin.Context) {
	if !requireModerator(c) {
		return
	}
	id, err := strconv.Atoi(c.Param("suggestionid"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse("Invalid suggestion ID."))
		return
	}
	var request struct {
		Decision string `json:"decision"`
	}
	if err := c.ShouldBindJSON(&request); err != nil || (request.Decision != "accepted" && request.Decision != "rejected") {
		c.JSON(http.StatusBadRequest, models.ErrorResponse("Decision must be accepted or rejected."))
		return
	}
	userValue, _ := c.Get("user")
	user := userValue.(models.User)
	tx, err := database.DB.BeginTx(c.Request.Context(), nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse(err.Error()))
		return
	}
	defer tx.Rollback()
	var mapID, routeID int
	var proposed, status string
	err = tx.QueryRowContext(c.Request.Context(), `
		SELECT map_id, route_id, proposed_description, status
		FROM route_description_suggestions WHERE id = $1 FOR UPDATE
	`, id).Scan(&mapID, &routeID, &proposed, &status)
	if err == stdsql.ErrNoRows {
		c.JSON(http.StatusNotFound, models.ErrorResponse("Suggestion not found."))
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse(err.Error()))
		return
	}
	if status != "pending" {
		c.JSON(http.StatusConflict, models.ErrorResponse("Suggestion has already been reviewed."))
		return
	}
	if request.Decision == "accepted" {
		result, updateErr := tx.ExecContext(c.Request.Context(), `
			UPDATE map_history SET description = $1 WHERE id = $2 AND map_id = $3
		`, proposed, routeID, mapID)
		if updateErr != nil {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse(updateErr.Error()))
			return
		}
		updated, updateErr := result.RowsAffected()
		if updateErr != nil || updated != 1 {
			c.JSON(http.StatusConflict, models.ErrorResponse("Route no longer exists on the submitted map."))
			return
		}
	}
	_, err = tx.ExecContext(c.Request.Context(), `
		UPDATE route_description_suggestions SET status = $1, reviewed_by = $2, reviewed_at = now()
		WHERE id = $3
	`, request.Decision, user.SteamID, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse(err.Error()))
		return
	}
	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, models.Response{Success: true, Message: "Suggestion reviewed."})
}
