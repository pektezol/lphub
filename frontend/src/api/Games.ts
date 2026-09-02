import axios from "axios";
import { url } from "@api/Api";
import { GameChapter, GamesChapters } from "@customTypes/Chapters";
import { Game } from "@customTypes/Game";
import { Map } from "@customTypes/Map";
import { Search } from "@customTypes/Search";

export const get_games = async (): Promise<Game[]> => {
  const response = await axios.get(url("games"));
  const games = response.data?.data;

  if (!Array.isArray(games)) {
    return [];
  }

  return games.map((game) => ({
    ...game,
    category_portals: Array.isArray(game?.category_portals)
      ? game.category_portals
      : [],
  }));
};

export const get_chapters = async (chapter_id: string): Promise<GameChapter> => {
  const response = await axios.get(url(`chapters/${chapter_id}`));
  return response.data.data;
};

export const get_games_chapters = async (game_id: string): Promise<GamesChapters> => {
  const response = await axios.get(url(`games/${game_id}`));
  return response.data.data;
};

export const get_game_maps = async (game_id: string): Promise<Map[]> => {
  const response = await axios.get(url(`games/${game_id}/maps`));
  return response.data.data.maps;
};

export const get_search = async (q: string, signal?: AbortSignal): Promise<Search> => {
  const response = await axios.get(url("search"), {
    params: { q },
    signal,
  });
  return response.data.data;
};
