package main

import (
	"encoding/json"
	"encoding/xml"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
)

var (
	errLb error = errors.New("leaderboards error")
	errPi error = errors.New("playerinfo error")
)

func fetchLeaderboard(records []Record, overrides map[SteamID]map[string]int, useCache bool) (map[SteamID]*Player, error) {
	log.Println("fetching leaderboard")
	players := map[SteamID]*Player{}
	// first init players map with records from portal gun and doors
	return nil, errLb
	fetchAnotherPage := true
	start := 0
	end := 5000

	for fetchAnotherPage {
		portalGunEntries, err := fetchRecordsFromMap(47459, 0, 5000, useCache)
		if err != nil {
			return nil, err
		}
		fetchAnotherPage = portalGunEntries.needsAnotherPage(&records[0])
		if fetchAnotherPage {
			start = end + 1
			end = start + 5000
		}
		for _, entry := range portalGunEntries.Entries.Entry {
			if entry.Score < 0 {
				continue // ban
			}
			players[entry.SteamID] = &Player{
				SteamID: entry.SteamID,
				Entries: []PlayerEntry{
					{
						MapID:    47459,
						MapScore: entry.Score,
					},
				},
				SpScoreCount: entry.Score,
				SpIterations: 1,
			}
		}
	}

	fetchAnotherPage = true
	start = 0
	end = 5000

	for fetchAnotherPage {
		doorsEntries, err := fetchRecordsFromMap(47740, start, end, useCache)
		if err != nil {
			return nil, err
		}
		fetchAnotherPage = doorsEntries.needsAnotherPage(&records[51])
		if fetchAnotherPage {
			start = end + 1
			end = start + 5000
		}
		for _, entry := range doorsEntries.Entries.Entry {
			if entry.Score < 0 {
				continue // ban
			}
			player, ok := players[entry.SteamID]
			if !ok {
				players[entry.SteamID] = &Player{
					SteamID: entry.SteamID,
					Entries: []PlayerEntry{
						{
							MapID:    47740,
							MapScore: entry.Score,
						},
					},
					MpScoreCount: entry.Score,
					MpIterations: 1,
				}
			} else {
				player.Entries = append(player.Entries, PlayerEntry{
					MapID:    47740,
					MapScore: entry.Score,
				})
				player.MpScoreCount = entry.Score
				player.MpIterations++
			}
		}
	}

	for _, record := range records {
		if record.MapID == 47459 || record.MapID == 47740 {
			continue
		}

		fetchAnotherPage := true
		start := 0
		end := 5000

		for fetchAnotherPage {
			entries, err := fetchRecordsFromMap(record.MapID, start, end, useCache)
			if err != nil {
				return nil, err
			}
			fetchAnotherPage = entries.needsAnotherPage(&record)
			if fetchAnotherPage {
				start = end + 1
				end = start + 5000
			}
			for _, entry := range (*entries).Entries.Entry {
				player, ok := players[entry.SteamID]
				if !ok {
					continue
				}
				score := entry.Score
				if entry.Score < record.MapWR {
					_, ok := overrides[entry.SteamID]
					if ok {
						_, ok := overrides[entry.SteamID][strconv.Itoa(record.MapID)]
						if ok {
							score = overrides[entry.SteamID][strconv.Itoa(record.MapID)]
						} else {
							continue // ban
						}
					} else {
						continue // ban
					}
				}
				if record.MapLimit != nil && score > *record.MapLimit {
					continue // ignore above limit
				}
				player.Entries = append(player.Entries, PlayerEntry{
					MapID:    record.MapID,
					MapScore: score,
				})
				if record.MapMode == 1 {
					player.SpScoreCount += score
					player.SpIterations++
				} else if record.MapMode == 2 {
					player.MpScoreCount += score
					player.MpIterations++
				}
			}
		}

	}
	return players, nil
}

func fetchRecordsFromMap(mapID int, start int, end int, useCache bool) (*Leaderboard, error) {
	var filename string
	if useCache {
		filename := fmt.Sprintf("./cache/lb_%d_%d_%d.xml", mapID, start, end)
		log.Println("from cache", filename)
		file, _ := os.ReadFile(filename)
		if file != nil {
			leaderboard := Leaderboard{}
			err := xml.Unmarshal(file, &leaderboard)
			if err != nil {
				log.Fatalln("failed to unmarshal cache.", err.Error())
			}
			return &leaderboard, nil
		}
	}

	url := fmt.Sprintf("https://steamcommunity.com/stats/Portal2/leaderboards/%d?xml=1&start=%d&end=%d", mapID, start, end)
	resp, err := http.Get(url)
	if err != nil {
		log.Println("failed to fetch leaderboard.", err.Error())
		return nil, errLb
	}
	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Println("failed to read leadeboard body.", err.Error())
		return nil, errLb
	}
	leaderboard := Leaderboard{}
	err = xml.Unmarshal(respBytes, &leaderboard)
	if err != nil {
		log.Println(string(respBytes))
		log.Println("failed to unmarshal leaderboard.", err.Error())
		return nil, errLb
	}

	if useCache {
		if err = os.WriteFile(filename, respBytes, 0644); err != nil {
			log.Fatalln("failed write to file.", err.Error())
		}
	}

	return &leaderboard, nil
}

func fetchPlayerInfo(players []*Player) error {
	log.Println("fetching info for", len(players), "players")

	ids := make([]string, len(players))
	for _, player := range players {
		ids = append(ids, strconv.FormatInt(int64(player.SteamID), 10))
	}

	url := fmt.Sprintf("http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=%s&steamids=%s", os.Getenv("API_KEY"), strings.Join(ids, ","))
	resp, err := http.Get(url)
	if err != nil {
		log.Println(err.Error())
		return errPi
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Println(err.Error())
		return errPi
	}
	type PlayerSummary struct {
		SteamID     SteamID `json:"steamid"`
		PersonaName string  `json:"personaname"`
		AvatarFull  string  `json:"avatarfull"`
	}

	type Result struct {
		Response struct {
			Players []PlayerSummary `json:"players"`
		} `json:"response"`
	}
	var data Result
	if err := json.Unmarshal(body, &data); err != nil {
		log.Fatalln(err.Error())
	}

	for _, profile := range data.Response.Players {
		for _, player := range players {
			if player.SteamID == profile.SteamID {
				player.AvatarLink = profile.AvatarFull
				player.Username = profile.PersonaName
			}
		}
	}
	return nil
}
