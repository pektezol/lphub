import React from "react";
import { Helmet } from "react-helmet";

import GameEntry from "@components/GameEntry.tsx";
import { Game } from "@customTypes/Game.ts";

interface GamesProps {
  games: Game[];
}

const Games: React.FC<GamesProps> = ({ games }) => {
  return (
    <div className="ml-20 min-h-screen text-foreground font-[--font-barlow-semicondensed-regular] overflow-y-auto scrollbar-thin">
      <Helmet>
        <title>LPHUB | Games</title>
      </Helmet>
      <section className="py-12 px-12 w-full">
        <h1 className="text-3xl font-bold mb-8">Games</h1>
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
