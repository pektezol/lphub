import axios from "axios";
import { url } from "./Api";

export interface PortalCountData {
  date: string;
  count: number;
}

export interface RecordsTimelineResponse {
  timeline_singleplayer: PortalCountData[];
  timeline_multiplayer: PortalCountData[];
}

export interface ScoreLog {
  game: {
    id: number;
    name: string;
    image: string;
    is_coop: boolean;
    category_portals: null;
  };
  user: {
    steam_id: string;
    user_name: string;
  };
  map: {
    id: number;
    name: string;
    image: string;
    is_disabled: boolean;
    portal_count: number;
    difficulty: number;
  };
  score_count: number;
  date: string;
}

export async function get_portal_count_history(): Promise<RecordsTimelineResponse | undefined> {
  const response = await axios.get(url("stats/timeline"));
  if (!response.data.data) {
    return undefined;
  }
  return response.data.data;
}

export async function get_recent_scores(): Promise<ScoreLog[]> {
  const response = await axios.get(url("stats/scores"));
  if (!response.data.data) {
    return [];
  }
  return response.data.data.scores.slice(0, 5);
}

