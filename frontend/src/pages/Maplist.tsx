import React, { useEffect } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet";

import { API } from "@api/Api";
import { Game } from "@customTypes/Game";
import { GameChapter, GamesChapters } from "@customTypes/Chapters";

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
    <main className="*:text-foreground w-[calc(100vw-80px)] relative left-0 ml-20 min-h-screen p-4 sm:p-8">
      <Helmet>
      <title>LPHUB | Maplist</title>
      </Helmet>
      
      <section className="mt-5">
      <Link to="/games">
        <button className="nav-button rounded-[20px] h-10 bg-surface border-0 text-foreground text-lg font-[--font-barlow-semicondensed-regular] transition-colors duration-100 hover:bg-surface2 flex items-center px-2">
        <i className="triangle mr-2"></i>
        <span className="px-2">Games List</span>
        </button>
      </Link>
      </section>

      {load ? (
      <div></div>
      ) : (
      <section>
        <h1 className="font-[--font-barlow-condensed-bold] text-3xl sm:text-6xl my-0 text-foreground">
        {game?.name}
        </h1>

        <div
        className="text-center rounded-3xl overflow-hidden bg-cover bg-[25%] mt-3 relative"
        style={{ backgroundImage: `url(${game?.image})` }}
        >
        <div className="backdrop-blur-sm flex flex-col w-full">
          <div className="h-full flex flex-col justify-center items-center py-6">
          <h2 className="my-5 font-[--font-barlow-semicondensed-semibold] text-4xl sm:text-8xl text-foreground">
            {
            game?.category_portals.find(
              obj => obj.category.id === catNum + 1
            )?.portal_count
            }
          </h2>
          <h3 className="font-[--font-barlow-semicondensed-regular] mx-2.5 text-2xl sm:text-4xl my-0 text-foreground">
            portals
          </h3>
          </div>

          <div className="flex h-12 bg-surface gap-0.5">
          {game?.category_portals.map((cat, index) => (
            <button
            key={index}
            className={`border-0 text-foreground font-[--font-barlow-semicondensed-regular] text-sm sm:text-xl cursor-pointer transition-all duration-100 w-full ${
              currentlySelected === cat.category.id ||
              (cat.category.id - 1 === catNum && !hasClicked)
              ? "bg-surface"
              : "bg-surface1 hover:bg-surface"
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
          \
          <div
          className={`absolute z-[1000] bg-surface1 rounded-2xl overflow-hidden p-1 animate-in fade-in duration-100 ${
            dropdownActive === "none" ? "hidden" : "block"
          }`}
          >
          {gameChapters?.chapters.map((chapter, i) => {
            return (
            <div
              key={i}
              className="cursor-pointer text-base sm:text-xl rounded-[2000px] p-1 hover:bg-surface text-foreground"
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
            <div key={i} className="bg-surface rounded-3xl overflow-hidden">
            <Link to={`/maps/${map.id}`}>
              <span className="text-center text-base sm:text-xl w-full block my-1.5 text-foreground truncate">
              {map.name}
              </span>
              <div
              className="flex h-40 sm:h-48 bg-cover relative"
              style={{ backgroundImage: `url(${map.image})` }}
              >
              <div className="backdrop-blur-sm w-full flex items-center justify-center">
                <span className="text-2xl sm:text-4xl font-[--font-barlow-semicondensed-semibold] text-white mr-1.5">
                {map.is_disabled
                  ? map.category_portals[0].portal_count
                  : map.category_portals.find(
                    obj => obj.category.id === catNum + 1
                  )?.portal_count}
                </span>
                <span className="text-2xl sm:text-4xl font-[--font-barlow-semicondensed-regular] text-white">
                portals
                </span>
              </div>
              </div>

              <div className="flex mx-2.5 my-4">
              <div className="flex w-full items-center justify-center gap-1.5 rounded-[2000px] ml-0.5 translate-y-px">
                {[1, 2, 3, 4, 5].map((point) => (
                <div
                  key={point}
                  className={`flex h-0.5 w-full rounded-3xl ${
                  point <= (map.difficulty + 1)
                    ? map.difficulty === 0
                    ? "bg-green-500"
                    : map.difficulty === 1 || map.difficulty === 2
                    ? "bg-lime-500"
                    : map.difficulty === 3
                    ? "bg-red-400"
                    : "bg-red-600"
                    : "bg-surface1"
                  }`}
                />
                ))}
              </div>
              </div>
            </Link>
            </div>
          );
          })}
        </section>
        </div>
      </section>
      )}
    </main>
  );
};

export default Maplist;
