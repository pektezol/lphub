import type { Game } from '@customTypes/Game';
import type { Map } from '@customTypes/Map';

interface Chapter {
  id: number;
  name: string;
  image: string;
  is_disabled: boolean;
}

export interface GameChapter {
  chapter: Chapter;
  maps: Map[];
}

export interface GamesChapters {
  game: Game;
  chapters: Chapter[];
}
