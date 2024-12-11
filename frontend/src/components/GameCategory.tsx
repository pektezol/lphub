import React from 'react';
import { Link } from "react-router-dom";

import { Game, GameCategoryPortals } from '@customTypes/Game';
import info from "@css/Info.module.css";

interface GameCategoryProps {
    game: Game;
    cat: GameCategoryPortals;
}

const GameCategory: React.FC<GameCategoryProps> = ({cat, game}) => {
    return (
        <Link className={info.infoBlock} to={"/games/" + game.id + "?cat=" + cat.category.id}>
        <div>
              <span>{cat.category.name}</span>
              <br />
              <span>{cat.portal_count}</span>
        </div>
        </Link>
    )
}

export default GameCategory;
