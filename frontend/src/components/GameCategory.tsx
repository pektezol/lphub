import React from "react";
import { Link } from "react-router-dom";

import { Game, GameCategoryPortals } from "@customTypes/Game";
import "@css/Games.css";

interface GameCategoryProps {
    game: Game;
    cat: GameCategoryPortals;
}

const GameCategory: React.FC<GameCategoryProps> = ({cat, game}) => {
  const sectionPortals = Array.isArray(cat.section_portals) ? cat.section_portals : [];

  if (game.section_kind === "mode") {
    return (
      <div className="games-page-item-body-item games-page-item-body-item-mode">
        <span className='games-page-item-body-item-title'>{cat.category.name}</span>
        <div className="games-page-item-body-item-mode-counts">
          {sectionPortals.map((section) => (
            <span className="games-page-item-body-item-mode-count" key={section.section_id}>
              <span className="games-page-item-body-item-mode-label">{section.section_name.replace(/\s+Mode$/, "")}</span>
              <span className="games-page-item-body-item-mode-num">{section.portal_count}</span>
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Link className="games-page-item-body-item" to={"/games/" + game.id + "?cat=" + cat.category.id}>
      <div>
        <span className='games-page-item-body-item-title'>{cat.category.name}</span>
        <br />
        <span className='games-page-item-body-item-num'>{cat.portal_count}</span>
      </div>
    </Link>
  );
};

export default GameCategory;
