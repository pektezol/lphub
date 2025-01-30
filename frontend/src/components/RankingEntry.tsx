import React from 'react';
import { Link } from 'react-router-dom';
import { RankingType, SteamRankingType } from '@customTypes/Ranking';

enum RankingCategories {
  rankings_overall,
  rankings_multiplayer,
  rankings_singleplayer,
}

interface RankingEntryProps {
  curRankingData: RankingType | SteamRankingType;
  currentLeaderboardType: RankingCategories;
}

const RankingEntry: React.FC<RankingEntryProps> = prop => {
  if ('placement' in prop.curRankingData) {
    return (
      <div className="leaderboard-entry">
        <span>{prop.curRankingData.placement}</span>
        <div>
          <Link to={`/users/${prop.curRankingData.user.steam_id}`}>
            <img
              src={prop.curRankingData.user.avatar_link}
              alt={`${prop.curRankingData.user.user_name}'s profile picture`}
            ></img>
            <span>{prop.curRankingData.user.user_name}</span>
          </Link>
        </div>
        <span>{prop.curRankingData.total_score}</span>
      </div>
    );
  } else {
    return (
      <div className="leaderboard-entry">
        <span>
          {prop.currentLeaderboardType ==
          RankingCategories.rankings_singleplayer
            ? prop.curRankingData.sp_rank
            : prop.currentLeaderboardType ==
                RankingCategories.rankings_multiplayer
              ? prop.curRankingData.mp_rank
              : prop.curRankingData.overall_rank}
        </span>
        <div>
          <Link to={`/users/${prop.curRankingData.steam_id}`}>
            <img src={prop.curRankingData.avatar_link}></img>
            <span>{prop.curRankingData.user_name}</span>
          </Link>
        </div>
        <span>
          {prop.currentLeaderboardType ==
          RankingCategories.rankings_singleplayer
            ? prop.curRankingData.sp_score
            : prop.currentLeaderboardType ==
                RankingCategories.rankings_multiplayer
              ? prop.curRankingData.mp_score
              : prop.curRankingData.overall_score}
        </span>
      </div>
    );
  }
};

export default RankingEntry;
