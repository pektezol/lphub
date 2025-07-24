package handlers

import (
	"context"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"strconv"
	"strings"

	"lphub/database"
	"lphub/models"
	"lphub/parser"

	"github.com/Backblaze/blazer/b2"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type RecordRequest struct {
	HostDemo    *multipart.FileHeader `json:"host_demo" form:"host_demo" binding:"required" swaggerignore:"true"`
	PartnerDemo *multipart.FileHeader `json:"partner_demo" form:"partner_demo" swaggerignore:"true"`
}

type RecordResponse struct {
	ScoreCount int `json:"score_count"`
	ScoreTime  int `json:"score_time"`
}

// POST Record
//
//	@Description	Post record with demo of a specific map.
//	@Tags			maps / leaderboards
//	@Accept			mpfd
//	@Produce		json
//	@Param			mapid				path		int		true	"Map ID"
//	@Param			Authorization		header		string	true	"JWT Token"
//	@Param			host_demo			formData	file	true	"Host Demo"
//	@Param			partner_demo		formData	file	false	"Partner Demo"
//	@Success		200					{object}	models.Response{data=RecordResponse}
//	@Router			/maps/{mapid}/record [post]
func CreateRecordWithDemo(c *gin.Context) {
	id := c.Param("mapid")
	mapID, err := strconv.Atoi(id)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	user, _ := c.Get("user")
	// Check if map is sp or mp
	var gameName string
	var isCoop bool
	var isDisabled bool
	sql := `SELECT g.name, g.is_coop, m.is_disabled FROM maps m INNER JOIN games g ON m.game_id=g.id WHERE m.id = $1`
	err = database.DB.QueryRow(sql, mapID).Scan(&gameName, &isCoop, &isDisabled)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	if isDisabled {
		c.JSON(http.StatusOK, models.ErrorResponse("Map is not available for competitive boards."))
		return
	}
	// Get record request
	var record RecordRequest
	if err := c.ShouldBind(&record); err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	if isCoop && record.PartnerDemo == nil {
		c.JSON(http.StatusOK, models.ErrorResponse("Missing partner demo for coop submission."))
		return
	}
	// Demo files
	demoFileHeaders := []*multipart.FileHeader{record.HostDemo}
	if isCoop {
		demoFileHeaders = append(demoFileHeaders, record.PartnerDemo)
	}
	var hostDemoUUID, partnerDemoUUID string
	var hostDemoScoreCount, hostDemoScoreTime int
	var hostSteamID, partnerSteamID string
	var hostDemoServerNumber, partnerDemoServerNumber int
	// Create database transaction for inserts
	tx, err := database.DB.Begin()
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	// Defer to a rollback in case anything fails
	defer tx.Rollback()
	for i, header := range demoFileHeaders {
		uuid := uuid.New().String()
		// Upload & insert into demos
		f, err := header.Open()
		if err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
		defer f.Close()
		parserResult, err := parser.ProcessDemo(f)
		if err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse("Error while processing demo: "+err.Error()))
			return
		}
		if mapID != parserResult.MapID {
			c.JSON(http.StatusOK, models.ErrorResponse("Demo map does not match selected map id."))
			return
		}
		hostDemoScoreCount = parserResult.PortalCount
		hostDemoScoreTime = parserResult.TickCount
		hostSteamID = parserResult.HostSteamID
		partnerSteamID = parserResult.PartnerSteamID
		if hostDemoScoreCount == 0 && hostDemoScoreTime == 0 {
			c.JSON(http.StatusOK, models.ErrorResponse("Processing demo went wrong. Please contact a web admin and provide the demo in question."))
			return
		}
		if !isCoop {
			convertedSteamID := strconv.FormatInt(convertSteamID64(hostSteamID), 10)
			if convertedSteamID != user.(models.User).SteamID {
				c.JSON(http.StatusOK, models.ErrorResponse(fmt.Sprintf("Host SteamID from demo and request does not match! Check your submission and try again.\nDemo Host SteamID: %s\nRequest Host SteamID: %s", convertedSteamID, user.(models.User).SteamID)))
				return
			}
		} else {
			if parserResult.IsHost && i != 0 {
				c.JSON(http.StatusOK, models.ErrorResponse("Given partner demo is a host demo."))
				return
			}
			if !parserResult.IsHost && i == 0 {
				c.JSON(http.StatusOK, models.ErrorResponse("Given host demo is a partner demo."))
				return
			}
		}
		if i == 0 {
			hostDemoUUID = uuid
			hostDemoServerNumber = parserResult.ServerNumber
		} else if i == 1 {
			partnerDemoUUID = uuid
			partnerDemoServerNumber = parserResult.ServerNumber
		}
		_, err = tx.Exec(`INSERT INTO demos (id) VALUES ($1)`, uuid)
		if err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
	}
	// Insert into records
	if isCoop {
		if hostDemoServerNumber != partnerDemoServerNumber {
			c.JSON(http.StatusOK, models.ErrorResponse(fmt.Sprintf("Host and partner demo server numbers (%d & %d) does not match!", hostDemoServerNumber, partnerDemoServerNumber)))
			return
		}
		convertedHostSteamID := strconv.FormatInt(convertSteamID64(hostSteamID), 10)
		// if convertedHostSteamID != user.(models.User).SteamID && convertedHostSteamID != record.PartnerID {
		// 	deleteFile(srv, hostDemoFileID)
		// 	deleteFile(srv, partnerDemoFileID)
		// 	c.JSON(http.StatusOK, models.ErrorResponse(fmt.Sprintf("Host SteamID from demo and request does not match! Check your submission and try again.\nDemo Host SteamID: %s\nRequest Host SteamID: %s", convertedHostSteamID, user.(models.User).SteamID)))
		// 	return
		// }
		convertedPartnerSteamID := strconv.FormatInt(convertSteamID64(partnerSteamID), 10)
		// if convertedPartnerSteamID != record.PartnerID && convertedPartnerSteamID != user.(models.User).SteamID {
		// 	deleteFile(srv, hostDemoFileID)
		// 	deleteFile(srv, partnerDemoFileID)
		// 	c.JSON(http.StatusOK, models.ErrorResponse(fmt.Sprintf("Partner SteamID from demo and request does not match! Check your submission and try again.\nDemo Partner SteamID: %s\nRequest Partner SteamID: %s", convertedPartnerSteamID, record.PartnerID)))
		// 	return
		// }
		if convertedHostSteamID != user.(models.User).SteamID && convertedPartnerSteamID != user.(models.User).SteamID {
			c.JSON(http.StatusOK, models.ErrorResponse("You are permitted to only upload your own runs!"))
			return
		}
		var checkPartnerSteamID, verifyPartnerSteamID string
		if convertedHostSteamID == user.(models.User).SteamID {
			checkPartnerSteamID = convertedPartnerSteamID
		} else {
			checkPartnerSteamID = convertedHostSteamID
		}
		database.DB.QueryRow("SELECT steam_id FROM users WHERE steam_id = $1", checkPartnerSteamID).Scan(&verifyPartnerSteamID)
		if verifyPartnerSteamID != checkPartnerSteamID {
			c.JSON(http.StatusOK, models.ErrorResponse("Partner SteamID does not match an account on LPHUB."))
			return
		}
		sql := `INSERT INTO records_mp(map_id,score_count,score_time,host_id,partner_id,host_demo_id,partner_demo_id) 
		VALUES($1, $2, $3, $4, $5, $6, $7)`
		_, err := tx.Exec(sql, mapID, hostDemoScoreCount, hostDemoScoreTime, convertedHostSteamID, convertedPartnerSteamID, hostDemoUUID, partnerDemoUUID)
		if err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
	} else {
		sql := `INSERT INTO records_sp(map_id,score_count,score_time,user_id,demo_id) 
		VALUES($1, $2, $3, $4, $5)`
		_, err := tx.Exec(sql, mapID, hostDemoScoreCount, hostDemoScoreTime, user.(models.User).SteamID, hostDemoUUID)
		if err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
	}
	if os.Getenv("ENV") == "DEV" {
		if localPath := os.Getenv("LOCAL_DEMOS_PATH"); localPath != "" {
			for i, header := range demoFileHeaders {
				f, err := header.Open()
				if err != nil {
					c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
					return
				}
				defer f.Close()
				var objectName string
				if i == 0 {
					objectName = hostDemoUUID + ".dem"
				} else if i == 1 {
					objectName = partnerDemoUUID + ".dem"
				}
				demo, err := os.Create(localPath + objectName)
				if err != nil {
					c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
					return
				}
				defer demo.Close()
				_, err = io.Copy(demo, f)
				if err != nil {
					c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
					return
				}
			}
			if err = tx.Commit(); err != nil {
				c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
				return
			}
			c.JSON(http.StatusOK, models.Response{
				Success: true,
				Message: "Successfully created record.",
				Data:    RecordResponse{ScoreCount: hostDemoScoreCount, ScoreTime: hostDemoScoreTime},
			})
			return
		}
	}
	// Everything is good, upload the demo files.
	client, err := b2.NewClient(context.Background(), os.Getenv("B2_KEY_ID"), os.Getenv("B2_API_KEY"))
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	bucket, err := client.Bucket(context.Background(), os.Getenv("B2_BUCKET_NAME"))
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	for i, header := range demoFileHeaders {
		f, err := header.Open()
		if err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
		defer f.Close()
		var objectName string
		if i == 0 {
			objectName = hostDemoUUID + ".dem"
		} else if i == 1 {
			objectName = partnerDemoUUID + ".dem"
		}
		obj := bucket.Object(objectName)
		writer := obj.NewWriter(context.Background())
		defer writer.Close()
		_, err = io.Copy(writer, f)
		if err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
	}
	if err = tx.Commit(); err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, models.Response{
		Success: true,
		Message: "Successfully created record.",
		Data:    RecordResponse{ScoreCount: hostDemoScoreCount, ScoreTime: hostDemoScoreTime},
	})
}

