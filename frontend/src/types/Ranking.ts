import type { UserShort } from "@customTypes/Profile";

export interface RankingType {
  placement: number;
  user: UserShort;
  total_score: number;
}

export interface SteamRankingType {
  user_name: string;
  avatar_link: string;
  steam_id: string;
  sp_score: number;
  mp_score: number;
  overall_score: number;
  sp_rank: number;
  mp_rank: number;
  overall_rank: number;
}

export interface Ranking {
  rankings_overall: RankingType[];
  rankings_singleplayer: RankingType[];
  rankings_multiplayer: RankingType[];
}

export interface SteamRanking {
  rankings_overall: SteamRankingType[];
  rankings_singleplayer: SteamRankingType[];
  rankings_multiplayer: SteamRankingType[];
}
