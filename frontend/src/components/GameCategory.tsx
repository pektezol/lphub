import React from "react";
import { Link } from "react-router-dom";

import { Game, GameCategoryPortals } from "@customTypes/Game";

interface GameCategoryProps {
  game: Game;
  cat: GameCategoryPortals;
}

const GameCategory: React.FC<GameCategoryProps> = ({ cat, game }) => {
  return (
    <Link
      className="bg-surface text-center w-full h-[100px] rounded-3xl text-foreground m-3 hover:bg-surface1 transition-colors flex flex-col justify-between p-4"
      to={"/games/" + game.id + "?cat=" + cat.category.id}
    >
      <p className="text-3xl font-semibold">{cat.category.name}</p>
      <br />
      <p className="font-bold text-4xl">{cat.portal_count}</p>
    </Link>
  );
};

export default GameCategory;
