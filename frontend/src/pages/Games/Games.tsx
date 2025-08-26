import React from "react";
import { Helmet } from "react-helmet";

import GameEntry from "@components/GameEntry.tsx";
import { Game } from "@customTypes/Game.ts";
import BreadcrumbNav from "@components/BreadcrumbNav/BreadcrumbNav";

interface GamesProps {
  games: Game[];
}

const Games: React.FC<GamesProps> = ({ games }) => {
  return (
    <div>
      <Helmet>
        <title>LPHUB | Games</title>
      </Helmet>

      <section className="px-12 pt-8 w-full">
        <h1 className="text-3xl mb-8">Games</h1>
        <div className="flex flex-col w-full">
          {games.map((game, index) => (
            <GameEntry game={game} key={index} />
          ))}
        </div>
      </section>
    </div>
  );
};

export default Games;
