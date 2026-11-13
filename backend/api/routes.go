package api

import (
	"lphub/handlers"

	"github.com/gin-gonic/gin"
	swaggerfiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

func InitRoutes(router *gin.Engine) {
	api := router.Group("/api")
	{
		v1 := api.Group("/v1")
		// Swagger
		v1.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerfiles.Handler))
		v1.GET("/", func(c *gin.Context) {
			c.File("docs/index.html")
		})
		// Tokens, login
		v1.GET("/token", NoStore, RateLimit, handlers.GetCookie)
		v1.DELETE("/token", NoStore, RateLimit, handlers.DeleteCookie)
		v1.GET("/login", NoStore, RateLimit, handlers.Login)
		v1.GET("/token/autosubmit", NoStore, IsAutosubmitAuthenticated, handlers.VerifyAutosubmitToken)
		v1.POST("/token/autosubmit", NoStore, IsAuthenticated, handlers.AutosubmitToken)
		v1.PUT("/token/autosubmit", NoStore, IsAuthenticated, handlers.AutosubmitToken)
		// Users, profiles
		v1.GET("/profile", NoStore, RateLimit, IsAuthenticated, handlers.Profile)
		v1.PUT("/profile", NoStore, IsAuthenticated, handlers.UpdateCountryCode)
		v1.POST("/profile", NoStore, IsAuthenticated, handlers.UpdateUser)
		v1.GET("/users/:userid", handlers.FetchUser)
		// Maps
		// - Summary
		v1.GET("/maps/:mapid/summary", RateLimit, handlers.FetchMapSummary)
		v1.POST("/maps/:mapid/summary", IsAuthenticated, handlers.CreateMapSummary)
		v1.PUT("/maps/:mapid/summary", IsAuthenticated, handlers.EditMapSummary)
		v1.DELETE("/maps/:mapid/summary", IsAuthenticated, handlers.DeleteMapSummary)
		v1.PUT("/maps/:mapid/image", IsAuthenticated, handlers.EditMapImage)
		v1.PUT("/maps/:mapid/difficulty", IsAuthenticated, handlers.EditMapDifficulty)
		// - Leaderboards
		v1.GET("/maps/:mapid/leaderboards", RateLimit, handlers.FetchMapLeaderboards)
		v1.OPTIONS("/record", AllowRecordUploadCORS)
		v1.POST("/record", AllowRecordUploadCORS, IsRecordAuthenticated, handlers.CreateRecordFromDemo)
		v1.OPTIONS("/maps/:mapid/record", AllowRecordUploadCORS)
		v1.POST("/maps/:mapid/record", AllowRecordUploadCORS, IsAuthenticated, handlers.CreateRecordWithDemo)
		v1.DELETE("/maps/:mapid/record/:recordid", IsAuthenticated, handlers.DeleteRecord)
		v1.POST("/record/pb", IsRecordAuthenticated, handlers.CheckPersonalBest)
		v1.PUT("/demos/autorender", IsDemoAuthenticated, handlers.SetAutorenderID)
		v1.GET("/demos", RateLimit, IsDemoAuthenticated, handlers.DownloadDemoWithID)
		// - Discussions
		v1.GET("/discussions", RateLimit, handlers.FetchDiscussions)
		v1.GET("/maps/:mapid/discussions", RateLimit, handlers.FetchMapDiscussions)
		v1.GET("/maps/:mapid/discussions/:discussionid", RateLimit, handlers.FetchMapDiscussion)
		v1.POST("/maps/:mapid/discussions", IsAuthenticated, handlers.CreateMapDiscussion)
		v1.POST("/maps/:mapid/discussions/:discussionid", IsAuthenticated, handlers.CreateMapDiscussionComment)
		v1.PUT("/maps/:mapid/discussions/:discussionid", IsAuthenticated, handlers.EditMapDiscussion)
		v1.DELETE("/maps/:mapid/discussions/:discussionid", IsAuthenticated, handlers.DeleteMapDiscussion)
		// Rankings, search
		v1.GET("/rankings/lphub", handlers.RankingsLPHUB)
		v1.GET("/rankings/steam", handlers.RankingsSteam)
		v1.GET("/search", handlers.SearchWithQuery)
		// Games, chapters, maps
		v1.GET("/games", RateLimit, handlers.FetchGames)
		v1.GET("/games/:gameid", RateLimit, handlers.FetchChapters)
		v1.GET("/chapters/:chapterid", RateLimit, handlers.FetchChapterMaps)
		v1.GET("/games/:gameid/maps", RateLimit, handlers.FetchMaps)
		// Stats
		v1.GET("/stats/statistics", RateLimit, handlers.Statistics)
		v1.GET("/stats/timeline", RateLimit, handlers.Timeline)
		v1.GET("/stats/scores", RateLimit, handlers.Scores)
	}
}
