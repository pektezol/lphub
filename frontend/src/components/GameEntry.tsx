import React from "react";
import { Link } from "react-router-dom";

import { Game } from "@customTypes/Game";
import "@css/Games.css";
import GameCategory from "@components/GameCategory";

interface GameEntryProps {
  game: Game;
}

const GameEntry: React.FC<GameEntryProps> = ({ game }) => (
  <div className='games-page-item'>
    <Link to={"/games/" + game.id}>
      <div className='games-page-item-header'>
        <div style={{ backgroundImage: "url(" + game.image + ")" }} className='games-page-item-header-img'></div>
        <span><b>{game.name}</b></span>
      </div>
    </Link>
    <div id={String(game.id)} className='games-page-item-body'>
      {game.section_kind === "mode" ? (
        <Link className="games-page-item-body-item" to={"/games/" + game.id}>
          <div>
            <span className='games-page-item-body-item-title'>Choose a {game.section_label}</span>
          </div>
        </Link>
      ) : (
        game.category_portals.map((category) => (
          <GameCategory cat={category} game={game} key={category.category.id} />
        ))
      )}
    </div>
  </div>
);

export default GameEntry;
