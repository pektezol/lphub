import type { Map } from "@customTypes/Map";

export interface Category {
  id: number;
  name: string;
}

export interface GameCategoryPortals {
  category: Category;
  portal_count: number;
}

export interface Game {
  id: number;
  name: string;
  image: string;
  is_coop: boolean;
  section_kind: "chapter" | "course" | "mode";
  section_label: string;
  categories: Category[];
  category_portals: GameCategoryPortals[];
}

export interface Chapter {
  id: number;
  game_id: number;
  name: string;
  image: string;
  is_disabled: boolean;
  section_kind: "chapter" | "course" | "mode";
  section_label: string;
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
