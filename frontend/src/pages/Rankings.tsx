import React from "react";
import { Helmet } from "react-helmet";

import RankingEntry from "@components/RankingEntry";
import { Ranking, SteamRanking, RankingType, SteamRankingType } from "@customTypes/Ranking";
import { API } from "@api/Api";

import rankingsStyles from "@css/Rankings.module.css";
import appStyles from "../App.module.css";
import { classNames } from "@css/utils";

enum LeaderboardTypes {
  official,
  unofficial
}

enum RankingCategories {
  rankings_overall,
  rankings_multiplayer,
  rankings_singleplayer,
  rankings_mel_story,
  rankings_mel_advanced
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

  if (category === RankingCategories.rankings_mel_story || category === RankingCategories.rankings_mel_advanced) {
    if (!("rankings_mel_story" in rankings)) {
      return [];
    }
    return category === RankingCategories.rankings_mel_story
      ? rankings.rankings_mel_story
      : rankings.rankings_mel_advanced;
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
    if (leaderboardType === LeaderboardTypes.unofficial) {
      setCurrentLeaderboardType(category => category === RankingCategories.rankings_mel_story || category === RankingCategories.rankings_mel_advanced
        ? RankingCategories.rankings_singleplayer
        : category);
    }
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

  React.useEffect(() => {
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
      <section className={classNames(rankingsStyles.navContainer, rankingsStyles.nav1)}>
        <div>
          <button type="button" onClick={() => void fetchRankings(LeaderboardTypes.official)} className={(currentRankingType === LeaderboardTypes.official ? rankingsStyles.selected : "")}>
            <span>Official (LPHUB)</span>
          </button>
          <button type="button" onClick={() => void fetchRankings(LeaderboardTypes.unofficial)} className={(currentRankingType === LeaderboardTypes.unofficial ? rankingsStyles.selected : "")}>
            <span>Unofficial (Steam)</span>
          </button>
        </div>
      </section>
      <section className={classNames(rankingsStyles.navContainer, rankingsStyles.nav2)}>
        <div>
          <button type="button" disabled={categoryControlsDisabled} onClick={() => setCurrentLeaderboardType(RankingCategories.rankings_singleplayer)} className={(currentLeaderboardType === RankingCategories.rankings_singleplayer ? rankingsStyles.selected : "")}>
            <span>Singleplayer</span>
          </button>
          <button type="button" disabled={categoryControlsDisabled} onClick={() => setCurrentLeaderboardType(RankingCategories.rankings_multiplayer)} className={(currentLeaderboardType === RankingCategories.rankings_multiplayer ? rankingsStyles.selected : "")}>
            <span>Cooperative</span>
          </button>
          <button type="button" disabled={categoryControlsDisabled} onClick={() => setCurrentLeaderboardType(RankingCategories.rankings_overall)} className={(currentLeaderboardType === RankingCategories.rankings_overall ? rankingsStyles.selected : "")}>
            <span>Overall</span>
          </button>
          {currentRankingType === LeaderboardTypes.official && <>
            <button type="button" disabled={categoryControlsDisabled} onClick={() => setCurrentLeaderboardType(RankingCategories.rankings_mel_story)} className={(currentLeaderboardType === RankingCategories.rankings_mel_story ? rankingsStyles.selected : "")}>
              <span>Mel (Story)</span>
            </button>
            <button type="button" disabled={categoryControlsDisabled} onClick={() => setCurrentLeaderboardType(RankingCategories.rankings_mel_advanced)} className={(currentLeaderboardType === RankingCategories.rankings_mel_advanced ? rankingsStyles.selected : "")}>
              <span>Mel (Advanced)</span>
            </button>
          </>}
        </div>
      </section>

      <section className={rankingsStyles.rankingsLeaderboard}>
        <div className={rankingsStyles.ranksContainer} aria-busy={isLoading}>
          <div className={classNames(rankingsStyles.leaderboardEntry, rankingsStyles.header, (currentRankingType === LeaderboardTypes.official ? rankingsStyles.hasTime : ""))}>
            <span>Rank</span>
            <span>Player</span>
            <span>Portals</span>
            {currentRankingType === LeaderboardTypes.official && <span>Time</span>}
          </div>

          <div className={rankingsStyles.splitter}></div>

          {isLoading ?
            <div  className={rankingsStyles.centeredLoader}>
              <span className={appStyles.loader}></span>
            </div>
            : hasLoadError ?
              <div className={rankingsStyles.rankingsLoadError} role="alert">
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
