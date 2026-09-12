package api

import (
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

const defaultRecordUploadOrigin = "https://lp.portal2.sr"

func allowsRecordUploadOrigin(origin string) bool {
	origins := os.Getenv("RECORD_UPLOAD_CORS_ORIGINS")
	if origins == "" {
		origins = defaultRecordUploadOrigin
	}

	for _, allowedOrigin := range strings.Split(origins, ",") {
		if origin == strings.TrimSpace(allowedOrigin) {
			return true
		}
	}

	return false
}

// AllowRecordUploadCORS permits the frontend to send demo uploads directly to
// the unproxied upload origin while leaving the rest of the API same-origin.
func AllowRecordUploadCORS(c *gin.Context) {
	origin := c.GetHeader("Origin")
	if allowsRecordUploadOrigin(origin) {
		c.Header("Access-Control-Allow-Origin", origin)
		c.Header("Access-Control-Allow-Methods", "POST, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Authorization, Content-Type")
		c.Header("Access-Control-Max-Age", "86400")
		c.Header("Vary", "Origin")
	}

	if c.Request.Method == http.MethodOptions {
		c.Status(http.StatusNoContent)
		c.Abort()
		return
	}

	c.Next()
}
