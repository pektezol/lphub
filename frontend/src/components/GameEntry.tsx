import React from "react";
import { Link } from "react-router-dom";

import { Game, GameCategoryPortals } from "@customTypes/Game";

import GameCategory from "@components/GameCategory";
import gamesStyles from "@css/Games.module.css";
import { classNames, cssVariables } from "@css/utils";

interface GameEntryProps {
  game: Game;
}

const GameEntry: React.FC<GameEntryProps> = ({ game }) => {
  const categories: GameCategoryPortals[] = Array.isArray(game.category_portals)
    ? game.category_portals.filter((category) => category?.category)
    : [];

  return (
    <div className={gamesStyles.gamesPageItem}>
      <Link to={"/games/" + game.id} className={gamesStyles.gamesPageItemHeader}>
        <div
          style={cssVariables({ "--background-image": "url(" + game.image + ")" })}
          className={classNames(gamesStyles.gamesPageItemHeaderImg, gamesStyles.gameImage)}
        ></div>
        <span>
          <b>{game.name}</b>
        </span>
      </Link>
      <div id={String(game.id)} className={gamesStyles.gamesPageItemBody}>
        {categories.length > 0 ? (
          categories.map((category) => <GameCategory cat={category} game={game} key={category.category.id} />)
        ) : (
          <span className={gamesStyles.gamesPageItemEmpty}>No categories available yet.</span>
        )}
      </div>
    </div>
  );
};

export default GameEntry;
