package handlers

import (
	"github.com/gin-gonic/gin"
	"lphub/autosubmit"
	"lphub/database"
	"lphub/models"
	"net/http"
)

// POST / PUT Autosubmit Token
//
//	@Description	Retrieves or creates the authenticated user's autosubmit token with POST; regenerates it and invalidates the previous token with PUT.
//	@Tags auth
//	@Produce json
//	@Param Authorization header string true "Bearer <Steam JWT>"
//	@Success 200 {object} models.Response{data=LoginResponse}
//	@Router /token/autosubmit [post]
//	@Router /token/autosubmit [put]
func AutosubmitToken(c *gin.Context) {
	user := c.MustGet("user").(models.User)
	_, hash, encrypted, err := autosubmit.Generate(user.SteamID)
	if err == nil {
		query := `INSERT INTO autosubmit_tokens (user_id,token_hash,token_ciphertext) VALUES ($1,$2,$3) ON CONFLICT (user_id) DO UPDATE SET user_id=EXCLUDED.user_id RETURNING token_ciphertext`
		if c.Request.Method == http.MethodPut {
			query = `INSERT INTO autosubmit_tokens (user_id,token_hash,token_ciphertext) VALUES ($1,$2,$3) ON CONFLICT (user_id) DO UPDATE SET token_hash=EXCLUDED.token_hash, token_ciphertext=EXCLUDED.token_ciphertext RETURNING token_ciphertext`
		}
		err = database.DB.QueryRowContext(c.Request.Context(), query, user.SteamID, hash, encrypted).Scan(&encrypted)
	}
	var token string
	if err == nil {
		token, err = autosubmit.Decrypt(user.SteamID, encrypted)
	}
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse("Could not access autosubmit token."))
		return
	}
	c.JSON(http.StatusOK, models.Response{Success: true, Message: "Autosubmit token retrieved.", Data: LoginResponse{Token: token}})
}

// GET Autosubmit Token
//
//	@Description	Verifies an autosubmit token, returning success without account information. Invalid tokens return success false and an error message.
//	@Tags auth
//	@Produce json
//	@Param Authorization header string true "Bearer <autosubmit token>"
//	@Success 200 {object} models.Response
//	@Router /token/autosubmit [get]
func VerifyAutosubmitToken(c *gin.Context) {
	c.JSON(http.StatusOK, models.Response{Success: true, Message: "Valid autosubmit token."})
}
