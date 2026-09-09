import type { Pagination } from "@customTypes/Pagination";

export interface UserShort {
  steam_id: string;
  user_name: string;
  avatar_link: string;
};

export interface UserProfile {
  profile: boolean;
  steam_id: string;
  user_name: string;
  avatar_link: string;
  country_code: string;
  titles: UserProfileTitles[];
  links: UserProfileLinks;
  rankings: UserProfileRankings;
  mode_completions: UserProfileSectionCompletion[];
  records: UserProfileRecords[];
  pagination: Pagination;
};

export interface ProfileStatistics {
  overall: ProfileStatisticsSummary;
  games: ProfileGameStatistics[];
};

export interface ProfileStatisticsSummary {
  maps_played: number;
  maps_available: number;
  minimum_count_matches: number;
  active_submissions: number;
  median_wr_delta: number | null;
  best_portal_total: number;
  first: number;
  second_to_third: number;
  fourth_to_tenth: number;
  eleventh_plus: number;
};

export interface ProfileGameStatistics extends ProfileStatisticsSummary {
  game_id: number;
  game_name: string;
  is_coop: boolean;
};

interface UserProfileTitles {
  name: string;
  color: string;
};

interface UserProfileLinks {
  p2sr: string;
  steam: string;
  youtube: string;
  twitch: string;
};

interface UserProfileRankings {
  overall: UserProfileRankingsDetail;
  singleplayer: UserProfileRankingsDetail;
  cooperative: UserProfileRankingsDetail;
};

interface UserProfileRecords {
  game_id: number;
  game_name: string;
  category_id: number;
  chapter_id: number;
  section_kind: "chapter" | "course" | "mode";
  section_label: string;
  section_name: string;
  map_id: number;
  map_name: string;
  map_wr_count: number;
  placement: number;
  scores: UserProfileRecordsScores[]
};

interface UserProfileRecordsScores {
  record_id: number;
  demo_id: string;
  score_count: number;
  score_time: number;
  date: string;
};

interface UserProfileRankingsDetail {
  rank: number;
  completion_count: number;
  completion_total: number;
};

interface UserProfileSectionCompletion {
  game_id: number;
  game_name: string;
  chapter_id: number;
  section_label: string;
  section_name: string;
  completion_count: number;
  completion_total: number;
};
