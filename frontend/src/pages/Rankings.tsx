import React, { useEffect } from "react";
import { Helmet } from "react-helmet";

import RankingEntry from "@components/RankingEntry";
import { Ranking, SteamRanking, RankingType, SteamRankingType } from "@customTypes/Ranking";
import { API } from "@api/Api";

import "@css/Rankings.css";

enum LeaderboardTypes {
  official,
  unofficial
}

enum RankingCategories {
  rankings_overall,
  rankings_multiplayer,
  rankings_singleplayer
}

const getLeaderboardForCategory = (
  rankings: Ranking | SteamRanking,
  category: RankingCategories
): RankingType[] | SteamRankingType[] => {
  if (category === RankingCategories.rankings_singleplayer) {
    return rankings.rankings_singleplayer;
  }

  if (category === RankingCategories.rankings_multiplayer) {
    return rankings.rankings_multiplayer;
  }

  return rankings.rankings_overall;
};

const Rankings: React.FC = () => {
  const [leaderboardData, setLeaderboardData] = React.useState<Ranking | SteamRanking>();
  const [currentRankingType, setCurrentRankingType] = React.useState<LeaderboardTypes>(LeaderboardTypes.official);
  const [currentLeaderboardType, setCurrentLeaderboardType] = React.useState<RankingCategories>(RankingCategories.rankings_singleplayer);
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasLoadError, setHasLoadError] = React.useState(false);
  const requestId = React.useRef(0);

  const fetchRankings = React.useCallback(async (leaderboardType: LeaderboardTypes) => {
    const currentRequestId = ++requestId.current;

    setCurrentRankingType(leaderboardType);
    setIsLoading(true);
    setHasLoadError(false);

    try {
      const rankings = leaderboardType === LeaderboardTypes.official
        ? await API.get_official_rankings()
        : await API.get_unofficial_rankings();

      if (currentRequestId !== requestId.current) {
        return;
      }

      setLeaderboardData(rankings);
    } catch (error) {
      if (currentRequestId !== requestId.current) {
        return;
      }

      console.error("Unable to fetch rankings:", error);
      setLeaderboardData(undefined);
      setHasLoadError(true);
    } finally {
      if (currentRequestId === requestId.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchRankings(LeaderboardTypes.official);

    return () => {
      requestId.current += 1;
    };
  }, [fetchRankings]);

  const currentLeaderboard = leaderboardData === undefined
    ? undefined
    : getLeaderboardForCategory(leaderboardData, currentLeaderboardType);
  const categoryControlsDisabled = isLoading || leaderboardData === undefined;

  return (
    <main>
      <Helmet>
        <title>LPHUB | Rankings</title>
      </Helmet>
      <section className="nav-container nav-1">
        <div>
          <button type="button" onClick={() => void fetchRankings(LeaderboardTypes.official)} className={`nav-1-btn ${currentRankingType === LeaderboardTypes.official ? "selected" : ""}`}>
            <span>Official (LPHUB)</span>
          </button>
          <button type="button" onClick={() => void fetchRankings(LeaderboardTypes.unofficial)} className={`nav-1-btn ${currentRankingType === LeaderboardTypes.unofficial ? "selected" : ""}`}>
            <span>Unofficial (Steam)</span>
          </button>
        </div>
      </section>
      <section className="nav-container nav-2">
        <div>
          <button type="button" disabled={categoryControlsDisabled} onClick={() => setCurrentLeaderboardType(RankingCategories.rankings_singleplayer)} className={`nav-2-btn ${currentLeaderboardType === RankingCategories.rankings_singleplayer ? "selected" : ""}`}>
            <span>Singleplayer</span>
          </button>
          <button type="button" disabled={categoryControlsDisabled} onClick={() => setCurrentLeaderboardType(RankingCategories.rankings_multiplayer)} className={`nav-2-btn ${currentLeaderboardType === RankingCategories.rankings_multiplayer ? "selected" : ""}`}>
            <span>Cooperative</span>
          </button>
          <button type="button" disabled={categoryControlsDisabled} onClick={() => setCurrentLeaderboardType(RankingCategories.rankings_overall)} className={`nav-2-btn ${currentLeaderboardType === RankingCategories.rankings_overall ? "selected" : ""}`}>
            <span>Overall</span>
          </button>
        </div>
      </section>

      <section className="rankings-leaderboard">
        <div className="ranks-container" aria-busy={isLoading}>
          <div className="leaderboard-entry header">
            <span>Rank</span>
            <span>Player</span>
            <span>Portals</span>
          </div>

          <div className="splitter"></div>

          {isLoading ?
            <div style={{ display: "flex", justifyContent: "center", margin: "30px 0px" }}>
              <span className="loader"></span>
            </div>
            : hasLoadError ?
              <div className="rankings-load-error" role="alert">
                Unable to load rankings. Please try again.
              </div>
              : currentLeaderboard?.map((curRankingData, i) => {
                return <RankingEntry currentLeaderboardType={currentLeaderboardType} curRankingData={curRankingData} key={i}></RankingEntry>;
              })
          }
        </div>
      </section>
    </main>
  );
};

export default Rankings;
