import React from "react";
import { Helmet } from "react-helmet";

import GameEntry from "@components/GameEntry";
import { Game } from "@customTypes/Game";
import "@css/Maps.css";

interface GamesProps {
  games: Game[];
}

const Games: React.FC<GamesProps> = ({ games }) => {
  const gameList = Array.isArray(games) ? games : [];

  return (
    <div className='games-page'>
      <Helmet>
        <title>LPHUB | Games</title>
      </Helmet>
      <section>
        <div className='games-page-content'>
          <div className='games-page-item-content'>
            {gameList.map((game) => (
              <GameEntry game={game} key={game.id} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Games;
