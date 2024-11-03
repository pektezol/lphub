import React from 'react';
import { Link } from "react-router-dom";

import { Game, GameCategoryPortals } from '@customTypes/Game';
import "@css/Games.css"

import GameCategory from '@components/GameCategory';

interface GameEntryProps {
  game: Game;
}

const GameEntry: React.FC<GameEntryProps> = ({ game }) => {
  const [catInfo, setCatInfo] = React.useState<GameCategoryPortals[]>([]);

  React.useEffect(() => {
    setCatInfo(game.category_portals);
  }, [game.category_portals]);

  return (
    <Link to={"/games/" + game.id}><div className='games-page-item'>
      <div className='games-page-item-header'>
        <div style={{ backgroundImage: `url(${game.image})` }} className='games-page-item-header-img'></div>
        <span><b>{game.name}</b></span>
      </div>
      <div id={game.id as any as string} className='games-page-item-body'>
        {catInfo.map((cat, index) => {
          return <GameCategory cat={cat} game={game} key={index}></GameCategory>
        })}
      </div>
    </div></Link>
  );
};

export default GameEntry;