// DELETE Record
//
//	@Description	Delete record with specified map and record id.
//	@Tags			maps / leaderboards
//	@Produce		json
//	@Param			mapid			path		int		true	"Map ID"
//	@Param			recordid		path		int		true	"Record ID"
//	@Param			Authorization	header		string	true	"JWT Token"
//	@Success		200				{object}	models.Response
//	@Router			/maps/{mapid}/record/{recordid} [delete]
func DeleteRecord(c *gin.Context) {
	mapID, err := strconv.Atoi(c.Param("mapid"))
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	recordID, err := strconv.Atoi(c.Param("recordid"))
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	user, _ := c.Get("user")
	// Validate map
	var validateMapID int
	var isCoop bool
	sql := `SELECT m.id, g.is_coop FROM maps m INNER JOIN games g ON m.game_id = g.id
	INNER JOIN chapters c ON m.chapter_id = c.id WHERE m.id = $1`
	err = database.DB.QueryRow(sql, mapID).Scan(&validateMapID, &isCoop)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
		return
	}
	if mapID != validateMapID {
		c.JSON(http.StatusOK, models.ErrorResponse("Selected map does not exist."))
		return
	}
	if isCoop {
		// Validate if cooperative record does exist
		var validateRecordID int
		sql = `SELECT mp.id FROM records_mp mp WHERE mp.id = $1 AND mp.map_id = $2 AND (mp.host_id = $3 OR mp.partner_id = $3) AND is_deleted = false`
		err = database.DB.QueryRow(sql, recordID, mapID, user.(models.User).SteamID).Scan(&validateRecordID)
		if err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
		if recordID != validateRecordID {
			c.JSON(http.StatusOK, models.ErrorResponse("Selected record does not exist."))
			return
		}
		// Remove record
		sql = `UPDATE records_mp SET is_deleted = true WHERE id = $1`
		_, err = database.DB.Exec(sql, recordID)
		if err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
	} else {
		// Validate if singleplayer record does exist
		var validateRecordID int
		sql = `SELECT sp.id FROM records_sp sp WHERE sp.id = $1 AND sp.map_id = $2 AND sp.user_id = $3 AND is_deleted = false`
		err = database.DB.QueryRow(sql, recordID, mapID, user.(models.User).SteamID).Scan(&validateRecordID)
		if err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
		if recordID != validateRecordID {
			c.JSON(http.StatusOK, models.ErrorResponse("Selected record does not exist."))
			return
		}
		// Remove record
		sql = `UPDATE records_sp SET is_deleted = true WHERE id = $1`
		_, err = database.DB.Exec(sql, recordID)
		if err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
	}
	c.JSON(http.StatusOK, models.Response{
		Success: true,
		Message: "Successfully deleted record.",
		Data:    nil,
	})
}

