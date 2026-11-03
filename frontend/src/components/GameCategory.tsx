import { classNames } from "@css/utils";
import React from "react";
import { Link } from "react-router-dom";

import { Game, GameCategoryPortals } from "@customTypes/Game";

import gamesStyles from "@css/Games.module.css";

interface GameCategoryProps {
    game: Game;
    cat: GameCategoryPortals;
}

const GameCategory: React.FC<GameCategoryProps> = ({cat, game}) => {
  const sectionPortals = Array.isArray(cat.section_portals) ? cat.section_portals : [];

  if (game.section_kind === "mode") {
    return (
      <Link className={classNames(gamesStyles.gamesPageItemBodyItem, gamesStyles.gamesPageItemBodyItemMode)} to={"/games/" + game.id + "?cat=" + cat.category.id}>
        <span className={gamesStyles.gamesPageItemBodyItemTitle}>{cat.category.name}</span>
        <div className={gamesStyles.gamesPageItemBodyItemModeCounts}>
          {sectionPortals.map((section) => (
            <span className={gamesStyles.gamesPageItemBodyItemModeCount} key={section.section_id}>
              <span className={gamesStyles.gamesPageItemBodyItemModeLabel}>{section.section_name.replace(/\s+Mode$/, "")}</span>
              <span className={gamesStyles.gamesPageItemBodyItemModeNum}>{section.portal_count}</span>
            </span>
          ))}
        </div>
      </Link>
    );
  }

  return (
    <Link className={gamesStyles.gamesPageItemBodyItem} to={"/games/" + game.id + "?cat=" + cat.category.id}>
      <div>
        <span className={gamesStyles.gamesPageItemBodyItemTitle}>{cat.category.name}</span>
        <br />
        <span className={gamesStyles.gamesPageItemBodyItemNum}>{cat.portal_count}</span>
      </div>
    </Link>
  );
};

export default GameCategory;
