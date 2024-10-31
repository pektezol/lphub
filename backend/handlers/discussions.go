package handlers

import (
	"net/http"
	"strconv"
	"time"

	"lphub/database"
	"lphub/models"

	"github.com/gin-gonic/gin"
)

type MapDiscussionResponse struct {
	Discussion MapDiscussion `json:"discussion"`
}

type MapDiscussionsResponse struct {
	Discussions []MapDiscussion `json:"discussions"`
}

type MapDiscussion struct {
	ID      int                        `json:"id"`
	Creator models.UserShortWithAvatar `json:"creator"`
	Title   string                     `json:"title"`
	Content string                     `json:"content"`
	// Upvotes   int                        `json:"upvotes"`
	CreatedAt time.Time              `json:"created_at"`
	UpdatedAt time.Time              `json:"updated_at"`
	Comments  []MapDiscussionComment `json:"comments"`
}

type MapDiscussionComment struct {
	User    models.UserShortWithAvatar `json:"user"`
	Comment string                     `json:"comment"`
	Date    time.Time                  `json:"date"`
}

type CreateMapDiscussionRequest struct {
	Title   string `json:"title" binding:"required"`
	Content string `json:"content" binding:"required"`
}

type CreateMapDiscussionCommentRequest struct {
	Comment string `json:"comment" binding:"required"`
}

type EditMapDiscussionRequest struct {
	Title   string `json:"title" binding:"required"`
	Content string `json:"content" binding:"required"`
}

// GET Map Discussions
//
//	@Description	Get map discussions with specified map id.
//	@Tags			maps / discussions
//	@Produce		json
//	@Param			mapid	path		int	true	"Map ID"
//	@Success		200		{object}	models.Response{data=MapDiscussionsResponse}
//	@Router			/maps/{mapid}/discussions [get]
func FetchMapDiscussions(c *gin.Context) {
	// TODO: get upvotes
	response := MapDiscussionsResponse{}
	mapID, err := strconv.Atoi(c.Param("mapid"))
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	sql := `SELECT md.id, u.steam_id, u.user_name, u.avatar_link, md.title, md.content, md.created_at, md.updated_at FROM map_discussions md
	INNER JOIN users u ON md.user_id = u.steam_id WHERE md.map_id = $1 AND is_deleted = false
	ORDER BY md.updated_at DESC`
	rows, err := database.DB.Query(sql, mapID)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	// Get discussion data
	for rows.Next() {
		discussion := MapDiscussion{}
		err := rows.Scan(&discussion.ID, &discussion.Creator.SteamID, &discussion.Creator.UserName, &discussion.Creator.AvatarLink, &discussion.Title, &discussion.Content, &discussion.CreatedAt, &discussion.UpdatedAt)
		if err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
		response.Discussions = append(response.Discussions, discussion)
	}
	c.JSON(http.StatusOK, models.Response{
		Success: true,
		Message: "Successfully retrieved map discussions.",
		Data:    response,
	})
}

// GET Map Discussion
//
//	@Description	Get map discussion with specified map and discussion id.
//	@Tags			maps / discussions
//	@Produce		json
//	@Param			mapid			path		int	true	"Map ID"
//	@Param			discussionid	path		int	true	"Discussion ID"
//	@Success		200				{object}	models.Response{data=MapDiscussionResponse}
//	@Router			/maps/{mapid}/discussions/{discussionid} [get]
func FetchMapDiscussion(c *gin.Context) {
	// TODO: get upvotes
	response := MapDiscussionResponse{}
	mapID, err := strconv.Atoi(c.Param("mapid"))
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	discussionID, err := strconv.Atoi(c.Param("discussionid"))
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	sql := `SELECT md.id, u.steam_id, u.user_name, u.avatar_link, md.title, md.content, md.created_at, md.updated_at FROM map_discussions md
	INNER JOIN users u ON md.user_id = u.steam_id WHERE md.map_id = $1 AND md.id = $2 AND is_deleted = false`
	err = database.DB.QueryRow(sql, mapID, discussionID).Scan(&response.Discussion.ID, &response.Discussion.Creator.SteamID, &response.Discussion.Creator.UserName, &response.Discussion.Creator.AvatarLink, &response.Discussion.Title, &response.Discussion.Content, &response.Discussion.CreatedAt, &response.Discussion.UpdatedAt)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	// Get commments
	sql = `SELECT u.steam_id, u.user_name, u.avatar_link, mdc.comment, mdc.created_at FROM map_discussions_comments mdc
	INNER JOIN users u ON mdc.user_id = u.steam_id WHERE mdc.discussion_id = $1`
	comments, err := database.DB.Query(sql, response.Discussion.ID)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	for comments.Next() {
		comment := MapDiscussionComment{}
		err = comments.Scan(&comment.User.SteamID, &comment.User.UserName, &comment.User.AvatarLink, &comment.Comment, &comment.Date)
		if err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
		response.Discussion.Comments = append(response.Discussion.Comments, comment)
	}
	c.JSON(http.StatusOK, models.Response{
		Success: true,
		Message: "Successfully retrieved map discussion.",
		Data:    response,
	})
}

