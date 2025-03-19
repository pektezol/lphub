import type { Category, GameCategoryPortals } from '@customTypes/Game';
import type { Pagination } from '@customTypes/Pagination';
import type { UserShort } from '@customTypes/Profile';

export interface Map {
  id: number;
  name: string;
  image: string;
  is_disabled: boolean;
  difficulty: number;
  category_portals: GameCategoryPortals[];
};

export interface MapDiscussion {
  discussion: MapDiscussionsDetail;
};

export interface MapDiscussions {
  discussions: MapDiscussionsDetail[];
};

export interface MapDiscussionsDetail {
  id: number;
  title: string;
  content: string;
  creator: UserShort;
  comments: MapDiscussionDetailComment[];
  created_at: string;
  updated_at: string;
};

interface MapDiscussionDetailComment {
  comment: string;
  date: string;
  user: UserShort;
};

export interface MapLeaderboard {
  map: MapSummaryMap;
  records: MapLeaderboardRecordSingleplayer[] | MapLeaderboardRecordMultiplayer[];
  pagination: Pagination;
};

export interface MapLeaderboardRecordSingleplayer {
  kind: "singleplayer";
  placement: number;
  record_id: number;
  score_count: number;
  score_time: number;
  user: UserShort;
  demo_id: string;
  record_date: string;
};

export interface MapLeaderboardRecordMultiplayer {
  kind: "multiplayer";
  placement: number;
  record_id: number;
  score_count: number;
  score_time: number;
  host: UserShort;
  partner: UserShort;
  host_demo_id: string;
  partner_demo_id: string;
  record_date: string;
};


export interface MapSummary {
  map: MapSummaryMap;
  summary: MapSummaryDetails;
};

interface MapSummaryMap {
  id: number;
  image: string;
  chapter_name: string;
  game_name: string;
  map_name: string;
  is_coop: boolean;
  is_disabled: boolean;
  difficulty: number;
};

interface MapSummaryDetails {
  routes: MapSummaryDetailsRoute[];
};

interface MapSummaryDetailsRoute {
  route_id: number;
  category: Category;
  history: MapSummaryDetailsRouteHistory;
  rating: number;
  completion_count: number;
  description: string;
  showcase: string;
};

interface MapSummaryDetailsRouteHistory {
  runner_name: string;
  score_count: number;
  date: string;
};

export interface MapDeleteEndpoint {
  map_id: number;
  record_id: number;
}

