package main

import (
	"encoding/json"
	"log"
	"os"
)

func exportAll(spRankings, mpRankings, overallRankings []*Player) {
	err := os.Mkdir("./output", 0775)
	if err != nil && !os.IsExist(err) {
		log.Fatalln(err.Error())
	}

	sp, err := os.Create("./output/sp.json")
	if err != nil {
		log.Fatalln(err.Error())
	}

	spRankingsOut, _ := json.Marshal(spRankings)
	sp.Write(spRankingsOut)
	sp.Close()
	mp, _ := os.Create("./output/mp.json")
	mpRankingsOut, _ := json.Marshal(mpRankings)
	mp.Write(mpRankingsOut)
	mp.Close()
	overall, _ := os.Create("./output/overall.json")
	overallRankingsOut, _ := json.Marshal(overallRankings)
	overall.Write(overallRankingsOut)
	overall.Close()
}
