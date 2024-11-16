package main

import (
	"encoding/json"
	"io"
	"log"
	"os"
)

func readRecords() []Record {
	recordsFile, err := os.Open("./input/records.json")
	if err != nil {
		log.Fatalln(err.Error())
	}
	defer recordsFile.Close()
	recordFileBytes, err := io.ReadAll(recordsFile)
	if err != nil {
		log.Fatalln(err.Error())
	}
	records := []Record{}
	err = json.Unmarshal(recordFileBytes, &records)
	if err != nil {
		log.Fatalln(err.Error())
	}
	return records
}

func readOverrides() map[string]map[string]int {
	overridesFile, err := os.Open("./input/overrides.json")
	if err != nil {
		log.Fatalln(err.Error())
	}
	defer overridesFile.Close()
	overridesFileBytes, err := io.ReadAll(overridesFile)
	if err != nil {
		log.Fatalln(err.Error())
	}
	overrides := map[string]map[string]int{}
	err = json.Unmarshal(overridesFileBytes, &overrides)
	if err != nil {
		log.Fatalln(err.Error())
	}
	return overrides
}
