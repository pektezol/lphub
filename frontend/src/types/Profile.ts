import type { Pagination } from "@customTypes/Pagination";

export interface UserShort {
  steam_id: string;
  user_name: string;
  avatar_link: string;
}

export interface UserProfile {
  profile: boolean;
  steam_id: string;
  user_name: string;
  avatar_link: string;
  country_code: string;
  titles: UserProfileTitles[];
  links: UserProfileLinks;
  rankings: UserProfileRankings;
  records: UserProfileRecords[];
  pagination: Pagination;
}

interface UserProfileTitles {
  name: string;
  color: string;
}

interface UserProfileLinks {
  p2sr: string;
  steam: string;
  youtube: string;
  twitch: string;
}

interface UserProfileRankings {
  overall: UserProfileRankingsDetail;
  singleplayer: UserProfileRankingsDetail;
  cooperative: UserProfileRankingsDetail;
}

interface UserProfileRecords {
  game_id: number;
  category_id: number;
  map_id: number;
  map_name: string;
  map_wr_count: number;
  placement: number;
  scores: UserProfileRecordsScores[];
}

interface UserProfileRecordsScores {
  record_id: number;
  demo_id: string;
  score_count: number;
  score_time: number;
  date: string;
}

interface UserProfileRankingsDetail {
  rank: number;
  completion_count: number;
  completion_total: number;
}