// POST Map Discussion
//
//	@Description	Create map discussion with specified map id.
//	@Tags			maps / discussions
//	@Produce		json
//	@Param			Authorization	header		string						true	"JWT Token"
//	@Param			mapid			path		int							true	"Map ID"
//	@Param			request			body		CreateMapDiscussionRequest	true	"Body"
//	@Success		200				{object}	models.Response{data=CreateMapDiscussionRequest}
//	@Router			/maps/{mapid}/discussions [post]
func CreateMapDiscussion(c *gin.Context) {
	mapID, err := strconv.Atoi(c.Param("mapid"))
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	user, _ := c.Get("user")
	var request CreateMapDiscussionRequest
	if err := c.BindJSON(&request); err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	sql := `INSERT INTO map_discussions (map_id,user_id,title,"content")
	VALUES($1,$2,$3,$4);`
	_, err = database.DB.Exec(sql, mapID, user.(models.User).SteamID, request.Title, request.Content)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, models.Response{
		Success: true,
		Message: "Successfully created map discussion.",
		Data:    request,
	})
}

// POST Map Discussion Comment
//
//	@Description	Create map discussion comment with specified map id.
//	@Tags			maps / discussions
//	@Produce		json
//	@Param			Authorization	header		string								true	"JWT Token"
//	@Param			mapid			path		int									true	"Map ID"
//	@Param			discussionid	path		int									true	"Discussion ID"
//	@Param			request			body		CreateMapDiscussionCommentRequest	true	"Body"
//	@Success		200				{object}	models.Response{data=CreateMapDiscussionCommentRequest}
//	@Router			/maps/{mapid}/discussions/{discussionid} [post]
func CreateMapDiscussionComment(c *gin.Context) {
	_, err := strconv.Atoi(c.Param("mapid"))
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	discussionID, err := strconv.Atoi(c.Param("discussionid"))
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	user, _ := c.Get("user")
	var request CreateMapDiscussionCommentRequest
	if err := c.BindJSON(&request); err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	sql := `INSERT INTO map_discussions_comments (discussion_id,user_id,comment)
	VALUES($1,$2,$3);`
	_, err = database.DB.Exec(sql, discussionID, user.(models.User).SteamID, request.Comment)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	sql = `UPDATE map_discussions SET updated_at = $2 WHERE id = $1`
	_, err = database.DB.Exec(sql, discussionID, time.Now().UTC())
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, models.Response{
		Success: true,
		Message: "Successfully created map discussion comment.",
		Data:    request,
	})
}

// PUT Map Discussion
//
//	@Description	Edit map discussion with specified map id.
//	@Tags			maps / discussions
//	@Produce		json
//	@Param			Authorization	header		string						true	"JWT Token"
//	@Param			mapid			path		int							true	"Map ID"
//	@Param			discussionid	path		int							true	"Discussion ID"
//	@Param			request			body		EditMapDiscussionRequest	true	"Body"
//	@Success		200				{object}	models.Response{data=EditMapDiscussionRequest}
//	@Router			/maps/{mapid}/discussions/{discussionid} [put]
func EditMapDiscussion(c *gin.Context) {
	mapID, err := strconv.Atoi(c.Param("mapid"))
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	discussionID, err := strconv.Atoi(c.Param("discussionid"))
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	user, _ := c.Get("user")
	var request EditMapDiscussionRequest
	if err := c.BindJSON(&request); err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	sql := `UPDATE map_discussions SET title = $4, content = $5, updated_at = $6 WHERE id = $1 AND map_id = $2 AND user_id = $3 AND is_deleted = false`
	result, err := database.DB.Exec(sql, discussionID, mapID, user.(models.User).SteamID, request.Title, request.Content, time.Now().UTC())
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	affectedRows, err := result.RowsAffected()
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	if affectedRows == 0 {
		c.JSON(http.StatusOK, models.ErrorResponse("You can only edit your own post."))
		return
	}
	c.JSON(http.StatusOK, models.Response{
		Success: true,
		Message: "Successfully edited map discussion.",
		Data:    request,
	})
}

// DELETE Map Discussion
//
//	@Description	Delete map discussion with specified map id.
//	@Tags			maps / discussions
//	@Produce		json
//	@Param			Authorization	header		string	true	"JWT Token"
//	@Param			mapid			path		int		true	"Map ID"
//	@Param			discussionid	path		int		true	"Discussion ID"
//	@Success		200				{object}	models.Response
//	@Router			/maps/{mapid}/discussions/{discussionid} [delete]
func DeleteMapDiscussion(c *gin.Context) {
	mapID, err := strconv.Atoi(c.Param("mapid"))
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	discussionID, err := strconv.Atoi(c.Param("discussionid"))
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	user, _ := c.Get("user")
	sql := `UPDATE map_discussions SET is_deleted = true WHERE id = $1 AND map_id = $2 AND user_id = $3`
	result, err := database.DB.Exec(sql, discussionID, mapID, user.(models.User).SteamID)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	affectedRows, err := result.RowsAffected()
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	if affectedRows == 0 {
		c.JSON(http.StatusOK, models.ErrorResponse("You can only delete your own post."))
		return
	}
	c.JSON(http.StatusOK, models.Response{
		Success: true,
		Message: "Successfully deleted map discussion.",
		Data:    nil,
	})
}
