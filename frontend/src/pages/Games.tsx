import React from 'react';
import { Helmet } from 'react-helmet';

import GameEntry from '@components/GameEntry';
import { Game } from '@customTypes/Game';
import gamesCSS from "@css/Games.module.css";

interface GamesProps {
    games: Game[];
}

const Games: React.FC<GamesProps> = ({ games }) => {
    return (
        <main>
            <Helmet>
                <title>LPHUB | Games</title>
            </Helmet>
            <section>
				<div className={gamesCSS.content}>
                    {games.map((game, index) => (
                        <GameEntry game={game} key={index} />
                    ))}
                </div>
            </section>
        </main>
    );
};

export default Games;
