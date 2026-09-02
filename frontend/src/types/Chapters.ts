import type { Chapter, Game } from "@customTypes/Game";
import type { Map } from "@customTypes/Map";

export interface GameChapter {
  game: Game;
  chapter: Chapter;
  maps: Map[];
}

export interface GamesChapters {
  game: Game;
  chapters: Chapter[];
}
