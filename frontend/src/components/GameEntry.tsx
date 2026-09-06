import React from "react";
import { Link } from "react-router-dom";

import { Game, GameCategoryPortals } from "@customTypes/Game";
import "@css/Games.css";
import GameCategory from "@components/GameCategory";

interface GameEntryProps {
  game: Game;
}

const GameEntry: React.FC<GameEntryProps> = ({ game }) => {
  const categories: GameCategoryPortals[] = Array.isArray(game.category_portals)
    ? game.category_portals.filter((category) => category?.category)
    : [];

  return (
    <div className='games-page-item'>
      <Link to={"/games/" + game.id} className='games-page-item-header'>
        <div style={{ backgroundImage: "url(" + game.image + ")" }} className='games-page-item-header-img'></div>
        <span><b>{game.name}</b></span>
      </Link>
      <div id={String(game.id)} className='games-page-item-body'>
        {categories.length > 0 ? (
          categories.map((category) => (
            <GameCategory cat={category} game={game} key={category.category.id} />
          ))
        ) : (
          <span className='games-page-item-empty'>No categories available yet.</span>
        )}
      </div>
    </div>
  );
};

export default GameEntry;
