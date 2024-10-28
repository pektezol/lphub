import { MapDiscussionCommentContent, MapDiscussionContent, ModMenuContent } from '../types/Content';
import { delete_token, get_token } from './Auth';
import { get_user, get_profile, post_profile } from './User';
import { get_games, get_chapters, get_games_chapters, get_game_maps, get_search } from './Games';
import { get_official_rankings, get_unofficial_rankings } from './Rankings';
import { get_map_summary, get_map_leaderboard, get_map_discussions, get_map_discussion, post_map_discussion, post_map_discussion_comment, delete_map_discussion, post_record, delete_map_record } from './Maps';
import { delete_map_summary, post_map_summary, put_map_image, put_map_summary } from './Mod';
import { UploadRunContent } from '../types/Content';

// add new api call function entries here
// example usage: API.get_games();
export const API = {
  // Auth
  get_token: () => get_token(),
  
  delete_token: () => delete_token(),
  // User
  get_user: (user_id: string) => get_user(user_id),
  get_profile: (token: string) => get_profile(token),
  post_profile: (token: string) => post_profile(token),
  // Games
  get_games: () => get_games(),
  get_chapters: (chapter_id: string) => get_chapters(chapter_id),
  get_games_chapters: (game_id: string) => get_games_chapters(game_id),
  get_game_maps: (game_id: string) => get_game_maps(game_id),
  get_search: (q: string) => get_search(q),
  // Rankings
  get_official_rankings: () => get_official_rankings(),
  get_unofficial_rankings: () => get_unofficial_rankings(),
  // Maps
  get_map_summary: (map_id: string) => get_map_summary(map_id),
  get_map_leaderboard: (map_id: string) => get_map_leaderboard(map_id),
  get_map_discussions: (map_id: string) => get_map_discussions(map_id),
  get_map_discussion: (map_id: string, discussion_id: number) => get_map_discussion(map_id, discussion_id),

  post_map_discussion: (token: string, map_id: string, content: MapDiscussionContent) => post_map_discussion(token, map_id, content),
  post_map_discussion_comment: (token: string, map_id: string, discussion_id: number, comment: string) => post_map_discussion_comment(token, map_id, discussion_id, comment),
  post_record: (token: string, run: UploadRunContent) => post_record(token, run),

  delete_map_discussion: (token: string, map_id: string, discussion_id: number) => delete_map_discussion(token, map_id, discussion_id),

  delete_map_record: (token: string, map_id: number, record_id: number) => delete_map_record(token, map_id, record_id),
  // Mod
  post_map_summary: (token: string, map_id: string, content: ModMenuContent) => post_map_summary(token, map_id, content),
  
  put_map_image: (token: string, map_id: string, image: string) => put_map_image(token, map_id, image),
  put_map_summary: (token: string, map_id: string, content: ModMenuContent) => put_map_summary(token, map_id, content),
  
  delete_map_summary: (token: string, map_id: string, route_id: number) => delete_map_summary(token, map_id, route_id),
};

const BASE_API_URL: string = "/api/v1/"

export function url(path: string): string {
  return BASE_API_URL + path;
};
