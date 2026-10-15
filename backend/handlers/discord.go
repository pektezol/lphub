package handlers

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"hash/fnv"
	"io"
	"log"
	"mime"
	"mime/multipart"
	"net/http"
	"os"
	"strings"
	"time"

	"database/sql"
)

const (
	discordRecordWebhookEnv = "DISCORD_RECORD_WEBHOOK_URL"
	siteBaseURL             = "https://lp.portal2.sr"
	defaultRecordColor      = 0x5865F2
	portalRecordColor       = 0x57F287
	timeRecordColor         = 0x3498DB
)

type discordWebhookPayload struct {
	Username        string         `json:"username"`
	AvatarURL       string         `json:"avatar_url"`
	Embeds          []discordEmbed `json:"embeds"`
	AllowedMentions struct {
		Parse []string `json:"parse"`
	} `json:"allowed_mentions"`
}

type discordEmbed struct {
	Title       string              `json:"title"`
	URL         string              `json:"url"`
	Description string              `json:"description"`
	Thumbnail   *discordEmbedImage  `json:"thumbnail,omitempty"`
	Color       int                 `json:"color"`
	Fields      []discordEmbedField `json:"fields"`
}

type discordEmbedImage struct {
	URL string `json:"url"`
}

type discordEmbedField struct {
	Name   string `json:"name"`
	Value  string `json:"value"`
	Inline bool   `json:"inline"`
}

type recordRankResult struct {
	UniqueFirst         bool
	HasPrevious         bool
	PreviousPortalCount int
	PreviousScoreTicks  int
}

type rankOneRecordNotification struct {
	mapID           int
	mapTitle        string
	mapImage        string
	isCoop          bool
	hostSteamID     string
	hostUserName    string
	partnerSteamID  string
	partnerUserName string
	portalCount     int
	scoreTicks      int
	rank            recordRankResult
}

func formatRecordMapTitle(mapName, mapMode string) string {
	if mapMode == "Advanced Mode" {
		return "Advanced " + mapName
	}
	return mapName
}

func (notification *rankOneRecordNotification) send(ctx context.Context) {
	sendRankOneRecordNotification(
		ctx,
		notification.mapID,
		notification.mapTitle,
		notification.mapImage,
		notification.isCoop,
		notification.hostSteamID,
		notification.hostUserName,
		notification.partnerSteamID,
		notification.partnerUserName,
		notification.portalCount,
		notification.scoreTicks,
		notification.rank,
	)
}

func recordIsUniqueRankOne(ctx context.Context, tx *sql.Tx, mapID int, isCoop bool, recordID, scoreCount, scoreTime int) (recordRankResult, error) {
	if strings.TrimSpace(os.Getenv(discordRecordWebhookEnv)) == "" {
		return recordRankResult{}, nil
	}

	hasher := fnv.New64a()
	_, _ = hasher.Write([]byte(fmt.Sprintf("rank1:%d", mapID)))
	if _, err := tx.ExecContext(ctx, `SELECT pg_advisory_xact_lock($1)`, int64(hasher.Sum64())); err != nil {
		return recordRankResult{}, err
	}

	table := "records_sp"
	if isCoop {
		table = "records_mp"
	}
	var rank recordRankResult
	previousQuery := fmt.Sprintf(`SELECT score_count, score_time FROM %s
		WHERE map_id = $1 AND id <> $2 AND is_deleted = false
		ORDER BY score_count, score_time LIMIT 1`, table)
	err := tx.QueryRowContext(ctx, previousQuery, mapID, recordID).Scan(&rank.PreviousPortalCount, &rank.PreviousScoreTicks)
	if err == nil {
		rank.HasPrevious = true
	} else if err != sql.ErrNoRows {
		return recordRankResult{}, err
	}

	query := fmt.Sprintf(`SELECT NOT EXISTS (
		SELECT 1 FROM %s
		WHERE map_id = $1 AND id <> $2 AND is_deleted = false
			AND (score_count < $3 OR (score_count = $3 AND score_time <= $4))
	)`, table)
	err = tx.QueryRowContext(ctx, query, mapID, recordID, scoreCount, scoreTime).Scan(&rank.UniqueFirst)
	return rank, err
}

