import React from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet";

import "@css/Maplist.css";
import { API } from "@api/Api";
import { Game } from "@customTypes/Game";
import { GameChapter, GamesChapters } from "@customTypes/Chapters";
import { portalLabel } from "@utils/Portal";

const parseId = (value: string | null | undefined): number | undefined => {
  if (!value) {
    return undefined;
  }
  const id = Number(value);
  return Number.isInteger(id) && id >= 0 ? id : undefined;
};

const getSelectedSectionId = (
  gameChapters: GamesChapters,
  requestedSectionId: number | undefined,
): number | undefined => {
  const sections = Array.isArray(gameChapters.chapters)
    ? gameChapters.chapters
    : [];
  const isModeGame = gameChapters.game.section_kind === "mode";
  const defaultSection = isModeGame
    ? (sections.find((section) => !section.is_disabled) ?? sections[0])
    : sections[0];

  if (requestedSectionId === undefined) {
    return defaultSection?.id;
  }

  const sectionById = sections.find(
    (section) => section.id === requestedSectionId,
  );
  if (sectionById) {
    return sectionById.id;
  }

  if (isModeGame) {
    return defaultSection?.id;
  }

  // Existing map links use a chapter/course number rather than its database ID.
  const sectionByNumber = sections.find((section) => {
    const match = section.name.match(/(?:Chapter|Course)\s+(\d+)/);
    return match !== null && Number(match[1]) === requestedSectionId;
  });
  return sectionByNumber?.id ?? sections[0]?.id;
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

  const selectedSectionId = React.useMemo(
    () =>
      gameChapters
        ? getSelectedSectionId(gameChapters, requestedChapterId)
        : undefined,
    [gameChapters, requestedChapterId],
  );

  const updateSearchParam = (name: "cat" | "chapter", value: number) => {
    const nextQueryParams = new URLSearchParams(location.search);
    nextQueryParams.set(name, value.toString());
    navigate({
      pathname: "/games/" + gameId,
      search: "?" + nextQueryParams.toString(),
    });
  };

  React.useEffect(() => {
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
        if (!chapters || !chapters.game || typeof chapters.game !== "object") {
          setGame(null);
          setGameChapters(undefined);
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

  React.useEffect(() => {
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

  const sections = Array.isArray(gameChapters?.chapters)
    ? gameChapters.chapters
    : [];
  const displayedSection =
    currentSection?.chapter?.id === selectedSectionId
      ? currentSection
      : undefined;
  const gameCategories = Array.isArray(game.category_portals)
    ? game.category_portals
    : [];
  const loadedModeCategories = displayedSection?.chapter.category_portals;
  const modeCategoryFallback = gameCategories.map((category) => ({
    category: category.category,
    portal_count:
      category.section_portals?.find(
        (section) => section.section_id === selectedSectionId,
      )?.portal_count ?? 0,
  }));
  const categories =
    game.section_kind === "mode"
      ? Array.isArray(loadedModeCategories) && loadedModeCategories.length > 0
        ? loadedModeCategories
        : modeCategoryFallback
      : gameCategories;
  const selectedCategoryId = categories.some(
    (category) => category.category.id === requestedCategoryId,
  )
    ? requestedCategoryId
    : categories[0]?.category.id;
  const selectedCategory = categories.find(
    (category) => category.category.id === selectedCategoryId,
  );
  const maps = Array.isArray(displayedSection?.maps)
    ? displayedSection.maps
    : [];
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
        {sections.length === 0 ? (
          <p className="game-empty-state">
            No sections or maps are available yet.
          </p>
        ) : (
          <>
            <div
              style={{ backgroundImage: "url(" + game.image + ")" }}
              className="game-header"
            >
              <div className="blur">
                <div className="game-header-portal-count">
                  {selectedCategory ? (
                    <>
                      <h2 className="portal-count">
                        {selectedCategory.portal_count}
                      </h2>
                      <h3>{portalLabel(selectedCategory.portal_count)}</h3>
                    </>
                  ) : (
                    <span className="game-empty-state game-header-empty-state">
                      No categories are available yet.
                    </span>
                  )}
                </div>
                {categories.length > 0 && (
                  <div className="game-header-categories">
                    {categories.map((category) => (
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
                )}
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
                  Select {game.section_label}:
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
                  {sections
                    .filter((section) => !section.is_disabled)
                    .map((section) => (
                      <div
                        key={section.id}
                        className="dropdown-element"
                        onClick={() => updateSearchParam("chapter", section.id)}
                      >
                        {section.name}
                      </div>
                    ))}
                </div>
              )}
            </section>

            <section className="maplist">
              {displayedSection && maps.length === 0 && (
                <p className="game-empty-state">
                  No maps are available in this section yet.
                </p>
              )}
              {maps.map((map) => {
                const mapCategories = Array.isArray(map.category_portals)
                  ? map.category_portals
                  : [];
                const mapPortalCount =
                  (map.is_disabled
                    ? mapCategories[0]?.portal_count
                    : mapCategories.find(
                      (category) =>
                        category.category.id === selectedCategoryId,
                    )?.portal_count) ?? 0;
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
                          <span>{portalLabel(mapPortalCount)}</span>
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
