package api

import (
	"fmt"
	"net/http"
	"os"
	"time"

	"lphub/database"
	"lphub/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v4"
)

func IsAuthenticated(c *gin.Context) {
	tokenString := c.GetHeader("Authorization")
	// Validate token
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(os.Getenv("SECRET_KEY")), nil
	})
	if token == nil {
		c.AbortWithStatusJSON(http.StatusOK, models.ErrorResponse("Token is nil."))
		return
	}
	if err != nil {
		c.AbortWithStatusJSON(http.StatusOK, models.ErrorResponse("Token is invalid."))
		return
	}
	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		// Check exp
		if float64(time.Now().Unix()) > claims["exp"].(float64) {
			c.AbortWithStatusJSON(http.StatusOK, models.ErrorResponse("Token expired."))
			return
		}
		// Get user from DB
		var user models.User
		database.DB.QueryRow(`SELECT u.steam_id, u.user_name, u.avatar_link, u.country_code, u.created_at, u.updated_at FROM users u WHERE steam_id = $1`, claims["sub"]).Scan(
			&user.SteamID, &user.UserName, &user.AvatarLink,
			&user.CountryCode, &user.CreatedAt, &user.UpdatedAt)
		if user.SteamID == "" {
			c.AbortWithStatusJSON(http.StatusOK, models.ErrorResponse("Token does not match a user."))
			return
		}
		// Get user titles from DB
		var moderator bool
		user.Titles = []models.Title{}
		rows, _ := database.DB.Query(`SELECT t.title_name, t.title_color FROM titles t INNER JOIN user_titles ut ON t.id=ut.title_id WHERE ut.user_id = $1`, user.SteamID)
		for rows.Next() {
			var title models.Title
			rows.Scan(&title.Name, &title.Color)
			if title.Name == "Moderator" {
				moderator = true
			}
			user.Titles = append(user.Titles, title)
		}
		// Set user id variable in db session for audit logging
		_, err = database.DB.Exec(fmt.Sprintf("SET app.user_id = '%s';", user.SteamID))
		if err != nil {
			c.AbortWithStatusJSON(http.StatusOK, models.ErrorResponse("Session failed to start."))
			return
		}
		c.Set("user", user)
		c.Set("mod", moderator)
		c.Next()
	} else {
		c.AbortWithStatusJSON(http.StatusOK, models.ErrorResponse("Token is invalid."))
		return
	}
}
