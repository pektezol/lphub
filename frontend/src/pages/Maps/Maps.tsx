import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet";

import styles from "./Maps.module.css";

import { PortalIcon, FlagIcon, ChatIcon } from "../../images/Images.tsx";
import Summary from "@components/Summary.tsx";
import Leaderboards from "@components/Leaderboards.tsx";
import Discussions from "@components/Discussions.tsx";
import ModMenu from "@components/ModMenu.tsx";
import { MapDiscussions, MapLeaderboard, MapSummary } from "@customTypes/Map.ts";
import { API } from "@api/Api.ts";
import BreadcrumbNav from "@components/BreadcrumbNav/BreadcrumbNav.tsx";

interface MapProps {
  token?: string;
  isModerator: boolean;
}

const Maps: React.FC<MapProps> = ({ token, isModerator }) => {
  const [selectedRun, setSelectedRun] = React.useState<number>(0);

  const [mapSummaryData, setMapSummaryData] = React.useState<
    MapSummary | undefined
  >(undefined);
  const [mapLeaderboardData, setMapLeaderboardData] = React.useState<
    MapLeaderboard | undefined
  >(undefined);
  const [mapDiscussionsData, setMapDiscussionsData] = React.useState<
    MapDiscussions | undefined
  >(undefined);

  const [navState, setNavState] = React.useState<number>(0);

  const location = useLocation();

  const mapID = location.pathname.split("/")[2];

  const _fetch_map_summary = React.useCallback(async () => {
    const mapSummary = await API.get_map_summary(mapID);
    setMapSummaryData(mapSummary);
  }, [mapID]);

  const _fetch_map_leaderboards = React.useCallback(async () => {
    const mapLeaderboards = await API.get_map_leaderboard(mapID, "1");
    setMapLeaderboardData(mapLeaderboards);
  }, [mapID]);

  const _fetch_map_discussions = React.useCallback(async () => {
    const mapDiscussions = await API.get_map_discussions(mapID);
    setMapDiscussionsData(mapDiscussions);
  }, [mapID]);

  React.useEffect(() => {
    _fetch_map_summary();
    _fetch_map_leaderboards();
    _fetch_map_discussions();
  }, [
    mapID,
    _fetch_map_discussions,
    _fetch_map_leaderboards,
    _fetch_map_summary,
  ]);

  if (!mapSummaryData) {
    // loading placeholder
    // TODO: Don't do this
    return (
      <>
        <div className="">
          <BreadcrumbNav />

          <div className="px-12">
            <h1>Loading...</h1>

            <section id="section2" className="summary1 mt-4 flex gap-2 flex-wrap">
              <button className={styles["button-nav"]}>
                <img src={PortalIcon} alt="" className="w-5 h-5 sm:w-6 sm:h-6" />
                <span>Summary</span>
              </button>
              <button className={styles["button-nav"]}>
                <img src={FlagIcon} alt="" className="w-5 h-5 sm:w-6 sm:h-6" />
                <span>Leaderboards</span>
              </button>
              <button className={styles["button-nav"]}>
                <img src={ChatIcon} alt="" className="w-5 h-5 sm:w-6 sm:h-6" />
                <span>Discussions</span>
              </button>
            </section>

            <section id="section6" className="summary2 mt-4" />
          </div>
        </div>
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
        />
      )}

      <div id="background-image">
        <img src={mapSummaryData.map.image} alt="" />
      </div>
      <div>
        <BreadcrumbNav chapter={{ label: mapSummaryData.map.chapter_name, to: `/games/${mapSummaryData.map.is_coop ? "2" : "1"}?chapter=${mapSummaryData.map.chapter_name.split(" ")[1]}` }} />
        <div className="px-12">
          <h1>{mapSummaryData.map.map_name}</h1>

          <section className="mt-2 flex w-full gap-[2px] rounded-[2000px] overflow-clip">
            <button className={styles["button-nav"]} onClick={() => setNavState(0)}>
              <img src={PortalIcon} alt="" className="w-5 h-5 sm:w-6 sm:h-6" />
              <span>Summary</span>
            </button>
            <button className={styles["button-nav"]} onClick={() => setNavState(1)}>
              <img src={FlagIcon} alt="" className="w-5 h-5 sm:w-6 sm:h-6" />
              <span>Leaderboards</span>
            </button>
            <button className={styles["button-nav"]} onClick={() => setNavState(2)}>
              <img src={ChatIcon} alt="" className="w-5 h-5 sm:w-6 sm:h-6" />
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
          {navState === 1 && <Leaderboards mapID={mapID} />}
          {navState === 2 && (
            <Discussions
              data={mapDiscussionsData}
              token={token}
              isModerator={isModerator}
              mapID={mapID}
              onRefresh={() => _fetch_map_discussions()}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default Maps;
