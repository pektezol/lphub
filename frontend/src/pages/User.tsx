import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";

import {
  SteamIcon,
  TwitchIcon,
  YouTubeIcon,
  PortalIcon,
  FlagIcon,
  StatisticsIcon,
  SortIcon,
  ThreedotIcon,
  DownloadIcon,
  HistoryIcon,
} from "@images/Images";
import { UserProfile } from "@customTypes/Profile";
import { Game, GameChapters } from "@customTypes/Game";
import { Map } from "@customTypes/Map";
import { API } from "@api/Api";
import { ticks_to_time } from "@utils/Time";
import useMessage from "@hooks/UseMessage";

interface UserProps {
  profile?: UserProfile;
  token?: string;
  gameData: Game[];
}

const User: React.FC<UserProps> = ({ token, profile, gameData }) => {
  const { message, MessageDialogComponent } = useMessage();

  const [user, setUser] = React.useState<UserProfile | undefined>(undefined);

  const [navState, setNavState] = React.useState(0);
  const [pageNumber, setPageNumber] = React.useState(1);
  const [pageMax, setPageMax] = React.useState(0);

  const [game, setGame] = React.useState("0");
  const [chapter, setChapter] = React.useState("0");
  const [chapterData, setChapterData] = React.useState<GameChapters | null>(
    null
  );
  const [maps, setMaps] = React.useState<Map[]>([]);

  const location = useLocation();
  const navigate = useNavigate();

  const _fetch_user = React.useCallback(async () => {
    const userID = location.pathname.split("/")[2];
    if (token && profile && profile.profile && profile.steam_id === userID) {
      navigate("/profile");
      return;
    }
    const userData = await API.get_user(userID);
    setUser(userData);
  }, [location.pathname, token, profile, navigate]);

  const _get_game_chapters = React.useCallback(async () => {
    if (game !== "0") {
      const gameChapters = await API.get_games_chapters(game);
      setChapterData(gameChapters);
    } else {
      setPageMax(Math.ceil(user!.records.length / 20));
      setPageNumber(1);
    }
  }, [game, user]);

  const _get_game_maps = React.useCallback(async () => {
    if (chapter === "0") {
      const gameMaps = await API.get_game_maps(game);
      setMaps(gameMaps);
      setPageMax(Math.ceil(gameMaps.length / 20));
      setPageNumber(1);
    } else {
      const gameChapters = await API.get_chapters(chapter);
      setMaps(gameChapters.maps);
      setPageMax(Math.ceil(gameChapters.maps.length / 20));
      setPageNumber(1);
    }
  }, [chapter, game]);

  React.useEffect(() => {
    _fetch_user();
  }, [location, _fetch_user]);

  React.useEffect(() => {
    if (user) {
      _get_game_chapters();
    }
  }, [user, game, location, _get_game_chapters]);

  React.useEffect(() => {
    if (user && game !== "0") {
      _get_game_maps();
    }
  }, [user, game, chapter, location, _get_game_maps]);

  if (!user) {
    return <></>;
  }

  return (
    <main>
      <Helmet>
        <title>LPHUB | {user.user_name}</title>
        <meta name="description" content={user.user_name} />
      </Helmet>
      {MessageDialogComponent}
      <section id="section1" className="profile">
        <div>
          <img src={user.avatar_link} alt="profile-image"></img>
        </div>
        <div id="profile-top">
          <div>
            <div>{user.user_name}</div>
            <div>
              {user.country_code === "XX" ? (
                ""
              ) : (
                <img
                  src={`https://flagcdn.com/w80/${user.country_code.toLowerCase()}.jpg`}
                  alt={user.country_code}
                />
              )}
            </div>
            <div>
              {user.titles.map(e => (
                <span
                  className="titles"
                  style={{ backgroundColor: `#${e.color}` }}
                >
                  {e.name}
                </span>
              ))}
            </div>
          </div>
          <div>
            {user.links.steam === "-" ? (
              ""
            ) : (
              <a href={user.links.steam}>
                <img src={SteamIcon} alt="Steam" />
              </a>
            )}
            {user.links.twitch === "-" ? (
              ""
            ) : (
              <a href={user.links.twitch}>
                <img src={TwitchIcon} alt="Twitch" />
              </a>
            )}
            {user.links.youtube === "-" ? (
              ""
            ) : (
              <a href={user.links.youtube}>
                <img src={YouTubeIcon} alt="Youtube" />
              </a>
            )}
            {user.links.p2sr === "-" ? (
              ""
            ) : (
              <a href={user.links.p2sr}>
                <img src={PortalIcon} alt="P2SR" style={{ padding: "0" }} />
              </a>
            )}
          </div>
        </div>
        <div id="profile-bottom">
          <div>
            <span>Overall</span>
            <span>
              {user.rankings.overall.rank === 0
                ? "N/A "
                : "#" + user.rankings.overall.rank + " "}
              <span>
                ({user.rankings.overall.completion_count}/
                {user.rankings.overall.completion_total})
              </span>
            </span>
          </div>
          <div>
            <span>Singleplayer</span>
            <span>
              {user.rankings.singleplayer.rank === 0
                ? "N/A "
                : "#" + user.rankings.singleplayer.rank + " "}
              <span>
                ({user.rankings.singleplayer.completion_count}/
                {user.rankings.singleplayer.completion_total})
              </span>
            </span>
          </div>
          <div>
            <span>Cooperative</span>
            <span>
              {user.rankings.cooperative.rank === 0
                ? "N/A "
                : "#" + user.rankings.cooperative.rank + " "}
              <span>
                ({user.rankings.cooperative.completion_count}/
                {user.rankings.cooperative.completion_total})
              </span>
            </span>
          </div>
        </div>
      </section>

      <section id="section2" className="profile">
        <button onClick={() => setNavState(0)}>
          <img src={FlagIcon} alt="" />
          &nbsp;Player Records
        </button>
        <button onClick={() => setNavState(1)}>
          <img src={StatisticsIcon} alt="" />
          &nbsp;Statistics
        </button>
      </section>

      <section id="section3" className="profile1">
        <div id="profileboard-nav">
          {gameData === null ? (
            <select>error</select>
          ) : (
            <select
              id="select-game"
              onChange={() => {
                setGame(
                  (document.querySelector("#select-game") as HTMLInputElement)
                    .value
                );
                setChapter("0");
                const chapterSelect = document.querySelector(
                  "#select-chapter"
                ) as HTMLSelectElement;
                if (chapterSelect) {
                  chapterSelect.value = "0";
                }
              }}
            >
              <option value={0} key={0}>
                All Scores
              </option>
              {gameData.map((e, i) => (
                <option value={e.id} key={i + 1}>
                  {e.name}
                </option>
              ))}
            </select>
          )}

          {game === "0" ? (
            <select disabled>
              <option>All Chapters</option>
            </select>
          ) : chapterData === null ? (
            <select></select>
          ) : (
            <select
              id="select-chapter"
              onChange={() =>
                setChapter(
                  (
                    document.querySelector(
                      "#select-chapter"
                    ) as HTMLInputElement
                  ).value
                )
              }
            >
              <option value="0" key="0">
                All Chapters
              </option>
              {chapterData.chapters
                .filter(e => e.is_disabled === false)
                .map((e, i) => (
                  <option value={e.id} key={i + 1}>
                    {e.name}
                  </option>
                ))}
            </select>
          )}
        </div>
        <div id="profileboard-top">
          <span>
            <span>Map Name</span>
            <img src={SortIcon} alt="" />
          </span>
          <span style={{ justifyContent: "center" }}>
            <span>Portals</span>
            <img src={SortIcon} alt="" />
          </span>
          <span style={{ justifyContent: "center" }}>
            <span>WRΔ </span>
            <img src={SortIcon} alt="" />
          </span>
          <span style={{ justifyContent: "center" }}>
            <span>Time</span>
            <img src={SortIcon} alt="" />
          </span>
          <span> </span>
          <span>
            <span>Rank</span>
            <img src={SortIcon} alt="" />
          </span>
          <span>
            <span>Date</span>
            <img src={SortIcon} alt="" />
          </span>
          <div id="page-number">
            <div>
              <button
                onClick={() => {
                  if (pageNumber !== 1) {
                    setPageNumber(prevPageNumber => prevPageNumber - 1);
                    const records = document.querySelectorAll(
                      ".profileboard-record"
                    );
                    records.forEach(r => {
                      (r as HTMLInputElement).style.height = "44px";
                    });
                  }
                }}
              >
                <i
                  className="triangle"
                  style={{ position: "relative", left: "-5px" }}
                ></i>{" "}
              </button>
              <span>
                {pageNumber}/{pageMax}
              </span>
              <button
                onClick={() => {
                  if (pageNumber !== pageMax) {
                    setPageNumber(prevPageNumber => prevPageNumber + 1);
                    const records = document.querySelectorAll(
                      ".profileboard-record"
                    );
                    records.forEach(r => {
                      (r as HTMLInputElement).style.height = "44px";
                    });
                  }
                }}
              >
                <i
                  className="triangle"
                  style={{
                    position: "relative",
                    left: "5px",
                    transform: "rotate(180deg)",
                  }}
                ></i>{" "}
              </button>
            </div>
          </div>
        </div>
        <hr />
        <div id="profileboard-records">
          {game === "0" ? (
            user.records
              .sort((a, b) => a.map_id - b.map_id)
              .map((r, index) =>
                Math.ceil((index + 1) / 20) === pageNumber ? (
                  <button className="profileboard-record" key={index}>
                    {r.scores.map((e, i) => (
                      <>
                        {i !== 0 ? (
                          <hr style={{ gridColumn: "1 / span 8" }} />
                        ) : (
                          ""
                        )}

                        <Link to={`/maps/${r.map_id}`}>
                          <span>{r.map_name}</span>
                        </Link>

                        <span style={{ display: "grid" }}>{e.score_count}</span>

                        <span style={{ display: "grid" }}>
                          {e.score_count - r.map_wr_count > 0
                            ? `+${e.score_count - r.map_wr_count}`
                            : `-`}
                        </span>
                        <span style={{ display: "grid" }}>
                          {ticks_to_time(e.score_time)}
                        </span>
                        <span> </span>
                        {i === 0 ? <span>#{r.placement}</span> : <span> </span>}
                        <span>{e.date.split("T")[0]}</span>
                        <span style={{ flexDirection: "row-reverse" }}>
                          <button
                            onClick={() => {
                              message(
                                "Demo Information",
                                `Demo ID: ${e.demo_id}`
                              );
                            }}
                          >
                            <img src={ThreedotIcon} alt="demo_id" />
                          </button>
                          <button
                            onClick={() =>
                              (window.location.href = `/api/v1/demos?uuid=${e.demo_id}`)
                            }
                          >
                            <img src={DownloadIcon} alt="download" />
                          </button>
                          {i === 0 && r.scores.length > 1 ? (
                            <button
                              onClick={() => {
                                (
                                  document.querySelectorAll(
                                    ".profileboard-record"
                                  )[index % 20] as HTMLInputElement
                                ).style.height === "44px" ||
                                (
                                  document.querySelectorAll(
                                    ".profileboard-record"
                                  )[index % 20] as HTMLInputElement
                                ).style.height === ""
                                  ? ((
                                      document.querySelectorAll(
                                        ".profileboard-record"
                                      )[index % 20] as HTMLInputElement
                                    ).style.height =
                                      `${r.scores.length * 46}px`)
                                  : ((
                                      document.querySelectorAll(
                                        ".profileboard-record"
                                      )[index % 20] as HTMLInputElement
                                    ).style.height = "44px");
                              }}
                            >
                              <img src={HistoryIcon} alt="history" />
                            </button>
                          ) : (
                            ""
                          )}
                        </span>
                      </>
                    ))}
                  </button>
                ) : (
                  ""
                )
              )
          ) : maps ? (
            maps
              .filter(e => e.is_disabled === false)
              .sort((a, b) => a.id - b.id)
              .map((r, index) => {
                if (Math.ceil((index + 1) / 20) === pageNumber) {
                  let record = user.records.find(e => e.map_id === r.id);
                  return record === undefined ? (
                    <button
                      className="profileboard-record"
                      key={index}
                      style={{ backgroundColor: "#1b1b20" }}
                    >
                      <Link to={`/maps/${r.id}`}>
                        <span>{r.name}</span>
                      </Link>
                      <span style={{ display: "grid" }}>N/A</span>
                      <span style={{ display: "grid" }}>N/A</span>
                      <span>N/A</span>
                      <span> </span>
                      <span>N/A</span>
                      <span>N/A</span>
                      <span style={{ flexDirection: "row-reverse" }}></span>
                    </button>
                  ) : (
                    <button className="profileboard-record" key={index}>
                      {record.scores.map((e, i) => (
                        <>
                          {i !== 0 ? (
                            <hr style={{ gridColumn: "1 / span 8" }} />
                          ) : (
                            ""
                          )}
                          <Link to={`/maps/${r.id}`}>
                            <span>{r.name}</span>
                          </Link>
                          <span style={{ display: "grid" }}>
                            {record!.scores[i].score_count}
                          </span>
                          <span style={{ display: "grid" }}>
                            {record!.scores[i].score_count -
                              record!.map_wr_count >
                            0
                              ? `+${record!.scores[i].score_count - record!.map_wr_count}`
                              : `-`}
                          </span>
                          <span style={{ display: "grid" }}>
                            {ticks_to_time(record!.scores[i].score_time)}
                          </span>
                          <span> </span>
                          {i === 0 ? (
                            <span>#{record!.placement}</span>
                          ) : (
                            <span> </span>
                          )}
                          <span>{record!.scores[i].date.split("T")[0]}</span>
                          <span style={{ flexDirection: "row-reverse" }}>
                            <button
                              onClick={() => {
                                message(
                                  "Demo Information",
                                  `Demo ID: ${e.demo_id}`
                                );
                              }}
                            >
                              <img src={ThreedotIcon} alt="demo_id" />
                            </button>
                            <button
                              onClick={() =>
                                (window.location.href = `/api/v1/demos?uuid=${e.demo_id}`)
                              }
                            >
                              <img src={DownloadIcon} alt="download" />
                            </button>
                            {i === 0 && record!.scores.length > 1 ? (
                              <button
                                onClick={() => {
                                  (
                                    document.querySelectorAll(
                                      ".profileboard-record"
                                    )[index % 20] as HTMLInputElement
                                  ).style.height === "44px" ||
                                  (
                                    document.querySelectorAll(
                                      ".profileboard-record"
                                    )[index % 20] as HTMLInputElement
                                  ).style.height === ""
                                    ? ((
                                        document.querySelectorAll(
                                          ".profileboard-record"
                                        )[index % 20] as HTMLInputElement
                                      ).style.height =
                                        `${record!.scores.length * 46}px`)
                                    : ((
                                        document.querySelectorAll(
                                          ".profileboard-record"
                                        )[index % 20] as HTMLInputElement
                                      ).style.height = "44px");
                                }}
                              >
                                <img src={HistoryIcon} alt="history" />
                              </button>
                            ) : (
                              ""
                            )}
                          </span>
                        </>
                      ))}
                    </button>
                  );
                } else {
                  return null;
                }
              })
          ) : (
            <>{console.warn(maps)}</>
          )}
        </div>
      </section>
    </main>
  );
};

export default User;
