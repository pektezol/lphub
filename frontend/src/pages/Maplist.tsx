import React, { useEffect } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet";

import "@css/Maplist.css";
import { API } from "@api/Api";
import { Game } from "@customTypes/Game";
import { GameChapter, GamesChapters } from "@customTypes/Chapters";

const parseId = (value: string | null | undefined): number | undefined => {
  if (!value) {
    return undefined;
  }

  const id = Number(value);
  return Number.isInteger(id) && id >= 0 ? id : undefined;
};

const getSelectedChapterId = (
  gameChapters: GamesChapters,
  requestedChapterId: number | undefined
): number | undefined => {
  if (requestedChapterId === undefined) {
    return gameChapters.chapters[0]?.id;
  }

  const chapterById = gameChapters.chapters.find(
    (chapter) => chapter.id === requestedChapterId
  );
  if (chapterById) {
    return chapterById.id;
  }

  // Existing map links use the chapter/course number rather than its database ID.
  const chapterByNumber = gameChapters.chapters.find((chapter) => {
    const match = chapter.name.match(/(?:Chapter|Course)\s+(\d+)/);
    return match !== null && Number(match[1]) === requestedChapterId;
  });

  return chapterByNumber?.id ?? gameChapters.chapters[0]?.id;
};

const getDifficultyClass = (difficulty: number) => {
  if (difficulty <= 2) {
    return "one";
  }
  if (difficulty <= 4) {
    return "two";
  }
  if (difficulty <= 6) {
    return "three";
  }
  if (difficulty <= 8) {
    return "four";
  }
  if (difficulty <= 10) {
    return "five";
  }
  return "one";
};

const Maplist: React.FC = () => {
  const [game, setGame] = React.useState<Game | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [gameChapters, setGameChapters] = React.useState<GamesChapters>();
  const [curChapter, setCurChapter] = React.useState<GameChapter>();
  const [dropdownActive, setDropdownActive] = React.useState(false);

  const { id: gameIdParam } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const gameId = parseId(gameIdParam);
  const queryParams = new URLSearchParams(location.search);
  const requestedCategoryId = parseId(queryParams.get("cat"));
  const requestedChapterId = parseId(queryParams.get("chapter"));
  const selectedChapterId = gameChapters
    ? getSelectedChapterId(gameChapters, requestedChapterId)
    : undefined;

  const selectedCategoryId = game?.category_portals.some(
    (category) => category.category.id === requestedCategoryId
  )
    ? requestedCategoryId
    : game?.category_portals[0]?.category.id;

  const updateSearchParam = (name: "cat" | "chapter", value: number) => {
    const nextQueryParams = new URLSearchParams(location.search);
    nextQueryParams.set(name, value.toString());
    const search = nextQueryParams.toString();

    navigate({
      pathname: `/games/${gameId}`,
      search: search ? `?${search}` : "",
    });
  };

  useEffect(() => {
    let isCurrent = true;

    setGame(null);
    setGameChapters(undefined);
    setCurChapter(undefined);
    setDropdownActive(false);
    setIsLoading(true);

    if (gameId === undefined) {
      setIsLoading(false);
      return () => {
        isCurrent = false;
      };
    }

    const fetchGame = async () => {
      try {
        const [games, chapters] = await Promise.all([
          API.get_games(),
          API.get_games_chapters(gameId.toString()),
        ]);

        if (!isCurrent) {
          return;
        }

        setGame(games.find((candidate) => candidate.id === gameId) ?? null);
        setGameChapters(chapters);
      } catch {
        if (isCurrent) {
          setGame(null);
          setGameChapters(undefined);
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    };

    void fetchGame();

    return () => {
      isCurrent = false;
    };
  }, [gameId]);

  useEffect(() => {
    let isCurrent = true;

    setCurChapter(undefined);
    setDropdownActive(false);

    if (selectedChapterId === undefined) {
      return () => {
        isCurrent = false;
      };
    }

    const fetchChapter = async () => {
      try {
        const chapter = await API.get_chapters(selectedChapterId.toString());
        if (isCurrent) {
          setCurChapter(chapter);
        }
      } catch {
        if (isCurrent) {
          setCurChapter(undefined);
        }
      }
    };

    void fetchChapter();

    return () => {
      isCurrent = false;
    };
  }, [gameId, selectedChapterId]);

  if (isLoading || (game !== null && game.id !== gameId)) {
    return <main />;
  }

  if (!game) {
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
        <p>Game not found.</p>
      </main>
    );
  }

  const selectedCategory = game.category_portals.find(
    (category) => category.category.id === selectedCategoryId
  );
  const displayedChapter =
    curChapter?.chapter.id === selectedChapterId ? curChapter : undefined;

  return (
    <main>
      <Helmet>
        <title>LPHUB | {game.name}</title>
      </Helmet>
      <section style={{ marginTop: "20px" }}>
        <Link to="/games">
          <button className="nav-button" style={{ borderRadius: "20px" }}>
            <i className="triangle"></i>
            <span>Games List</span>
          </button>
        </Link>
      </section>
      <section>
        <h1>{game.name}</h1>
        <div
          style={{ backgroundImage: `url(${game.image})` }}
          className="game-header"
        >
          <div className="blur">
            <div className="game-header-portal-count">
              <h2 className="portal-count">{selectedCategory?.portal_count}</h2>
              <h3>portals</h3>
            </div>
            <div className="game-header-categories">
              {game.category_portals.map((category) => (
                <button
                  key={category.category.id}
                  className={
                    selectedCategoryId === category.category.id
                      ? "game-cat-button selected"
                      : "game-cat-button"
                  }
                  onClick={() =>
                    updateSearchParam("cat", category.category.id)
                  }
                >
                  <span>{category.category.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <section className="chapter-select-container">
            <div>
              <span
                style={{
                  fontSize: "18px",
                  transform: "translateY(5px)",
                  display: "block",
                  marginTop: "10px",
                }}
              >
                {displayedChapter?.chapter.name.split(" - ")[0]}
              </span>
            </div>
            <div
              onClick={() => setDropdownActive((active) => !active)}
              className="dropdown"
            >
              <span>{displayedChapter?.chapter.name.split(" - ")[1]}</span>
              <i className="triangle"></i>
            </div>
            {dropdownActive && (
              <div className="dropdown-elements">
                {gameChapters?.chapters.map((chapter) => (
                  <div
                    key={chapter.id}
                    className="dropdown-element"
                    onClick={() => updateSearchParam("chapter", chapter.id)}
                  >
                    {chapter.name}
                  </div>
                ))}
              </div>
            )}
          </section>
          <section className="maplist">
            {displayedChapter?.maps.map((map) => {
              const mapPortalCount = map.is_disabled
                ? map.category_portals[0]?.portal_count
                : map.category_portals.find((category) =>
                  category.category.id === selectedCategoryId
                )?.portal_count;

              return (
                <div key={map.id} className="maplist-entry">
                  <Link to={`/maps/${map.id}`}>
                    <span>{map.name}</span>
                    <div
                      className="map-entry-image"
                      style={{ backgroundImage: `url(${map.image})` }}
                    >
                      <div className="blur map">
                        <span>{mapPortalCount}</span>
                        <span>portals</span>
                      </div>
                    </div>
                    <div className="difficulty-bar">
                      <div className={getDifficultyClass(map.difficulty)}>
                        <div className="difficulty-point"></div>
                        <div className="difficulty-point"></div>
                        <div className="difficulty-point"></div>
                        <div className="difficulty-point"></div>
                        <div className="difficulty-point"></div>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </section>
        </div>
      </section>
    </main>
  );
};

export default Maplist;
