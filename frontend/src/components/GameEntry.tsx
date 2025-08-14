import React from "react";
import { Link } from "react-router-dom";

import { Game, GameCategoryPortals } from "@customTypes/Game";

import GameCategory from "@components/GameCategory";

interface GameEntryProps {
  game: Game;
}

const GameEntry: React.FC<GameEntryProps> = ({ game }) => {
  const [catInfo, setCatInfo] = React.useState<GameCategoryPortals[]>([]);

  React.useEffect(() => {
    setCatInfo(game.category_portals);
  }, [game.category_portals]);

  return (
    <Link to={"/games/" + game.id} className="w-full">
      <div className="w-full h-64 bg-mantle rounded-3xl overflow-hidden my-6">
        <div className="w-full h-1/2 bg-cover overflow-hidden relative">
          <div
            style={{ backgroundImage: `url(${game.image})` }}
            className="w-full h-full backdrop-blur-sm blur-sm bg-cover"
          ></div>
          <span className="absolute inset-0 flex justify-center items-center">
            <b className="text-[56px] font-[--font-barlow-condensed-bold] text-white">{game.name}</b>
          </span>
        </div>
        <div className="flex justify-center items-center h-1/2">
          <div className="flex flex-row justify-between w-full">
            {catInfo.map((cat, index) => {
              return (
                <GameCategory key={index} cat={cat} game={game} />
              );
            })}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default GameEntry;
