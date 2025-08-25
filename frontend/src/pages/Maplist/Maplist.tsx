import React, { useEffect } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet";

import { API } from "@api/Api.ts";
import { Game } from "@customTypes/Game.ts";
import { GameChapter, GamesChapters } from "@customTypes/Chapters.ts";

import Map from "./Components/Map";
import BreadcrumbNav from "@components/BreadcrumbNav/BreadcrumbNav";

const Maplist: React.FC = () => {
  const [game, setGame] = React.useState<Game | null>(null);
  const [catNum, setCatNum] = React.useState(0);
  const [id, setId] = React.useState(0);
  const [load, setLoad] = React.useState(false);
  const [currentlySelected, setCurrentlySelected] = React.useState<number>(0);
  const [hasClicked, setHasClicked] = React.useState(false);
  const [gameChapters, setGameChapters] = React.useState<GamesChapters>();
  const [curChapter, setCurChapter] = React.useState<GameChapter>();
  const [numChapters, setNumChapters] = React.useState<number>(0);

  const [dropdownActive, setDropdownActive] = React.useState("none");

  const params = useParams<{ id: string; chapter: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  function _update_currently_selected(catNum2: number) {
    setCurrentlySelected(catNum2);
    navigate("/games/" + game?.id + "?cat=" + catNum2);
    setHasClicked(true);
  }

  const _fetch_chapters = async (chapter_id: string) => {
    const chapters = await API.get_chapters(chapter_id);
    setCurChapter(chapters);
  };

  const _handle_dropdown_click = () => {
    if (dropdownActive === "none") {
      setDropdownActive("block");
    } else {
      setDropdownActive("none");
    }
  };

  // im sorry but im too lazy to fix this right now
  useEffect(() => {
    // gameID
    const gameId = parseFloat(params.id || "");
    setId(gameId);

    // location query params
    const queryParams = new URLSearchParams(location.search);
    if (queryParams.get("chapter")) {
      let cat = parseFloat(queryParams.get("chapter") || "");
      if (gameId === 2) {
        cat += 10;
      }
      _fetch_chapters(cat.toString());
    }

    const _fetch_game = async () => {
      const games = await API.get_games();
      const foundGame = games.find(game => game.id === gameId);
      // console.log(foundGame)
      if (foundGame) {
        setGame(foundGame);
        setLoad(false);
      }
    };

    const _fetch_game_chapters = async () => {
      const games_chapters = await API.get_games_chapters(gameId.toString());
      setGameChapters(games_chapters);
      setNumChapters(games_chapters.chapters.length);
    };

    setLoad(true);
    _fetch_game();
    _fetch_game_chapters();
  }, [location.search]);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    if (gameChapters !== undefined && !queryParams.get("chapter")) {
      _fetch_chapters(gameChapters!.chapters[0].id.toString());
    }
  }, [gameChapters, location.search]);

  return (
    <div className="">
      <Helmet>
        <title>LPHUB | Maplist</title>
      </Helmet>

      <BreadcrumbNav />

      {load ? (
        <div></div>
      ) : (
        <section className="px-12">
          <h1 className="text-3xl sm:text-6xl my-0">
            {game?.name}
          </h1>

          <div
            className="text-center rounded-3xl overflow-hidden bg-panel bg-[25%] mt-3 relative"
            style={{ backgroundImage: `url(${game?.image})` }}
          >
            <div className="backdrop-blur-sm flex flex-col w-full">
              <div className="h-full flex justify-center items-center py-6">
                <span className="font-barlow-semicondensed-semibold text-8xl">
                  {
                    game?.category_portals.find(
                      obj => obj.category.id === catNum + 1
                    )?.portal_count
                  }
                </span>
                <span className="font-barlow-semicondensed-regular mx-2.5 text-2xl sm:text-4xl my-0 text-foreground">
                  portals
                </span>
              </div>

              <div className="flex h-12 bg-panel gap-0.5">
                {game?.category_portals.map((cat, index) => (
                  <button
                    key={index}
                    className={`border-0 text-foreground font-barlow-semicondensed-regular text-sm sm:text-xl cursor-pointer transition-all duration-100 w-full ${currentlySelected === cat.category.id ||
                      (cat.category.id - 1 === catNum && !hasClicked)
                      ? "bg-panel"
                      : "bg-block hover:bg-block"
                      }`}
                    onClick={() => {
                      setCatNum(cat.category.id - 1);
                      _update_currently_selected(cat.category.id);
                    }}
                  >
                    <span className="truncate">{cat.category.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <section>
              <div>
                <span className="text-lg sm:text-lg translate-y-1.5 block mt-2.5 text-foreground">
                  {curChapter?.chapter.name.split(" - ")[0]}
                </span>
              </div>
              <div
                onClick={_handle_dropdown_click}
                className="cursor-pointer select-none flex w-fit items-center"
              >
                <span className="text-foreground text-base sm:text-2xl">
                  {curChapter?.chapter.name.split(" - ")[1]}
                </span>
                <i className="triangle translate-x-1.5 translate-y-2 -rotate-90"></i>
              </div>

              <div
                className={`absolute z-[1000] bg-panel rounded-2xl overflow-hidden p-1 animate-in fade-in duration-100 ${dropdownActive === "none" ? "hidden" : "block"
                  }`}
              >
                {gameChapters?.chapters.map((chapter, i) => {
                  return (
                    <div
                      key={i}
                      className="cursor-pointer text-base sm:text-xl rounded-[2000px] p-1 hover:bg-block text-foreground"
                      onClick={() => {
                        _fetch_chapters(chapter.id.toString());
                        _handle_dropdown_click();
                      }}
                    >
                      {chapter.name}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 my-5">
              {curChapter?.maps.map((map, i) => {
                return (
                  <Map key={i} map={map} catNum={catNum} />
                );
              })}
            </section>
          </div>
        </section>
      )}
    </div>
  );
};

export default Maplist;
