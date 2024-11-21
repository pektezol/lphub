package main

import (
	"log"
	"math"
	"sort"
)

func filterRankings(spRankings, mpRankings, overallRankings *[]*Player, players map[SteamID]*Player) {
	for k, p := range players {
		if p.SpIterations == 51 {
			*spRankings = append(*spRankings, p)
		}
		if p.MpIterations == 48 {
			*mpRankings = append(*mpRankings, p)
		}
		if p.SpIterations == 51 && p.MpIterations == 48 {
			p.OverallScoreCount = p.SpScoreCount + p.MpScoreCount
			*overallRankings = append(*overallRankings, p)
		}
		if p.SpIterations < 51 && p.MpIterations < 48 {
			delete(players, k)
		}
	}

	log.Println("getting player summaries for", len(players), "players")

	for _, chunk := range chunkMap(players, 100) {
		fetchPlayerInfo(chunk)
	}

	log.Println("sorting the ranks")
	sort.Slice(*spRankings, func(i, j int) bool {
		a := (*spRankings)[i]
		b := (*spRankings)[j]
		if a.SpScoreCount == b.SpScoreCount {
			return a.SteamID < b.SteamID
		}
		return a.SpScoreCount < b.SpScoreCount
	})

	rank := 1
	offset := 0

	for idx := 0; idx < len(*spRankings); idx++ {
		if idx == 0 {
			(*spRankings)[idx].SpRank = rank
			continue
		}
		if (*spRankings)[idx-1].SpScoreCount != (*spRankings)[idx].SpScoreCount {
			rank = rank + offset + 1
			offset = 0
		} else {
			offset++
		}
		(*spRankings)[idx].SpRank = rank
	}

	sort.Slice(*mpRankings, func(i, j int) bool {
		a := (*mpRankings)[i]
		b := (*mpRankings)[j]
		if a.MpScoreCount == b.MpScoreCount {
			return a.SteamID < b.SteamID
		}
		return a.MpScoreCount < b.MpScoreCount
	})

	rank = 1
	offset = 0

	for idx := 0; idx < len(*mpRankings); idx++ {
		if idx == 0 {
			(*mpRankings)[idx].MpRank = rank
			continue
		}
		if (*mpRankings)[idx-1].MpScoreCount != (*mpRankings)[idx].MpScoreCount {
			rank = rank + offset + 1
			offset = 0
		} else {
			offset++
		}
		(*mpRankings)[idx].MpRank = rank
	}

	sort.Slice(*overallRankings, func(i, j int) bool {
		a := (*overallRankings)[i]
		b := (*overallRankings)[j]
		if a.OverallScoreCount == b.OverallScoreCount {
			return a.SteamID < b.SteamID
		}
		return a.OverallScoreCount < b.OverallScoreCount
	})

	rank = 1
	offset = 0

	for idx := 0; idx < len(*overallRankings); idx++ {
		if idx == 0 {
			(*overallRankings)[idx].OverallRank = rank
			continue
		}
		if (*overallRankings)[idx-1].OverallScoreCount != (*overallRankings)[idx].OverallScoreCount {
			rank = rank + offset + 1
			offset = 0
		} else {
			offset++
		}
		(*overallRankings)[idx].OverallRank = rank
	}
}

func chunkMap[T any, K comparable](m map[K]*T, chunkSize int) [][]*T {
	chunks := make([][]*T, 0, int(math.Ceil(float64(len(m))/float64(chunkSize))))
	chunk := make([]*T, 0, chunkSize)

	count := 0
	for _, player := range m {
		chunk = append(chunk, player)
		count++

		if count == chunkSize {
			chunks = append(chunks, chunk)
			chunk = make([]*T, 0, chunkSize)
			count = 0
		}
	}

	if len(chunk) > 0 {
		chunks = append(chunks, chunk)
	}

	return chunks
}
