import React from "react";
import { Link } from "react-router-dom";

import { DownloadIcon, ThreedotIcon } from "@images/Images";
import AutorenderLink from "@components/AutorenderLink";
import { MapLeaderboard } from "@customTypes/Map";
import { ticks_to_time, time_ago } from "@utils/Time";
import { API } from "@api/Api";
import useMessage from "@hooks/UseMessage";

import mapsStyles from "@css/Maps.module.css";
import navigationStyles from "@css/Navigation.module.css";
import sectionsStyles from "@css/Sections.module.css";
import profileStyles from "@css/Profile.module.css";
import { classNames } from "@css/utils";

export type LeaderboardStatus = "loading" | "ready" | "empty" | "unavailable" | "error";

export interface LeaderboardResource {
  status: LeaderboardStatus;
  data?: MapLeaderboard;
}

interface LeaderboardsProps {
  activePage: number;
  resource: LeaderboardResource;
  token?: string;
  onPageChange: (page: number) => void;
}

const Leaderboards: React.FC<LeaderboardsProps> = ({ activePage, resource, token, onPageChange }) => {
  const { message, MessageDialogComponent } = useMessage();
  const { data, status } = resource;

  const _download_demo = async (demoID: string) => {
    if (!token) {
      await message("Download Demo", "You must be logged in to download demos.");
      return;
    }

    const [success, errorMessage] = await API.download_demo(token, demoID);
    if (!success) {
      await message("Download Demo", errorMessage);
    }
  };

  if (status === "loading") {
    return <section id="section6" className={mapsStyles.idSection6}></section>;
  }

  if (status === "error") {
    return (
      <section id="section6" className={mapsStyles.idSection6}>
        <h1 className={mapsStyles.centeredText}>Could not load competitive boards.</h1>
      </section>
    );
  }

  if (status === "unavailable" || !data) {
    return (
      <section id="section6" className={mapsStyles.idSection6}>
        <h1 className={mapsStyles.centeredText}>Map is not available for competitive boards.</h1>
      </section>
    );
  }

  if (status === "empty") {
    return (
      <section id="section6" className={mapsStyles.idSection6}>
        <h1 className={mapsStyles.centeredText}>No records found.</h1>
      </section>
    );
  }

  return (
    <div>
      {MessageDialogComponent}
      <section id="section6" className={mapsStyles.idSection6}>
        <div
          id="leaderboard-top"
          className={classNames(
            mapsStyles.idLeaderboardTop,
            sectionsStyles.idLeaderboardTop,
            data.map.is_coop ? mapsStyles.coopLeaderboardHeader : mapsStyles.soloLeaderboardHeader,
          )}
        >
          <span>Place</span>

          {data.map.is_coop ? (
            <div id="runner" className={mapsStyles.idRunner}>
              <span>Blue</span>
              <span>Orange</span>
            </div>
          ) : (
            <span>Runner</span>
          )}

          <span>Portals</span>
          <span>Time</span>
          <span>Date</span>
          <div id="page-number" className={classNames(profileStyles.idPageNumber, sectionsStyles.idPageNumber)}>
            <div>
              <button onClick={() => (activePage === 1 ? null : onPageChange(activePage - 1))}>
                <i className={classNames(navigationStyles.triangle, mapsStyles.previousPageArrow)}></i>{" "}
              </button>
              <span>
                {data.pagination.current_page}/{data.pagination.total_pages}
              </span>
              <button
                onClick={() => (activePage === data.pagination.total_pages ? null : onPageChange(activePage + 1))}
              >
                <i className={classNames(navigationStyles.triangle, mapsStyles.nextPageArrow)}></i>{" "}
              </button>
            </div>
          </div>
        </div>
        <hr />
        <div id="leaderboard-records">
          {data.records.map((r, index) => (
            <span
              className={classNames(
                mapsStyles.leaderboardRecord,
                data.map.is_coop ? mapsStyles.coopLeaderboardRecords : mapsStyles.soloLeaderboardRecords,
              )}
              key={index}
            >
              <span>{r.placement}</span>
              <span> </span>
              {r.kind === "multiplayer" ? (
                <div>
                  <Link to={`/users/${r.host.steam_id}`}>
                    <span>
                      <img src={r.host.avatar_link} alt="" /> &nbsp; {r.host.user_name}
                    </span>
                  </Link>
                  <Link to={`/users/${r.partner.steam_id}`}>
                    <span>
                      <img src={r.partner.avatar_link} alt="" /> &nbsp; {r.partner.user_name}
                    </span>
                  </Link>
                </div>
              ) : (
                r.kind === "singleplayer" && (
                  <div>
                    <Link to={`/users/${r.user.steam_id}`}>
                      <span>
                        <img src={r.user.avatar_link} alt="" /> &nbsp; {r.user.user_name}
                      </span>
                    </Link>
                  </div>
                )
              )}

              <span>{r.score_count}</span>
              <span> </span>
              <span className={mapsStyles.hoverPopup} popup-text={r.score_time + " ticks"}>
                {ticks_to_time(r.score_time)}
              </span>
              <span className={mapsStyles.hoverPopup} popup-text={r.record_date.replace("T", " ").split(".")[0]}>
                {time_ago(new Date(r.record_date.replace("T", " ").replace("Z", "")))}
              </span>

              {r.kind === "multiplayer" ? (
                <span>
                  <button
                    onClick={() => {
                      message(
                        "Demo Information",
                        `Host Demo ID: ${r.host_demo_id} \nParnter Demo ID: ${r.partner_demo_id}`,
                      );
                    }}
                  >
                    <img src={ThreedotIcon} alt="demo_id" />
                  </button>
                  <button title="Download Demo" onClick={() => _download_demo(r.partner_demo_id)}>
                    <img src={DownloadIcon} alt="download" className={mapsStyles.partnerDemoIcon} />
                  </button>
                  <button title="Download Demo" onClick={() => _download_demo(r.host_demo_id)}>
                    <img src={DownloadIcon} alt="download" className={mapsStyles.hostDemoIcon} />
                  </button>
                  {(r.host_autorender_id || r.partner_autorender_id) && (
                    <span className={mapsStyles.videoLinks}>
                      {r.host_autorender_id && (
                        <AutorenderLink autorenderID={r.host_autorender_id} playerLabel="Blue" />
                      )}
                      {r.partner_autorender_id && (
                        <AutorenderLink autorenderID={r.partner_autorender_id} playerLabel="Orange" />
                      )}
                    </span>
                  )}
                </span>
              ) : (
                r.kind === "singleplayer" && (
                  <span>
                    <button
                      onClick={() => {
                        message("Demo Information", `Demo ID: ${r.demo_id}`);
                      }}
                    >
                      <img src={ThreedotIcon} alt="demo_id" />
                    </button>
                    <button title="Download Demo" onClick={() => _download_demo(r.demo_id)}>
                      <img src={DownloadIcon} alt="download" />
                    </button>
                    {r.autorender_id && <AutorenderLink autorenderID={r.autorender_id} />}
                  </span>
                )
              )}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Leaderboards;
