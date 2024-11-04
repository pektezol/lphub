import axios from "axios";
import { url } from "@api/Api";
import { GameChapter, GamesChapters } from "@customTypes/Chapters";
import { Game } from "@customTypes/Game";
import { Map } from "@customTypes/Map";
import { Search } from "@customTypes/Search";

export const get_games = async (): Promise<Game[]> => {
  const response = await axios.get(url(`games`))
  return response.data.data;
};

export const get_chapters = async (chapter_id: string): Promise<GameChapter> => {
  const response = await axios.get(url(`chapters/${chapter_id}`));
  return response.data.data;
}

export const get_games_chapters = async (game_id: string): Promise<GamesChapters> => {
  const response = await axios.get(url(`games/${game_id}`));
  return response.data.data;
};

export const get_game_maps = async (game_id: string): Promise<Map[]> => {
  const response = await axios.get(url(`games/${game_id}/maps`))
  return response.data.data.maps;
};

export const get_search = async (q: string): Promise<Search> => {
  const response = await axios.get(url(`search?q=${q}`))
  return response.data.data;
};
