import React from "react";
import { Helmet } from "react-helmet";

import GameEntry from "@components/GameEntry";
import { Game } from "@customTypes/Game";

import gamesStyles from "@css/Games.module.css";

interface GamesProps {
  games: Game[];
}

const Games: React.FC<GamesProps> = ({ games }) => {
  const gameList = Array.isArray(games) ? games : [];

  return (
    <div className={gamesStyles.gamesPage}>
      <Helmet>
        <title>LPHUB | Games</title>
      </Helmet>
      <section>
        <div>
          <div className={gamesStyles.gamesPageItemContent}>
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
