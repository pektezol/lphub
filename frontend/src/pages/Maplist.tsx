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

const getDifficultyClass = (difficulty: number) => {
  if (difficulty <= 2) return "one";
  if (difficulty <= 4) return "two";
  if (difficulty <= 6) return "three";
  if (difficulty <= 8) return "four";
  if (difficulty <= 10) return "five";
  return "one";
};

const Maplist: React.FC = () => {
  const [game, setGame] = React.useState<Game | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [gameChapters, setGameChapters] = React.useState<GamesChapters>();
  const [currentSection, setCurrentSection] = React.useState<GameChapter>();
  const [dropdownActive, setDropdownActive] = React.useState(false);

  const { id: gameIdParam } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const gameId = parseId(gameIdParam);
  const queryParams = new URLSearchParams(location.search);
  const requestedCategoryId = parseId(queryParams.get("cat"));
  const requestedChapterId = parseId(queryParams.get("chapter"));

  const selectedSectionId = React.useMemo(() => {
    if (!gameChapters) {
      return undefined;
    }
    if (requestedChapterId !== undefined) {
      const requestedSection = gameChapters.chapters.find(
        (chapter) => chapter.id === requestedChapterId,
      );
      if (requestedSection) {
        return requestedSection.id;
      }
      return gameChapters.game.section_kind === "mode"
        ? undefined
        : gameChapters.chapters[0]?.id;
    }
    return gameChapters.game.section_kind === "mode"
      ? undefined
      : gameChapters.chapters[0]?.id;
  }, [gameChapters, requestedChapterId]);

  const updateSearchParam = (name: "cat" | "chapter", value: number) => {
    const nextQueryParams = new URLSearchParams(location.search);
    nextQueryParams.set(name, value.toString());
    navigate({
      pathname: "/games/" + gameId,
      search: "?" + nextQueryParams.toString(),
    });
  };

  useEffect(() => {
    let isCurrent = true;
    setGame(null);
    setGameChapters(undefined);
    setCurrentSection(undefined);
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
        const chapters = await API.get_games_chapters(gameId.toString());
        if (!isCurrent) {
          return;
        }
        setGame(chapters.game);
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
    setCurrentSection(undefined);
    setDropdownActive(false);
    if (selectedSectionId === undefined) {
      return () => {
        isCurrent = false;
      };
    }
    const fetchSection = async () => {
      try {
        const section = await API.get_chapters(selectedSectionId.toString());
        if (isCurrent) {
          setCurrentSection(section);
        }
      } catch {
        if (isCurrent) {
          setCurrentSection(undefined);
        }
      }
    };
    void fetchSection();
    return () => {
      isCurrent = false;
    };
  }, [selectedSectionId]);

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

  const displayedSection = currentSection?.chapter.id === selectedSectionId
    ? currentSection
    : undefined;
  const categories = game.section_kind === "mode"
    ? displayedSection?.chapter.category_portals ?? []
    : game.category_portals;
  const selectedCategoryId = categories.some(
    (category) => category.category.id === requestedCategoryId,
  )
    ? requestedCategoryId
    : categories[0]?.category.id;
  const selectedCategory = categories.find(
    (category) => category.category.id === selectedCategoryId,
  );
  const needsModeChoice = game.section_kind === "mode" && selectedSectionId === undefined;

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
        {needsModeChoice ? (
          <section className="chapter-select-container">
            <div>
              <span style={{ fontSize: "18px", display: "block", marginTop: "10px" }}>
                Select a {game.section_label}
              </span>
            </div>
            <div style={{ display: "flex", gap: "8px", margin: "12px 0" }}>
              {gameChapters?.chapters
                .filter((chapter) => !chapter.is_disabled)
                .map((chapter) => (
                  <button
                    className="game-cat-button"
                    key={chapter.id}
                    onClick={() => updateSearchParam("chapter", chapter.id)}
                  >
                    {chapter.name}
                  </button>
                ))}
            </div>
          </section>
        ) : (
          <>
            <div
              style={{ backgroundImage: "url(" + game.image + ")" }}
              className="game-header"
            >
              <div className="blur">
                <div className="game-header-portal-count">
                  <h2 className="portal-count">{selectedCategory?.portal_count ?? 0}</h2>
                  <h3>portals</h3>
                </div>
                <div className="game-header-categories">
                  {categories.map((category) => (
                    <button
                      key={category.category.id}
                      className={
                        selectedCategoryId === category.category.id
                          ? "game-cat-button selected"
                          : "game-cat-button"
                      }
                      onClick={() => updateSearchParam("cat", category.category.id)}
                    >
                      <span>{category.category.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

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
                  {game.section_label}
                </span>
              </div>
              <div
                onClick={() => setDropdownActive((active) => !active)}
                className="dropdown"
              >
                <span>{displayedSection?.chapter.name}</span>
                <i className="triangle"></i>
              </div>
              {dropdownActive && (
                <div className="dropdown-elements">
                  {gameChapters?.chapters
                    .filter((chapter) => !chapter.is_disabled)
                    .map((chapter) => (
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
              {displayedSection?.maps.map((map) => {
                const mapPortalCount = map.category_portals.find(
                  (category) => category.category.id === selectedCategoryId,
                )?.portal_count ?? 0;
                return (
                  <div key={map.id} className="maplist-entry">
                    <Link to={"/maps/" + map.id}>
                      <span>{map.name}</span>
                      <div
                        className="map-entry-image"
                        style={{ backgroundImage: "url(" + map.image + ")" }}
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
          </>
        )}
      </section>
    </main>
  );
};

export default Maplist;
