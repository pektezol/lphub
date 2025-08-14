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
    return (
      <div className="flex justify-center items-center h-[50vh] text-lg text-foreground">
        Loading...
      </div>
    );
  }

  return (
    <main className="ml-20 overflow-auto overflow-x-hidden relative w-[calc(100%px)] h-screen font-[--font-barlow-semicondensed-regular] text-foreground text-xl">
      <Helmet>
        <title>LPHUB | {user.user_name}</title>
        <meta name="description" content={user.user_name} />
      </Helmet>
      
      {MessageDialogComponent}

      <section className="m-5 bg-gradient-to-t from-[#202232] from-50% to-[#2b2e46] to-50% rounded-3xl p-[30px] mb-[30px] text-foreground">
        <div className="grid grid-cols-[200px_1fr_auto] items-center gap-[25px] mb-[25px]">
          <img 
            src={user.avatar_link} 
            alt="Profile" 
            className="w-[120px] h-[120px] rounded-full border-[3px] border-[rgba(205,207,223,0.2)]" 
          />
          <div>
            <h1 className="m-0 mb-[10px] text-[50px] font-bold text-white font-[--font-barlow-semicondensed-regular]">
              {user.user_name}
            </h1>
            {user.country_code !== "XX" && (
              <div className="flex items-center gap-3 mb-[15px]">
                <img
                  src={`https://flagcdn.com/w80/${user.country_code.toLowerCase()}.jpg`}
                  alt={user.country_code}
                  className="w-6 h-4 rounded-[10px]"
                />
                <span>{user.country_code}</span>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {user.titles.map((title, index) => (
                <span
                  key={index}
                  className="py-[6px] px-5 pt-[6px] rounded-[10px] text-lg font-normal text-white"
                  style={{ backgroundColor: `#${title.color}` }}
                >
                  {title.name}
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-[15px] items-center pr-[10px]">
            {user.links.steam !== "-" && (
              <a href={user.links.steam} className="flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5">
                <img src={SteamIcon} alt="Steam" className="h-[50px] px-[5px] scale-90 brightness-200" />
              </a>
            )}
            {user.links.twitch !== "-" && (
              <a href={user.links.twitch} className="flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5">
                <img src={TwitchIcon} alt="Twitch" className="h-[50px] px-[5px] scale-90 brightness-200" />
              </a>
            )}
            {user.links.youtube !== "-" && (
              <a href={user.links.youtube} className="flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5">
                <img src={YouTubeIcon} alt="YouTube" className="h-[50px] px-[5px] scale-90 brightness-200" />
              </a>
            )}
            {user.links.p2sr !== "-" && (
              <a href={user.links.p2sr} className="flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5">
                <img src={PortalIcon} alt="P2SR" className="h-[50px] px-[5px] scale-90 brightness-200" />
              </a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-24">
          <div className="m-3 bg-[#2b2e46] rounded-[20px] p-5 text-center grid place-items-center grid-rows-[40%_50%]">
            <div className="text-inherit text-lg">Overall</div>
            <div className="text-white text-[40px]">
              {user.rankings.overall.rank === 0 ? "N/A" : `#${user.rankings.overall.rank}`}
            </div>
            <div className="text-white text-xl">
              {user.rankings.overall.completion_count}/{user.rankings.overall.completion_total}
            </div>
          </div>
          <div className="m-3 bg-[#2b2e46] rounded-[20px] p-5 text-center grid place-items-center grid-rows-[40%_50%]">
            <div className="text-inherit text-lg">Singleplayer</div>
            <div className="text-white text-[40px]">
              {user.rankings.singleplayer.rank === 0 ? "N/A" : `#${user.rankings.singleplayer.rank}`}
            </div>
            <div className="text-white text-xl">
              {user.rankings.singleplayer.completion_count}/{user.rankings.singleplayer.completion_total}
            </div>
          </div>
          <div className="m-3 bg-[#2b2e46] rounded-[20px] p-5 text-center grid place-items-center grid-rows-[40%_50%]">
            <div className="text-inherit text-lg">Cooperative</div>
            <div className="text-white text-[40px]">
              {user.rankings.cooperative.rank === 0 ? "N/A" : `#${user.rankings.cooperative.rank}`}
            </div>
            <div className="text-white text-xl">
              {user.rankings.cooperative.completion_count}/{user.rankings.cooperative.completion_total}
            </div>
          </div>
        </div>
      </section>

      <section className="m-5 h-[60px] grid grid-cols-2">
        <button 
          className={`flex justify-center items-center gap-2 bg-[#2b2e46] border-0 text-inherit font-inherit text-2xl cursor-pointer transition-colors duration-100 rounded-l-3xl hover:bg-[#202232] ${
            navState === 0 ? 'bg-[#202232]' : ''
          }`}
          onClick={() => setNavState(0)}
        >
          <img src={FlagIcon} alt="" className="w-5 h-5 scale-[1.2]" />
          Player Records
        </button>
        <button 
          className={`flex justify-center items-center gap-2 bg-[#2b2e46] border-0 text-inherit font-inherit text-2xl cursor-pointer transition-colors duration-100 rounded-r-3xl hover:bg-[#202232] ${
            navState === 1 ? 'bg-[#202232]' : ''
          }`}
          onClick={() => setNavState(1)}
        >
          <img src={StatisticsIcon} alt="" className="w-5 h-5 scale-[1.2]" />
          Statistics
        </button>
      </section>

      {navState === 0 && (
        <section className="m-5 block bg-[#202232] rounded-3xl overflow-hidden">
          <div className="grid grid-cols-2 mx-5 my-5 mt-[10px] mb-5">
            <select
              className="h-[50px] rounded-3xl text-center text-inherit font-inherit text-2xl border-0 bg-[#2b2e46] mr-[10px]"
              value={game}
              onChange={(e) => {
                setGame(e.target.value);
                setChapter("0");
              }}
            >
              <option value="0">All Games</option>
              {gameData?.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>

            <select
              className="h-[50px] rounded-3xl text-center text-inherit font-inherit text-2xl border-0 bg-[#2b2e46] mr-[10px] disabled:opacity-50"
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
              disabled={game === "0"}
            >
              <option value="0">All Chapters</option>
              {chapterData?.chapters
                .filter(c => !c.is_disabled)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="h-[34px] grid text-xl pl-[60px] mx-5 my-0 grid-cols-[15%_15%_5%_15%_5%_15%_15%_15%]">
            <div className="flex place-items-end cursor-pointer">
              <span>Map Name</span>
              <img src={SortIcon} alt="Sort" className="h-5 scale-[0.8]" />
            </div>
            <div className="flex place-items-end cursor-pointer">
              <span>Portals</span>
              <img src={SortIcon} alt="Sort" className="h-5 scale-[0.8]" />
            </div>
            <div className="flex place-items-end cursor-pointer">
              <span>WRΔ</span>
              <img src={SortIcon} alt="Sort" className="h-5 scale-[0.8]" />
            </div>
            <div className="flex place-items-end cursor-pointer">
              <span>Time</span>
              <img src={SortIcon} alt="Sort" className="h-5 scale-[0.8]" />
            </div>
            <div></div>
            <div className="flex place-items-end cursor-pointer">
              <span>Rank</span>
              <img src={SortIcon} alt="Sort" className="h-5 scale-[0.8]" />
            </div>
            <div className="flex place-items-end cursor-pointer">
              <span>Date</span>
              <img src={SortIcon} alt="Sort" className="h-5 scale-[0.8]" />
            </div>
            <div className="flex items-center gap-[10px] justify-center">
              <button
                className="w-8 h-8 border border-[#2b2e46] bg-[#2b2e46] rounded cursor-pointer flex items-center justify-center text-foreground transition-colors duration-100 hover:bg-[#202232] disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                disabled={pageNumber === 1}
              >
                ←
              </button>
              <span className="text-sm text-foreground">{pageNumber}/{pageMax}</span>
              <button
                className="w-8 h-8 border border-[#2b2e46] bg-[#2b2e46] rounded cursor-pointer flex items-center justify-center text-foreground transition-colors duration-100 hover:bg-[#202232] disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setPageNumber(Math.min(pageMax, pageNumber + 1))}
                disabled={pageNumber === pageMax}
              >
                →
              </button>
            </div>
          </div>

          <div>
            {game === "0" ? (
              user.records
                .sort((a, b) => a.map_id - b.map_id)
                .map((record, index) =>
                  Math.ceil((index + 1) / 20) === pageNumber ? (
                    <div key={index} className="w-[calc(100%-40px)] mx-5 my-0 mt-[10px] h-11 rounded-[20px] pl-[40px] text-xl text-inherit font-inherit border-0 transition-colors duration-100 bg-[#2b2e46] grid grid-cols-[15%_15%_5%_15%_5%_15%_15%_15%] overflow-hidden whitespace-nowrap cursor-pointer hover:bg-[#202232]">
                      <Link to={`/maps/${record.map_id}`} className="text-[#3c91e6] no-underline font-inherit flex place-items-center h-11 hover:underline">
                        {record.map_name}
                      </Link>
                      <span className="flex place-items-center h-11">{record.scores[0]?.score_count || 'N/A'}</span>
                      <span className={`flex place-items-center h-11 ${record.scores[0]?.score_count - record.map_wr_count > 0 ? 'text-[#dc3545]' : ''}`}>
                        {record.scores[0]?.score_count - record.map_wr_count > 0
                          ? `+${record.scores[0].score_count - record.map_wr_count}`
                          : '–'}
                      </span>
                      <span className="flex place-items-center h-11">{record.scores[0] ? ticks_to_time(record.scores[0].score_time) : 'N/A'}</span>
                      <span className="flex place-items-center h-11"></span>
                      <span className="flex place-items-center h-11 font-semibold">#{record.placement}</span>
                      <span className="flex place-items-center h-11">{record.scores[0]?.date.split("T")[0] || 'N/A'}</span>
                      <div className="flex gap-[5px] justify-end flex-row-reverse place-items-center h-11">
                        <button
                          className="bg-transparent border-0 cursor-pointer transition-colors duration-100 p-0.5 hover:bg-[rgba(32,34,50,0.5)]"
                          onClick={() => message("Demo Information", `Demo ID: ${record.scores[0]?.demo_id}`)}
                          title="Demo Info"
                        >
                          <img src={ThreedotIcon} alt="Info" className="w-4 h-4" />
                        </button>
                        <button
                          className="bg-transparent border-0 cursor-pointer transition-colors duration-100 p-0.5 hover:bg-[rgba(32,34,50,0.5)]"
                          onClick={() => window.location.href = `/api/v1/demos?uuid=${record.scores[0]?.demo_id}`}
                          title="Download Demo"
                        >
                          <img src={DownloadIcon} alt="Download" className="w-4 h-4" />
                        </button>
                        {record.scores.length > 1 && (
                          <button className="bg-transparent border-0 cursor-pointer transition-colors duration-100 p-0.5 hover:bg-[rgba(32,34,50,0.5)]" title="View History">
                            <img src={HistoryIcon} alt="History" className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ) : null
                )
            ) : (
              maps
                ?.filter(map => !map.is_disabled)
                .sort((a, b) => a.id - b.id)
                .map((map, index) => {
                  if (Math.ceil((index + 1) / 20) !== pageNumber) return null;
                  
                  const record = user.records.find(r => r.map_id === map.id);
                  
                  return (
                    <div key={index} className={`w-[calc(100%-40px)] mx-5 my-0 mt-[10px] h-11 rounded-[20px] pl-[40px] text-xl text-inherit font-inherit border-0 transition-colors duration-100 bg-[#2b2e46] grid grid-cols-[15%_15%_5%_15%_5%_15%_15%_15%] overflow-hidden whitespace-nowrap cursor-pointer hover:bg-[#202232] ${!record ? 'opacity-65' : ''}`}>
                      <Link to={`/maps/${map.id}`} className="text-[#3c91e6] no-underline font-inherit flex place-items-center h-11 hover:underline">
                        {map.name}
                      </Link>
                      <span className="flex place-items-center h-11">{record?.scores[0]?.score_count || 'N/A'}</span>
                      <span className={`flex place-items-center h-11 ${record?.scores[0]?.score_count && record.scores[0].score_count - record.map_wr_count > 0 ? 'text-[#dc3545]' : ''}`}>
                        {record?.scores[0]?.score_count && record.scores[0].score_count - record.map_wr_count > 0
                          ? `+${record.scores[0].score_count - record.map_wr_count}`
                          : '–'}
                      </span>
                      <span className="flex place-items-center h-11">{record?.scores[0] ? ticks_to_time(record.scores[0].score_time) : 'N/A'}</span>
                      <span className="flex place-items-center h-11"></span>
                      <span className="flex place-items-center h-11 font-semibold">{record ? `#${record.placement}` : 'N/A'}</span>
                      <span className="flex place-items-center h-11">{record?.scores[0]?.date.split("T")[0] || 'N/A'}</span>
                      <div className="flex gap-[5px] justify-end flex-row-reverse place-items-center h-11">
                        {record?.scores[0] && (
                          <>
                            <button
                              className="bg-transparent border-0 cursor-pointer transition-colors duration-100 p-0.5 hover:bg-[rgba(32,34,50,0.5)]"
                              onClick={() => message("Demo Information", `Demo ID: ${record.scores[0].demo_id}`)}
                              title="Demo Info"
                            >
                              <img src={ThreedotIcon} alt="Info" className="w-4 h-4" />
                            </button>
                            <button
                              className="bg-transparent border-0 cursor-pointer transition-colors duration-100 p-0.5 hover:bg-[rgba(32,34,50,0.5)]"
                              onClick={() => window.location.href = `/api/v1/demos?uuid=${record.scores[0].demo_id}`}
                              title="Download Demo"
                            >
                              <img src={DownloadIcon} alt="Download" className="w-4 h-4" />
                            </button>
                            {record.scores.length > 1 && (
                              <button className="bg-transparent border-0 cursor-pointer transition-colors duration-100 p-0.5 hover:bg-[rgba(32,34,50,0.5)]" title="View History">
                                <img src={HistoryIcon} alt="History" className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </section>
      )}
    </main>
  );
};

export default User;
