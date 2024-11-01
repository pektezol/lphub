package main

import (
	"log"
	"sort"
)

func filterRankings(spRankings, mpRankings, overallRankings *[]*Player, players *map[string]*Player) {
	for k, p := range *players {
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
			delete(*players, k)
		}
	}

	log.Println("getting player summaries")
	for _, v := range *players {
		fetchPlayerInfo(v)
	}

	log.Println("sorting the ranks")
	sort.Slice(*spRankings, func(i, j int) bool {
		return (*spRankings)[i].SpScoreCount < (*spRankings)[j].SpScoreCount
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
		return (*mpRankings)[i].MpScoreCount < (*mpRankings)[j].MpScoreCount
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
		return (*overallRankings)[i].OverallScoreCount < (*overallRankings)[j].OverallScoreCount
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
