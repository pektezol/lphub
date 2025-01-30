import type { Map } from '@customTypes/Map';

export interface Game {
  id: number;
  name: string;
  image: string;
  is_coop: boolean;
  category_portals: GameCategoryPortals[];
}

export interface GameChapters {
  game: Game;
  chapters: Chapter[];
}

export interface GameMaps {
  game: Game;
  maps: Map[];
}

export interface Category {
  id: number;
  name: string;
}

interface Chapter {
  id: number;
  name: string;
  image: string;
  is_disabled: boolean;
}

export interface GameCategoryPortals {
  category: Category;
  portal_count: number;
}
