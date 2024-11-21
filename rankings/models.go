package main

import (
	"encoding/json"
	"fmt"
	"strconv"
)

type Record struct {
	MapID    int    `json:"id"`
	MapName  string `json:"name"`
	MapMode  int    `json:"mode"`
	MapWR    int    `json:"wr"`
	MapLimit *int   `json:"limit"`
}

type Leaderboard struct {
	Entries LeaderboardEntries `xml:"entries"`
}

func (l *Leaderboard) needsAnotherPage(record *Record) bool {
	if l.Entries.Entry[len(l.Entries.Entry)-1].Score == record.MapWR {
		return true
	} else if record.MapLimit != nil && l.Entries.Entry[len(l.Entries.Entry)-1].Score <= *record.MapLimit {
		return true
	}
	return false
}

type LeaderboardEntries struct {
	Entry []LeaderboardEntry `xml:"entry"`
}

type SteamID int64

func (m SteamID) MarshalJSON() ([]byte, error) {
	return json.Marshal(strconv.FormatInt(int64(m), 10))
}

func (id *SteamID) UnmarshalJSON(data []byte) error {
	var s string
	if err := json.Unmarshal(data, &s); err == nil {
		n, err := strconv.ParseInt(s, 10, 64)
		if err != nil {
			return err
		}
		*id = SteamID(n)
		return nil
	}
	return fmt.Errorf("invalid type for SteamID: %s", data)
}

type LeaderboardEntry struct {
	SteamID SteamID `xml:"steamid"`
	Score   int     `xml:"score"`
}

type Player struct {
	Username          string        `json:"user_name"`
	AvatarLink        string        `json:"avatar_link"`
	SteamID           SteamID       `json:"steam_id"`
	Entries           []PlayerEntry `json:"-"`
	SpScoreCount      int           `json:"sp_score"`
	MpScoreCount      int           `json:"mp_score"`
	OverallScoreCount int           `json:"overall_score"`
	SpRank            int           `json:"sp_rank"`
	MpRank            int           `json:"mp_rank"`
	OverallRank       int           `json:"overall_rank"`
	SpIterations      int           `json:"-"`
	MpIterations      int           `json:"-"`
}

type PlayerEntry struct {
	MapID    int
	MapScore int
}
