package main

import (
	"fmt"
	"log"
	"os"

	"lphub/api"
	"lphub/database"
	_ "lphub/docs"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

//	@title			Least Portals Hub
//	@version		1.0
//	@description	Backend API endpoints for Least Portals Hub.

//	@license.name	GNU Affero General Public License, Version 3
//	@license.url	https://www.gnu.org/licenses/agpl-3.0.html

// @host		lp.pektezol.dev
// @BasePath	/api/v1
func main() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}
	if os.Getenv("ENV") == "PROD" {
		gin.SetMode(gin.ReleaseMode)
	}
	router := gin.Default()
	database.ConnectDB()
	api.InitRoutes(router)
	// for debugging
	// router.Use(cors.New(cors.Config{
	// 	AllowOrigins:     []string{"*"},
	// 	AllowMethods:     []string{"GET", "POST", "DELETE", "PUT", "PATCH"},
	// 	AllowHeaders:     []string{"Origin"},
	// 	ExposeHeaders:    []string{"Content-Length"},
	// 	AllowCredentials: true,
	// 	MaxAge:           12 * time.Hour,
	// }))
	// router.Static("/static", "../frontend/build/static")
	// router.StaticFile("/", "../frontend/build/index.html")
	// router.NoRoute(func(c *gin.Context) {
	// 	c.File("../frontend/build/index.html")
	// })
	router.MaxMultipartMemory = 250 << 20 // 250 mb limit for demos
	router.Run(fmt.Sprintf(":%s", os.Getenv("PORT")))
}
