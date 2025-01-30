import React from "react";
import { Link } from "react-router-dom";

import { Game, GameCategoryPortals } from "@customTypes/Game";
import "@css/Games.css";

interface GameCategoryProps {
  game: Game;
  cat: GameCategoryPortals;
}

const GameCategory: React.FC<GameCategoryProps> = ({ cat, game }) => {
  return (
    <Link
      className="games-page-item-body-item"
      to={"/games/" + game.id + "?cat=" + cat.category.id}
    >
      <div>
        <span className="games-page-item-body-item-title">
          {cat.category.name}
        </span>
        <br />
        <span className="games-page-item-body-item-num">
          {cat.portal_count}
        </span>
      </div>
    </Link>
  );
};

export default GameCategory;
