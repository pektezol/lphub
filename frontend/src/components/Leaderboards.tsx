import React from 'react';
import { Link } from 'react-router-dom';

import { DownloadIcon, ThreedotIcon } from '../images/Images';
import { MapLeaderboard } from '../types/Map';
import { ticks_to_time, time_ago } from '../utils/Time';
import "../css/Maps.css"

interface LeaderboardsProps {
  data?: MapLeaderboard;
}

const Leaderboards: React.FC<LeaderboardsProps> = ({ data }) => {

  const [pageNumber, setPageNumber] = React.useState<number>(1);

  if (!data) {
    return (
      <section id='section6' className='summary2'>
        <h1 style={{ textAlign: "center" }}>Map is not available for competitive boards.</h1>
      </section>
    );
  };

  if (data.records.length === 0) {
    return (
      <section id='section6' className='summary2'>
        <h1 style={{ textAlign: "center" }}>No records found.</h1>
      </section>
    );
  };

  return (
    <section id='section6' className='summary2'>

      <div id='leaderboard-top'
        style={data.map.is_coop ? { gridTemplateColumns: "7.5% 40% 7.5% 15% 15% 15%" } : { gridTemplateColumns: "7.5% 30% 10% 20% 17.5% 15%" }}
      >
        <span>Place</span>

        {data.map.is_coop ? (
          <div id='runner'>
            <span>Blue</span>
            <span>Orange</span>
          </div>
        ) : (
          <span>Runner</span>
        )}

        <span>Portals</span>
        <span>Time</span>
        <span>Date</span>
        <div id='page-number'>
          <div>

            <button onClick={() => pageNumber === 1 ? null : setPageNumber(prevPageNumber => prevPageNumber - 1)}
            ><i className='triangle' style={{ position: 'relative', left: '-5px', }}></i> </button>
            <span>{data.pagination.current_page}/{data.pagination.total_pages}</span>
            <button onClick={() => pageNumber === data.pagination.total_pages ? null : setPageNumber(prevPageNumber => prevPageNumber + 1)}
            ><i className='triangle' style={{ position: 'relative', left: '5px', transform: 'rotate(180deg)' }}></i> </button>
          </div>
        </div>
      </div>
      <hr />
      <div id='leaderboard-records'>
        {data.records.map((r, index) => (
          <span className='leaderboard-record' key={index}
            style={data.map.is_coop ? { gridTemplateColumns: "3% 4.5% 40% 4% 3.5% 15% 15% 14.5%" } : { gridTemplateColumns: "3% 4.5% 30% 4% 6% 20% 17% 15%" }}
          >
            <span>{r.placement}</span>
            <span> </span>
            {r.kind === "multiplayer" ? (
              <div>
                  <Link to={`/users/${r.host.steam_id}`}><span><img src={r.host.avatar_link} alt='' /> &nbsp; {r.host.user_name}</span></Link>
                  <Link to={`/users/${r.partner.steam_id}`}><span><img src={r.partner.avatar_link} alt='' /> &nbsp; {r.partner.user_name}</span></Link>
              </div>
            ) : r.kind === "singleplayer" && (
              <div>
                  <Link to={`/users/${r.user.steam_id}`}><span><img src={r.user.avatar_link} alt='' /> &nbsp; {r.user.user_name}</span></Link>
              </div>
            )}

            <span>{r.score_count}</span>
            <span> </span>
            <span className='hover-popup' popup-text={(r.score_time) + " ticks"}>{ticks_to_time(r.score_time)}</span>
            <span className='hover-popup' popup-text={r.record_date.replace("T", ' ').split(".")[0]}>{time_ago(new Date(r.record_date.replace("T", " ").replace("Z", "")))}</span>

            {r.kind === "multiplayer" ? (
              <span>
                <button onClick={() => { window.alert(`Host Demo ID: ${r.host_demo_id} \nParnter Demo ID: ${r.partner_demo_id}`) }}><img src={ThreedotIcon} alt="demo_id" /></button>
                <button onClick={() => window.location.href = `/api/v1/demos?uuid=${r.partner_demo_id}`}><img src={DownloadIcon} alt="download" style={{ filter: "hue-rotate(160deg) contrast(60%) saturate(1000%)" }} /></button>
                <button onClick={() => window.location.href = `/api/v1/demos?uuid=${r.host_demo_id}`}><img src={DownloadIcon} alt="download" style={{ filter: "hue-rotate(300deg) contrast(60%) saturate(1000%)" }} /></button>
              </span>
            ) : r.kind === "singleplayer" && (

              <span>
                <button onClick={() => { window.alert(`Demo ID: ${r.demo_id}`) }}><img src={ThreedotIcon} alt="demo_id" /></button>
                <button onClick={() => window.location.href = `/api/v1/demos?uuid=${r.demo_id}`}><img src={DownloadIcon} alt="download" /></button>
              </span>
            )}
          </span>
        ))}
      </div>
    </section>
  );
};

export default Leaderboards;