func sendRankOneRecordNotification(ctx context.Context, mapID int, mapTitle, mapImage string, isCoop bool, hostSteamID, hostUserName, partnerSteamID, partnerUserName string, portalCount, scoreTicks int, rank recordRankResult) {
	webhookURL := strings.TrimSpace(os.Getenv(discordRecordWebhookEnv))
	if webhookURL == "" {
		return
	}

	players := fmt.Sprintf("[%s](%s/users/%s)", escapeDiscordMarkdown(hostUserName), siteBaseURL, hostSteamID)
	if isCoop {
		players += fmt.Sprintf(" & [%s](%s/users/%s)", escapeDiscordMarkdown(partnerUserName), siteBaseURL, partnerSteamID)
	}

	portalText := fmt.Sprintf("%d", portalCount)
	timeText := formatRecordTime(scoreTicks)
	embedColor := defaultRecordColor
	if rank.HasPrevious {
		portalDelta := portalCount - rank.PreviousPortalCount
		timeDeltaSeconds := float64(scoreTicks-rank.PreviousScoreTicks) / 60.0
		if portalDelta != 0 {
			portalText = fmt.Sprintf("%s (%+d)", portalText, portalDelta)
		}
		if portalDelta == 0 && scoreTicks != rank.PreviousScoreTicks {
			timeText = fmt.Sprintf("%s (%+.2f)", timeText, timeDeltaSeconds)
		}
		if portalDelta < 0 {
			embedColor = portalRecordColor
		} else if portalDelta == 0 && scoreTicks < rank.PreviousScoreTicks {
			embedColor = timeRecordColor
		}
	}

	payload := discordWebhookPayload{
		Username:  "lp.portal2.sr",
		AvatarURL: siteBaseURL + "/logo.png",
		Embeds: []discordEmbed{{
			Title:       mapTitle,
			URL:         fmt.Sprintf("%s/maps/%d", siteBaseURL, mapID),
			Description: players,
			Color:       embedColor,
			Fields: []discordEmbedField{
				{Name: "Portals", Value: portalText, Inline: true},
				{Name: "Time", Value: timeText, Inline: true},
			},
		}},
	}
	payload.AllowedMentions.Parse = []string{}
	thumbnailURL, imageFilename, imageData := mapThumbnail(mapImage)
	if thumbnailURL != "" {
		payload.Embeds[0].Thumbnail = &discordEmbedImage{URL: thumbnailURL}
	}

	body, err := json.Marshal(payload)
	if err != nil {
		log.Printf("discord rank-one notification: encode payload: %v", err)
		return
	}
	var requestBody io.Reader = bytes.NewReader(body)
	contentType := "application/json"
	if len(imageData) > 0 {
		var multipartBody bytes.Buffer
		writer := multipart.NewWriter(&multipartBody)
		payloadField, err := writer.CreateFormField("payload_json")
		if err == nil {
			_, err = payloadField.Write(body)
		}
		if err == nil {
			var imageField io.Writer
			imageField, err = writer.CreateFormFile("files[0]", imageFilename)
			if err == nil {
				_, err = imageField.Write(imageData)
			}
		}
		if err == nil {
			err = writer.Close()
		}
		if err != nil {
			log.Printf("discord rank-one notification: create image attachment: %v", err)
			return
		}
		requestBody = &multipartBody
		contentType = writer.FormDataContentType()
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, webhookURL, requestBody)
	if err != nil {
		log.Printf("discord rank-one notification: create request: %v", err)
		return
	}
	request.Header.Set("Content-Type", contentType)
	response, err := (&http.Client{Timeout: 5 * time.Second}).Do(request)
	if err != nil {
		log.Printf("discord rank-one notification: send webhook: %v", err)
		return
	}
	defer response.Body.Close()
	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		log.Printf("discord rank-one notification: webhook returned status %s", response.Status)
	}
}

func mapThumbnail(mapImage string) (thumbnailURL, filename string, imageData []byte) {
	if strings.HasPrefix(mapImage, "http://") || strings.HasPrefix(mapImage, "https://") {
		return mapImage, "", nil
	}
	if !strings.HasPrefix(mapImage, "data:") {
		return "", "", nil
	}

	header, encodedData, found := strings.Cut(strings.TrimPrefix(mapImage, "data:"), ",")
	if !found {
		return "", "", nil
	}
	if !strings.HasSuffix(header, ";base64") {
		return "", "", nil
	}
	mediaType, _, err := mime.ParseMediaType(strings.TrimSuffix(header, ";base64"))
	if err != nil || mediaType != "image/jpeg" {
		return "", "", nil
	}
	imageData, err = base64.StdEncoding.DecodeString(encodedData)
	if err != nil || len(imageData) == 0 {
		return "", "", nil
	}

	filename = "map-image.jpg"
	return "attachment://" + filename, filename, imageData
}

func formatRecordTime(ticks int) string {
	if ticks < 0 {
		ticks = 0
	}
	totalMilliseconds := (ticks*1000 + 30) / 60
	minutes := totalMilliseconds / 60000
	seconds := (totalMilliseconds / 1000) % 60
	milliseconds := totalMilliseconds % 1000
	if minutes == 0 {
		return fmt.Sprintf("%d.%03d", seconds, milliseconds)
	}
	return fmt.Sprintf("%d:%02d.%03d", minutes, seconds, milliseconds)
}

func escapeDiscordMarkdown(value string) string {
	for _, character := range []string{"\\", "`", "*", "_", "{", "}", "[", "]", "(", ")", "#", "+", "-", ".", "!", "|", ">"} {
		value = strings.ReplaceAll(value, character, "\\"+character)
	}
	return value
}
