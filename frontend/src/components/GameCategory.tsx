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
      className="bg-block text-center w-full rounded-3xl text-foreground transition-colors flex flex-col justify-between p-2"
      to={"/games/" + game.id + "?cat=" + cat.category.id}
    >
      <span className="text-2xl font-barlow-semicondensed-regular">{cat.category.name}</span>
      <br />
      <span className="text-5xl font-barlow-semicondensed-semibold">{cat.portal_count}</span>
    </Link>
  );
};

export default GameCategory;
