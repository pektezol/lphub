import React from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet";

import { API } from "@api/Api";
import { Game } from "@customTypes/Game";
import { GameChapter, GamesChapters } from "@customTypes/Chapters";
import { portalLabel } from "@utils/Portal";
import resourceStateStyles from "@css/ResourceState.module.css";
import portalCountStyles from "@css/PortalCount.module.css";
import navigationStyles from "@css/Navigation.module.css";
import maplistStyles from "@css/Maplist.module.css";
import { classNames, cssVariables } from "@css/utils";

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
  if (difficulty <= 2) return maplistStyles.one;
  if (difficulty <= 4) return maplistStyles.two;
  if (difficulty <= 6) return maplistStyles.three;
  if (difficulty <= 8) return maplistStyles.four;
  if (difficulty <= 10) return maplistStyles.five;
  return maplistStyles.one;
};

const isValidGameChapter = (
  section: GameChapter | undefined,
  sectionId: number,
  gameId: number,
): section is GameChapter =>
  Boolean(
    section &&
    section.game?.id === gameId &&
    section.chapter?.id === sectionId &&
    section.chapter.game_id === gameId &&
    Array.isArray(section.maps),
  );

interface ChapterCacheScope {
  gameId: number | undefined;
  chapters: Map<number, GameChapter>;
  requests: Map<number, Promise<GameChapter | undefined>>;
  isActive: boolean;
  lifecycle: number;
}

