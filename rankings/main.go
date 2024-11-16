package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/joho/godotenv"
	"github.com/robfig/cron/v3"
)

var useCache = false

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Fatalln("Error loading .env file:", err.Error())
	}

	runNow := false
	for _, arg := range os.Args {
		if arg == "-n" || arg == "--now" {
			runNow = true
			continue
		}
		if arg == "-c" || arg == "--cache" {
			useCache = true
			continue
		}
	}

	useCache = useCache && runNow

	if runNow {
		run()
		return
	}

	c := cron.New()
	_, err = c.AddFunc("0 0 * * *", run)
	if err != nil {
		log.Fatalln("Error scheduling daily reminder:", err.Error())
	}
	c.Start()
	log.Println("ready for jobs")
	sc := make(chan os.Signal, 1)
	signal.Notify(sc, syscall.SIGINT, syscall.SIGTERM, os.Interrupt)
	<-sc
}

func run() {
	log.Println("started job")

	records := readRecords()
	log.Println("loaded", len(records), "records")

	overrides := readOverrides()
	log.Println("loaded", len(overrides), "player overrides")

	players := fetchLeaderboard(records, overrides, useCache)

	spRankings := []*Player{}
	mpRankings := []*Player{}
	overallRankings := []*Player{}

	log.Println("filtering rankings for", len(players), "players")
	filterRankings(&spRankings, &mpRankings, &overallRankings, players)

	log.Println("exporting jsons for", len(players), "players")
	exportAll(spRankings, mpRankings, overallRankings)

	log.Println("done")
}
