import React, { useEffect } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import "../css/Maplist.css";
import { API } from "../api/Api";
import { Game, GameChapters } from "../types/Game";
import { GameChapter, GamesChapters } from "../types/Chapters";
import { Map } from "../types/Map";

const Maplist: React.FC = () => {
  const [game, setGame] = React.useState<Game | null>(null);
  const [catNum, setCatNum] = React.useState(0);
  const [id, setId] = React.useState(0);
  const [category, setCategory] = React.useState(0);
  const [load, setLoad] = React.useState(false);
  const [currentlySelected, setCurrentlySelected] = React.useState<number>(0);
  const [hasClicked, setHasClicked] = React.useState(false);
  const [gameChapters, setGameChapters] = React.useState<GamesChapters>();
  const [curChapter, setCurChapter] = React.useState<GameChapter>();
  const [numChapters, setNumChapters] = React.useState<number>(0);

  const [dropdownActive, setDropdownActive] = React.useState("none");

  const params = useParams<{ id: string, chapter: string }>();
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
  }

  const _handle_dropdown_click = () => {
    if (dropdownActive == "none") {
      setDropdownActive("block");
    } else {
      setDropdownActive("none");
    }
  }

  // im sorry but im too lazy to fix this right now
  useEffect(() => {
    // gameID
    const gameId = parseFloat(params.id || "");
    setId(gameId);

    // location query params
    const queryParams = new URLSearchParams(location.search);
    if (queryParams.get("chapter")) {
        let cat = parseFloat(queryParams.get("chapter") || "");
		if (gameId == 2) {
			cat += 10;
		}
		_fetch_chapters(cat.toString());
	}

    const _fetch_game = async () => {
      const games = await API.get_games();
      const foundGame = games.find((game) => game.id === gameId);
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
    }

    setLoad(true);
    _fetch_game();
    _fetch_game_chapters();
  }, []);

  useEffect(() => {
  	const queryParams = new URLSearchParams(location.search);
    if (gameChapters != undefined && !queryParams.get("chapter")) {
      _fetch_chapters(gameChapters!.chapters[0].id.toString());
    }
  }, [gameChapters])



  return (
    <main>
      <section style={{ marginTop: "20px" }}>
        <Link to="/games">
          <button className="nav-button" style={{ borderRadius: "20px" }}>
            <i className="triangle"></i>
            <span>Games List</span>
          </button>
        </Link>
      </section>
      {load ? (
        <div></div>
      ) : (
        <section>
          <h1>{game?.name}</h1>
          <div
            style={{ backgroundImage: `url(${game?.image})` }}
            className="game-header"
          >
            <div className="blur">
              <div className="game-header-portal-count">
                <h2 className="portal-count">
                  {
                    game?.category_portals.find(
                      (obj) => obj.category.id === catNum + 1
                    )?.portal_count
                  }
                </h2>
                <h3>portals</h3>
              </div>
              <div className="game-header-categories">
                {game?.category_portals.map((cat, index) => (
                  <button key={index} className={currentlySelected == cat.category.id || cat.category.id - 1 == catNum && !hasClicked ? "game-cat-button selected" : "game-cat-button"} onClick={() => {setCatNum(cat.category.id - 1); _update_currently_selected(cat.category.id)}}>
                    <span>{cat.category.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <section className="chapter-select-container">
              <div>
                <span style={{fontSize: "18px", transform: "translateY(5px)", display: "block", marginTop: "10px"}}>{curChapter?.chapter.name.split(" - ")[0]}</span>
              </div>
              <div onClick={_handle_dropdown_click} className="dropdown">
                <span>{curChapter?.chapter.name.split(" - ")[1]}</span>
                <i className="triangle"></i>
              </div>
              <div className="dropdown-elements" style={{display: dropdownActive}}>
                {gameChapters?.chapters.map((chapter, i) => {
                  return <div className="dropdown-element" onClick={() => {_fetch_chapters(chapter.id.toString()); _handle_dropdown_click()}}>{chapter.name}</div>
                })

                }
              </div>
            </section>
            <section className="maplist">
                {curChapter?.maps.map((map, i) => {
                  return <div className="maplist-entry">
                    <Link to={`/maps/${map.id}`}>
                    <span>{map.name}</span>
                    <div className="map-entry-image" style={{backgroundImage: `url(${map.image})`}}>
                      <div className="blur map">
                        <span>{map.is_disabled ? map.category_portals[0].portal_count : map.category_portals.find(
                          (obj) => obj.category.id === catNum + 1
                        )?.portal_count}</span>
                        <span>portals</span>
                      </div>
                    </div>
                    <div className="difficulty-bar">
                      {/* <span>Difficulty:</span> */}
                      <div className={map.difficulty == 0 ? "one" : map.difficulty == 1 ? "two" : map.difficulty == 2 ? "three" : map.difficulty == 3 ? "four" : map.difficulty == 4 ? "five" : "one"}>
                        <div className="difficulty-point"></div>
                        <div className="difficulty-point"></div>
                        <div className="difficulty-point"></div>
                        <div className="difficulty-point"></div>
                        <div className="difficulty-point"></div>
                      </div>
                    </div>
                    </Link>
                  </div>
                })}
            </section>
          </div>
        </section>
      )}
    </main>
  );
};

export default Maplist;