const Maplist: React.FC = () => {
  const [game, setGame] = React.useState<Game | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState(false);
  const [gameChapters, setGameChapters] = React.useState<GamesChapters>();
  const [currentSection, setCurrentSection] = React.useState<GameChapter>();
  const [dropdownActive, setDropdownActive] = React.useState(false);
  const chapterCacheScopeRef = React.useRef<ChapterCacheScope | undefined>(
    undefined,
  );

  const { id: gameIdParam } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const gameId = parseId(gameIdParam);
  const queryParams = new URLSearchParams(location.search);
  const requestedCategoryId = parseId(queryParams.get("cat"));
  const requestedChapterId = parseId(queryParams.get("chapter"));

  const selectedSectionId = React.useMemo(
    () =>
      gameChapters && gameChapters.game.id === gameId
        ? getSelectedSectionId(gameChapters, requestedChapterId)
        : undefined,
    [gameChapters, gameId, requestedChapterId],
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
    let cacheScope = chapterCacheScopeRef.current;
    if (!cacheScope || cacheScope.gameId !== gameId) {
      if (cacheScope) {
        cacheScope.isActive = false;
        cacheScope.chapters.clear();
        cacheScope.requests.clear();
      }
      cacheScope = {
        gameId,
        chapters: new Map(),
        requests: new Map(),
        isActive: true,
        lifecycle: 0,
      };
      chapterCacheScopeRef.current = cacheScope;
    }
    cacheScope.isActive = true;
    cacheScope.lifecycle += 1;
    const lifecycle = cacheScope.lifecycle;
    setGame(null);
    setLoadError(false);
    setGameChapters(undefined);
    setCurrentSection(undefined);
    setDropdownActive(false);
    setIsLoading(true);

    if (gameId === undefined) {
      setIsLoading(false);
      return () => {
        isCurrent = false;
        cacheScope.isActive = false;
        void Promise.resolve().then(() => {
          if (
            chapterCacheScopeRef.current === cacheScope &&
            cacheScope.lifecycle === lifecycle
          ) {
            cacheScope.chapters.clear();
            cacheScope.requests.clear();
            chapterCacheScopeRef.current = undefined;
          }
        });
      };
    }

    const fetchGame = async () => {
      try {
        const chapters = await API.get_games_chapters(gameId.toString());
        if (!isCurrent) {
          return;
        }
        if (
          !chapters ||
          !chapters.game ||
          typeof chapters.game !== "object" ||
          chapters.game.id !== gameId
        ) {
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
          setLoadError(true);
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
      cacheScope.isActive = false;
      void Promise.resolve().then(() => {
        if (
          chapterCacheScopeRef.current === cacheScope &&
          cacheScope.lifecycle === lifecycle
        ) {
          cacheScope.chapters.clear();
          cacheScope.requests.clear();
          chapterCacheScopeRef.current = undefined;
        }
      });
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

    const cacheScope = chapterCacheScopeRef.current;
    if (!cacheScope || !cacheScope.isActive || cacheScope.gameId !== gameId) {
      return () => {
        isCurrent = false;
      };
    }
    const chapterCache = cacheScope.chapters;
    const chapterRequests = cacheScope.requests;
    const cachedSection = chapterCache.get(selectedSectionId);
    if (cachedSection) {
      setCurrentSection(cachedSection);
      return () => {
        isCurrent = false;
      };
    }

    let request = chapterRequests.get(selectedSectionId);
    if (!request) {
      const chapterId = selectedSectionId;
      const requestedGameId = gameId;
      const createdRequest = API.get_chapters(chapterId.toString())
        .then((section) => {
          if (
            requestedGameId === undefined ||
            !isValidGameChapter(section, chapterId, requestedGameId)
          ) {
            return undefined;
          }

          if (cacheScope.isActive && cacheScope.gameId === requestedGameId) {
            chapterCache.set(chapterId, section);
          }
          return section;
        })
        .catch(() => undefined);

      chapterRequests.set(chapterId, createdRequest);
      void createdRequest.then(() => {
        if (chapterRequests.get(chapterId) === createdRequest) {
          chapterRequests.delete(chapterId);
        }
      });
      request = createdRequest;
    }

    void request.then((section) => {
      if (isCurrent) {
        setCurrentSection(section);
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [gameId, selectedSectionId]);

  if (isLoading || (game !== null && game.id !== gameId)) {
    return <main />;
  }
  if (!game) {
    return (
      <main className={resourceStateStyles.resourceNotFound}>
        <h1>{loadError ? "Game Unavailable" : "Game Not Found"}</h1>
        <p>
          {loadError
            ? "We couldn’t load this game. Please try again later."
            : "We couldn’t find a game with that ID."}
        </p>
        <Link to="/games">Return to Games</Link>
      </main>
    );
  }

  const sections = Array.isArray(gameChapters?.chapters)
    ? gameChapters.chapters
    : [];
  const chapterCacheScope = chapterCacheScopeRef.current;
  const cachedSection =
    selectedSectionId === undefined ||
    !chapterCacheScope ||
    chapterCacheScope.gameId !== gameId
      ? undefined
      : chapterCacheScope.chapters.get(selectedSectionId);
  const displayedSection =
    cachedSection ??
    (currentSection?.chapter?.id === selectedSectionId
      ? currentSection
      : undefined);
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
      <section  className={maplistStyles.backNavigation}>
        <Link to="/games">
          <button className={classNames(navigationStyles.navButton, maplistStyles.roundedNavigation)} >
            <i className={navigationStyles.triangle}></i>
            <span>Games List</span>
          </button>
        </Link>
      </section>
      <section>
        <h1>{game.name}</h1>
        {sections.length === 0 ? (
          <p className={maplistStyles.gameEmptyState}>
            No sections or maps are available yet.
          </p>
        ) : (
          <>
            <div
              style={cssVariables({ "--background-image": "url(" + game.image + ")" })}
              className={classNames(maplistStyles.gameHeader, maplistStyles.mapImage)}
            >
              <div className={maplistStyles.blur}>
                <div className={maplistStyles.gameHeaderPortalCount}>
                  {selectedCategory ? (
                    <>
                      <h2 className={portalCountStyles.portalCount}>
                        {selectedCategory.portal_count}
                      </h2>
                      <h3>{portalLabel(selectedCategory.portal_count)}</h3>
                    </>
                  ) : (
                    <span className={classNames(maplistStyles.gameEmptyState, maplistStyles.gameHeaderEmptyState)}>
                      No categories are available yet.
                    </span>
                  )}
                </div>
                {categories.length > 0 && (
                  <div className={maplistStyles.gameHeaderCategories}>
                    {categories.map((category) => (
                      <button
                        key={category.category.id}
                        className={(selectedCategoryId === category.category.id ? classNames(maplistStyles.gameCatButton, maplistStyles.selected) : maplistStyles.gameCatButton)}
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

            <section>
              <div>
                <span
                  className={maplistStyles.sectionPrompt}
                >
                  Select {game.section_label}:
                </span>
              </div>
              <div
                onClick={() => setDropdownActive((active) => !active)}
                className={maplistStyles.dropdown}
              >
                <span>{displayedSection?.chapter.name}</span>
                <i className={navigationStyles.triangle}></i>
              </div>
              {dropdownActive && (
                <div className={maplistStyles.dropdownElements}>
                  {sections
                    .filter((section) => !section.is_disabled)
                    .map((section) => (
                      <div
                        key={section.id}
                        className={maplistStyles.dropdownElement}
                        onClick={() => updateSearchParam("chapter", section.id)}
                      >
                        {section.name}
                      </div>
                    ))}
                </div>
              )}
            </section>

            <section className={maplistStyles.maplist}>
              {displayedSection && maps.length === 0 && (
                <p className={maplistStyles.gameEmptyState}>
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
                  <div key={map.id} className={maplistStyles.maplistEntry}>
                    <Link to={"/maps/" + map.id}>
                      <span>{map.name}</span>
                      <div
                        className={classNames(maplistStyles.mapEntryImage, maplistStyles.mapImage)}
                        style={cssVariables({ "--background-image": "url(" + map.image + ")" })}
                      >
                        <div className={classNames(maplistStyles.blur, maplistStyles.map)}>
                          <span>{mapPortalCount}</span>
                          <span>{portalLabel(mapPortalCount)}</span>
                        </div>
                      </div>
                      <div className={maplistStyles.difficultyBar}>
                        <div className={getDifficultyClass(map.difficulty)}>
                          <div className={maplistStyles.difficultyPoint}></div>
                          <div className={maplistStyles.difficultyPoint}></div>
                          <div className={maplistStyles.difficultyPoint}></div>
                          <div className={maplistStyles.difficultyPoint}></div>
                          <div className={maplistStyles.difficultyPoint}></div>
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
