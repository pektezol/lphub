import type { UserShort } from "@customTypes/Profile";

export interface Search {
  players: UserShort[];
  maps: SearchMap[];
};

interface SearchMap {
  id: number;
  game_id: number;
  game: string;
  chapter_id: number;
  section_kind: "chapter" | "course" | "mode";
  section_label: string;
  section_name: string;
  map: string;
};
