import React from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet";

import { PortalIcon, FlagIcon, ChatIcon } from "@images/Images";
import Summary from "@components/Summary";
import Leaderboards, {
  type LeaderboardResource,
} from "@components/Leaderboards";
import Discussions from "@components/Discussions";
import ModMenu from "@components/ModMenu";
import {
  MapDiscussions,
  MapLeaderboard,
  MapSummary,
} from "@customTypes/Map";
import { API } from "@api/Api";
import "@css/Maps.css";

interface MapProps {
  token?: string;
  isModerator: boolean;
}

type ResourceStatus = LeaderboardResource["status"];

interface CachedResource<T> {
  status: ResourceStatus;
  data?: T;
  inFlight?: Promise<T | undefined>;
}

interface MapCache {
  mapID: string;
  summary?: CachedResource<MapSummary>;
  discussions?: CachedResource<MapDiscussions>;
  leaderboards: Map<number, CachedResource<MapLeaderboard>>;
  isActive: boolean;
  lifecycle: number;
}

interface ScopedResource<T> {
  mapID: string;
  status: ResourceStatus;
  data?: T;
}

interface ScopedLeaderboardResource extends LeaderboardResource {
  mapID: string;
  page: number;
}

const clearMapCache = (cache: MapCache) => {
  cache.summary = undefined;
  cache.discussions = undefined;
  cache.leaderboards.clear();
};

const isValidMapSummary = (
  summary: MapSummary | undefined,
  mapID: string,
): summary is MapSummary =>
  Boolean(
    summary &&
      summary.map?.id === Number(mapID) &&
      summary.summary &&
      Array.isArray(summary.summary.routes),
  );

const isValidMapDiscussions = (
  discussions: MapDiscussions | undefined,
): discussions is MapDiscussions =>
  Boolean(discussions && Array.isArray(discussions.discussions));

const isValidMapLeaderboard = (
  leaderboard: MapLeaderboard | undefined,
  mapID: string,
): leaderboard is MapLeaderboard =>
  Boolean(
    leaderboard &&
      leaderboard.map?.id === Number(mapID) &&
      Array.isArray(leaderboard.records) &&
      leaderboard.pagination &&
      Number.isInteger(leaderboard.pagination.current_page) &&
      Number.isInteger(leaderboard.pagination.total_pages),
  );