// GET Demo
//
//	@Description	Get demo with specified demo uuid.
//	@Tags			demo
//	@Accept			json
//	@Produce		octet-stream
//	@Param			uuid	query	string	true	"Demo UUID"
//	@Success		200		{file}	binary	"Demo File"
//	@Router			/demos [get]
func DownloadDemoWithID(c *gin.Context) {
	uuid := c.Query("uuid")
	if uuid == "" {
		c.JSON(http.StatusOK, models.ErrorResponse("Invalid id given."))
		return
	}
	var checkedUUID string
	err := database.DB.QueryRow("SELECT d.id FROM demos d WHERE d.id = $1", uuid).Scan(&checkedUUID)
	if err != nil {
		c.JSON(http.StatusOK, models.ErrorResponse("Given id does not match a demo."))
		return
	}

	localPath := ""
	if os.Getenv("ENV") == "DEV" {
		localPath = os.Getenv("LOCAL_DEMOS_PATH")
	}

	fileName := uuid + ".dem"
	if localPath == "" {
		url := os.Getenv("B2_DOWNLOAD_URL") + fileName
		output, err := os.Create(fileName)
		if err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
		defer os.Remove(fileName)
		defer output.Close()
		response, err := http.Get(url)
		if err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
		defer response.Body.Close()
		_, err = io.Copy(output, response.Body)
		if err != nil {
			c.JSON(http.StatusOK, models.ErrorResponse(err.Error()))
			return
		}
	}

	// Downloaded file
	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Transfer-Encoding", "binary")
	c.Header("Content-Disposition", "attachment; filename="+fileName)
	c.Header("Content-Type", "application/octet-stream")

	if localPath == "" {
		c.File(fileName)
	} else {
		c.File(localPath + fileName)
	}

	// c.FileAttachment()
}

// Convert from SteamID64 to Legacy SteamID bits
func convertSteamID(steamID64 int64) int64 {
	return (steamID64 >> 1) & 0x7FFFFFF
}

// Convert from Legacy SteamID bits to SteamID64
func convertSteamID64(steamID string) int64 {
	const baseSteam64ID = 76561197960265728 // Origin of this value remains unclear
	parts := strings.Split(steamID, ":")
	userId, err := strconv.Atoi(parts[2])
	if err != nil {
		return 0
	}
	steam64ID := baseSteam64ID + int64(userId*2) // Reason for multiplication by 2 is unknown
	if parts[1] == "1" {
		steam64ID++
	}
	return steam64ID
}
