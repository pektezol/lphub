package api

import (
	"net/http"

	"golang.org/x/time/rate"

	"github.com/gin-gonic/gin"
)

func RateLimit(c *gin.Context) {
	limiter := rate.NewLimiter(1, 5) // don't know if this is too much or not enough tbh
	if limiter.Allow() {
		c.Next()
	} else {
		c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
			"error": "Rate limit exceeded",
		})
	}
}
