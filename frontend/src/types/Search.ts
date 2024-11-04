import type { UserShort } from "@customTypes/Profile";

export interface Search {
  players: UserShort[];
  maps: SearchMap[];
};

interface SearchMap {
  id: number;
  game: string;
  chapter: string;
  map: string;
};
