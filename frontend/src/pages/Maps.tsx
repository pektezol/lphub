import React from 'react';
import { Link, useLocation } from 'react-router-dom';

import { PortalIcon, FlagIcon, ChatIcon } from '../images/Images';
import Summary from '../components/Summary';
import Leaderboards from '../components/Leaderboards';
import Discussions from '../components/Discussions';
import ModMenu from '../components/ModMenu';
import { MapDiscussions, MapLeaderboard, MapSummary } from '../types/Map';
import { API } from '../api/Api';
import "../css/Maps.css";
import Loading from '../components/Loading';

interface MapProps {
  token?: string;
  isModerator: boolean;
};

const Maps: React.FC<MapProps> = ({ token, isModerator }) => {

  const [selectedRun, setSelectedRun] = React.useState<number>(0);

  const [mapSummaryData, setMapSummaryData] = React.useState<MapSummary | undefined>(undefined);
  const [mapLeaderboardData, setMapLeaderboardData] = React.useState<MapLeaderboard | undefined>(undefined);
  const [mapDiscussionsData, setMapDiscussionsData] = React.useState<MapDiscussions | undefined>(undefined);

  const [navState, setNavState] = React.useState<number>(0);

  const location = useLocation();

  const mapID = location.pathname.split("/")[2];

  const _fetch_map_summary = async () => {
    const mapSummary = await API.get_map_summary(mapID);
    setMapSummaryData(mapSummary);
  };

  const _fetch_map_leaderboards = async () => {
    const mapLeaderboards = await API.get_map_leaderboard(mapID);
    setMapLeaderboardData(mapLeaderboards);
  };

  const _fetch_map_discussions = async () => {
    const mapDiscussions = await API.get_map_discussions(mapID);
    setMapDiscussionsData(mapDiscussions);
  };

  React.useEffect(() => {
    _fetch_map_summary();
    _fetch_map_leaderboards();
    _fetch_map_discussions();
  }, [mapID]);

  if (!mapSummaryData) {
    // loading placeholder
    return (
      <main>
        <section id='section1' className='summary1'>
          <div>
            <Link to="/games"><button className='nav-button' style={{ borderRadius: "20px 20px 20px 20px" }}><i className='triangle'></i><span>Games List</span></button></Link>
          </div>
        </section>

        <section id='section2' className='summary1'>
          <button className='nav-button'><img src={PortalIcon} alt="" /><span>Summary</span></button>
          <button className='nav-button'><img src={FlagIcon} alt="" /><span>Leaderboards</span></button>
          <button className='nav-button'><img src={ChatIcon} alt="" /><span>Discussions</span></button>
        </section>

        <Loading />
      </main>
    );
  }

  return (
    <>
      {isModerator && <ModMenu token={token} data={mapSummaryData} selectedRun={selectedRun} mapID={mapID} />}

      <div id='background-image'>
        <img src={mapSummaryData.map.image} alt="" />
      </div>
      <main>
        <section id='section1' className='summary1'>
          <div>
            <Link to="/games"><button className='nav-button' style={{ borderRadius: "20px 0px 0px 20px" }}><i className='triangle'></i><span>Games List</span></button></Link>
            <Link to={`/games/${mapSummaryData.map.is_coop ? "1" : "2"}?chapter=${mapSummaryData.map.chapter_name.split(" ")[1]}`}><button className='nav-button' style={{ borderRadius: "0px 20px 20px 0px", marginLeft: "2px" }}><i className='triangle'></i><span>{mapSummaryData.map.chapter_name}</span></button></Link>
            <br /><span><b>{mapSummaryData.map.map_name}</b></span>
          </div>
        </section>

        <section id='section2' className='summary1'>
          <button className='nav-button' onClick={() => setNavState(0)}><img src={PortalIcon} alt="" /><span>Summary</span></button>
          <button className='nav-button' onClick={() => setNavState(1)}><img src={FlagIcon} alt="" /><span>Leaderboards</span></button>
          <button className='nav-button' onClick={() => setNavState(2)}><img src={ChatIcon} alt="" /><span>Discussions</span></button>
        </section>

        {navState === 0 && <Summary selectedRun={selectedRun} setSelectedRun={setSelectedRun} data={mapSummaryData} />}
        {navState === 1 && <Leaderboards data={mapLeaderboardData} />}
        {navState === 2 && <Discussions data={mapDiscussionsData} token={token} isModerator={isModerator} mapID={mapID} onRefresh={() => _fetch_map_discussions()} />}
      </main>
    </>
  );
};

export default Maps;