const Maps: React.FC<MapProps> = ({ token, isModerator }) => {
  const { id: mapID = "" } = useParams<{ id: string }>();
  const [selectedRun, setSelectedRun] = React.useState<number | undefined>(
    undefined,
  );
  const [navState, setNavState] = React.useState<number>(0);
  const [leaderboardPage, setLeaderboardPage] = React.useState<number>(1);
  const [mapSummaryResource, setMapSummaryResource] = React.useState<
    ScopedResource<MapSummary>
  >({ mapID: "", status: "loading" });
  const [mapDiscussionsResource, setMapDiscussionsResource] = React.useState<
    ScopedResource<MapDiscussions>
  >({ mapID: "", status: "loading" });
  const [leaderboardResource, setLeaderboardResource] = React.useState<
    ScopedLeaderboardResource
  >({ mapID: "", page: 1, status: "loading" });
  const mapCacheRef = React.useRef<MapCache | undefined>(undefined);
  const activeLeaderboardPageRef = React.useRef<number>(1);

  const loadMapSummary = React.useCallback((cache: MapCache) => {
    const publish = (resource: CachedResource<MapSummary>) => {
      if (cache.isActive && mapCacheRef.current === cache) {
        setMapSummaryResource({
          mapID: cache.mapID,
          status: resource.status,
          data: resource.data,
        });
      }
    };
    const cached = cache.summary;
    if (cached) {
      publish(cached);
      return cached.inFlight ?? Promise.resolve(cached.data);
    }

    const entry: CachedResource<MapSummary> = { status: "loading" };
    cache.summary = entry;
    publish(entry);

    const request = API.get_map_summary(cache.mapID)
      .then((summary) => {
        if (!isValidMapSummary(summary, cache.mapID)) {
          throw new Error("Invalid map summary response.");
        }

        entry.status = "ready";
        entry.data = summary;
        delete entry.inFlight;
        if (cache.summary === entry) {
          publish(entry);
        }
        return summary;
      })
      .catch(() => {
        if (cache.summary === entry) {
          cache.summary = undefined;
          if (cache.isActive && mapCacheRef.current === cache) {
            setMapSummaryResource({ mapID: cache.mapID, status: "error" });
          }
        }
        return undefined;
      });

    entry.inFlight = request;
    return request;
  }, []);

  const loadMapDiscussions = React.useCallback(
    (cache: MapCache, refresh = false) => {
      const previousEntry = refresh ? cache.discussions : undefined;
      if (refresh) {
        cache.discussions = undefined;
      }

      const publish = (resource: CachedResource<MapDiscussions>) => {
        if (cache.isActive && mapCacheRef.current === cache) {
          setMapDiscussionsResource({
            mapID: cache.mapID,
            status: resource.status,
            data: resource.data,
          });
        }
      };
      const cached = cache.discussions;
      if (cached) {
        publish(cached);
        return cached.inFlight ?? Promise.resolve(cached.data);
      }

      const entry: CachedResource<MapDiscussions> = previousEntry?.data
        ? { status: "loading", data: previousEntry.data }
        : { status: "loading" };
      cache.discussions = entry;
      publish(entry);

      const request = API.get_map_discussions(cache.mapID)
        .then((discussions) => {
          if (discussions === undefined) {
            entry.status = "unavailable";
            delete entry.inFlight;
            if (cache.discussions === entry) {
              publish(entry);
            }
            return undefined;
          }
          if (!isValidMapDiscussions(discussions)) {
            throw new Error("Invalid map discussions response.");
          }

          entry.status = "ready";
          entry.data = discussions;
          delete entry.inFlight;
          if (cache.discussions === entry) {
            publish(entry);
          }
          return discussions;
        })
        .catch(() => {
          if (cache.discussions === entry) {
            cache.discussions = undefined;
            if (cache.isActive && mapCacheRef.current === cache) {
              setMapDiscussionsResource({
                mapID: cache.mapID,
                status: "error",
                data: entry.data,
              });
            }
          }
          return undefined;
        });

      entry.inFlight = request;
      return request;
    },
    [],
  );

  const loadLeaderboardPage = React.useCallback(
    (cache: MapCache, page: number) => {
      if (!Number.isInteger(page) || page < 1) {
        return Promise.resolve(undefined);
      }

      const publish = (resource: CachedResource<MapLeaderboard>) => {
        if (
          cache.isActive &&
          mapCacheRef.current === cache &&
          activeLeaderboardPageRef.current === page
        ) {
          setLeaderboardResource({
            mapID: cache.mapID,
            page,
            status: resource.status,
            data: resource.data,
          });
        }
      };
      const cached = cache.leaderboards.get(page);
      if (cached) {
        publish(cached);
        return cached.inFlight ?? Promise.resolve(cached.data);
      }

      const entry: CachedResource<MapLeaderboard> = { status: "loading" };
      cache.leaderboards.set(page, entry);
      publish(entry);

      const request = API.get_map_leaderboard(cache.mapID, page.toString())
        .then((leaderboard) => {
          if (leaderboard === undefined) {
            entry.status = "unavailable";
            delete entry.inFlight;
            if (cache.leaderboards.get(page) === entry) {
              publish(entry);
            }
            return undefined;
          }
          if (!isValidMapLeaderboard(leaderboard, cache.mapID)) {
            throw new Error("Invalid map leaderboard response.");
          }

          entry.status = leaderboard.records.length === 0 ? "empty" : "ready";
          entry.data = leaderboard;
          delete entry.inFlight;
          if (cache.leaderboards.get(page) === entry) {
            publish(entry);
          }
          return leaderboard;
        })
        .catch(() => {
          if (cache.leaderboards.get(page) === entry) {
            cache.leaderboards.delete(page);
            if (
              cache.isActive &&
              mapCacheRef.current === cache &&
              activeLeaderboardPageRef.current === page
            ) {
              setLeaderboardResource({
                mapID: cache.mapID,
                page,
                status: "error",
              });
            }
          }
          return undefined;
        });

      entry.inFlight = request;
      return request;
    },
    [],
  );

  React.useEffect(() => {
    let cache = mapCacheRef.current;
    if (!cache || cache.mapID !== mapID) {
      if (cache) {
        cache.isActive = false;
        clearMapCache(cache);
      }
      cache = {
        mapID,
        leaderboards: new Map(),
        isActive: true,
        lifecycle: 0,
      };
      mapCacheRef.current = cache;
    }
    cache.isActive = true;
    cache.lifecycle += 1;
    const lifecycle = cache.lifecycle;
    activeLeaderboardPageRef.current = 1;
    setSelectedRun(undefined);
    setNavState(0);
    setLeaderboardPage(1);
    setMapSummaryResource({ mapID, status: "loading" });
    setMapDiscussionsResource({ mapID, status: "loading" });
    setLeaderboardResource({ mapID, page: 1, status: "loading" });

    if (mapID) {
      void loadMapSummary(cache);
      void loadMapDiscussions(cache);
      void loadLeaderboardPage(cache, 1);
    }

    return () => {
      cache.isActive = false;
      void Promise.resolve().then(() => {
        if (
          mapCacheRef.current === cache &&
          cache.lifecycle === lifecycle
        ) {
          clearMapCache(cache);
          mapCacheRef.current = undefined;
        }
      });
    };
  }, [mapID, loadLeaderboardPage, loadMapDiscussions, loadMapSummary]);

  const onLeaderboardPageChange = React.useCallback(
    (page: number) => {
      if (!Number.isInteger(page) || page < 1) {
        return;
      }

      activeLeaderboardPageRef.current = page;
      setLeaderboardPage(page);
      const cache = mapCacheRef.current;
      if (!cache || cache.mapID !== mapID) {
        return;
      }
      void loadLeaderboardPage(cache, page);
    },
    [loadLeaderboardPage, mapID],
  );

  const selectMapTab = React.useCallback(
    (tab: number) => {
      setNavState(tab);
      if (tab !== 1) {
        return;
      }

      const cache = mapCacheRef.current;
      const page = activeLeaderboardPageRef.current;
      if (
        !cache ||
        cache.mapID !== mapID ||
        cache.leaderboards.has(page)
      ) {
        return;
      }
      void loadLeaderboardPage(cache, page);
    },
    [loadLeaderboardPage, mapID],
  );

  const activeSummaryResource =
    mapSummaryResource.mapID === mapID
      ? mapSummaryResource
      : { mapID, status: "loading" as const };
  const activeDiscussionsResource =
    mapDiscussionsResource.mapID === mapID
      ? mapDiscussionsResource
      : { mapID, status: "loading" as const };
  const activeLeaderboardResource = React.useMemo<LeaderboardResource>(() => {
    if (
      leaderboardResource.mapID === mapID &&
      leaderboardResource.page === leaderboardPage
    ) {
      return {
        status: leaderboardResource.status,
        data: leaderboardResource.data,
      };
    }

    const cachedPage = mapCacheRef.current?.mapID === mapID
      ? mapCacheRef.current.leaderboards.get(leaderboardPage)
      : undefined;
    if (cachedPage) {
      return { status: cachedPage.status, data: cachedPage.data };
    }

    return { status: "loading" };
  }, [leaderboardPage, leaderboardResource, mapID]);

  const mapSummaryData =
    activeSummaryResource.status === "ready"
      ? activeSummaryResource.data
      : undefined;
  const mapDiscussionsData = activeDiscussionsResource.data;

  if (!mapSummaryData) {
    // loading placeholder
    return (
      <>
        <main>
          <section id="section1" className="summary1">
            <div>
              <Link to="/games">
                <button
                  className="nav-button"
                  style={{ borderRadius: "20px 20px 20px 20px" }}
                >
                  <i className="triangle"></i>
                  <span>Games List</span>
                </button>
              </Link>
            </div>
          </section>

          <section id="section2" className="summary1">
            <button className="nav-button">
              <img src={PortalIcon} alt="" />
              <span>Summary</span>
            </button>
            <button className="nav-button">
              <img src={FlagIcon} alt="" />
              <span>Leaderboards</span>
            </button>
            <button className="nav-button">
              <img src={ChatIcon} alt="" />
              <span>Discussions</span>
            </button>
          </section>

          <section id="section6" className="summary2" />
        </main>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>LPHUB | {mapSummaryData.map.map_name}</title>
        <meta name="description" content={mapSummaryData.map.map_name} />
      </Helmet>
      {isModerator && (
        <ModMenu
          token={token}
          data={mapSummaryData}
          selectedRun={selectedRun}
          mapID={mapID}
          categories={mapSummaryData.map.categories ?? []}
        />
      )}

      <div id="background-image">
        <img src={mapSummaryData.map.image} alt="" />
      </div>
      <main>
        <section id="section1" className="summary1">
          <div>
            <Link to="/games">
              <button
                className="nav-button"
                style={{ borderRadius: "20px 0px 0px 20px" }}
              >
                <i className="triangle"></i>
                <span>Games List</span>
              </button>
            </Link>
            <Link
              to={
                "/games/" +
                mapSummaryData.map.game_id +
                "?chapter=" +
                mapSummaryData.map.chapter_id
              }
            >
              <button
                className="nav-button"
                style={{ borderRadius: "0px 20px 20px 0px", marginLeft: "2px" }}
              >
                <i className="triangle"></i>
                <span>{mapSummaryData.map.chapter_name}</span>
              </button>
            </Link>
            {mapSummaryData.map.counterpart && (
              <Link to={"/maps/" + mapSummaryData.map.counterpart.id}>
                <button
                  className="nav-button"
                  style={{ borderRadius: "20px", marginLeft: "8px" }}
                >
                  <span>
                    View {mapSummaryData.map.counterpart.section_name}
                  </span>
                </button>
              </Link>
            )}
            <br />
            <span>
              <b>{mapSummaryData.map.map_name}</b>
              {mapSummaryData.map.section_kind === "mode"
                ? " — " + mapSummaryData.map.chapter_name
                : ""}
            </span>
          </div>
        </section>

        <section id="section2" className="summary1">
          <button className="nav-button" onClick={() => selectMapTab(0)}>
            <img src={PortalIcon} alt="" />
            <span>Summary</span>
          </button>
          <button className="nav-button" onClick={() => selectMapTab(1)}>
            <img src={FlagIcon} alt="" />
            <span>Leaderboards</span>
          </button>
          <button className="nav-button" onClick={() => selectMapTab(2)}>
            <img src={ChatIcon} alt="" />
            <span>Discussions</span>
          </button>
        </section>

        {navState === 0 && (
          <Summary
            selectedRun={selectedRun}
            setSelectedRun={setSelectedRun}
            data={mapSummaryData}
          />
        )}
        {navState === 1 && (
          <Leaderboards
            activePage={leaderboardPage}
            resource={activeLeaderboardResource}
            token={token}
            onPageChange={onLeaderboardPageChange}
          />
        )}
        {navState === 2 && (
          <Discussions
            data={mapDiscussionsData}
            token={token}
            isModerator={isModerator}
            mapID={mapID}
            onRefresh={() => {
              const cache = mapCacheRef.current;
              if (cache?.mapID === mapID) {
                void loadMapDiscussions(cache, true);
              }
            }}
          />
        )}
      </main>
    </>
  );
};

export default Maps;
