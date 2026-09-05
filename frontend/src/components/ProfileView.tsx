import React from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";

import { API } from "@api/Api";
import "@css/Profile.css";
import type { Game, GameChapters } from "@customTypes/Game";
import type { Map as GameMap } from "@customTypes/Map";
import type { UserProfile } from "@customTypes/Profile";
import useConfirm from "@hooks/UseConfirm";
import useMessage from "@hooks/UseMessage";
import useMessageLoad from "@hooks/UseMessageLoad";
import {
  DeleteIcon,
  DownloadIcon,
  FlagIcon,
  HistoryIcon,
  PortalIcon,
  SortIcon,
  StatisticsIcon,
  SteamIcon,
  ThreedotIcon,
  TwitchIcon,
  YouTubeIcon,
} from "@images/Images";
import { ticks_to_time } from "@utils/Time";

const profilePageSize = 20;
const mapNameCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

type ProfileRecordSortKey = "mapName" | "portals" | "wrDelta" | "time" | "rank" | "date";
type ProfileRecordSortDirection = "ascending" | "descending";

interface ProfileRecordSort {
  key: ProfileRecordSortKey;
  direction: ProfileRecordSortDirection;
}

interface ProfileBoardRow {
  mapID: number;
  mapName: string;
  record?: UserProfile["records"][number];
}

export interface ProfileViewProps {
  profile: UserProfile;
  games: Game[];
  viewerToken?: string;
  editable?: boolean;
  onProfileRefresh?: () => void | Promise<void>;
}

const isScoreBasedSort = (key: ProfileRecordSortKey): boolean => key !== "mapName";

const getProfileRecordSortValue = (
  row: ProfileBoardRow,
  key: ProfileRecordSortKey,
): string | number | undefined => {
  const score = row.record?.scores[0];

  switch (key) {
  case "mapName":
    return row.mapName;
  case "portals":
    return score?.score_count;
  case "wrDelta":
    return score && row.record ? score.score_count - row.record.map_wr_count : undefined;
  case "time":
    return score?.score_time;
  case "rank":
    return row.record?.placement;
  case "date": {
    if (!score) {
      return undefined;
    }

    const date = Date.parse(score.date);
    return Number.isNaN(date) ? undefined : date;
  }
  }
};

const compareProfileBoardRows = (
  first: ProfileBoardRow,
  second: ProfileBoardRow,
  sort: ProfileRecordSort | null,
): number => {
  if (!sort) {
    return first.mapID - second.mapID;
  }

  if (isScoreBasedSort(sort.key) && (first.record === undefined) !== (second.record === undefined)) {
    return first.record === undefined ? 1 : -1;
  }

  const firstValue = getProfileRecordSortValue(first, sort.key);
  const secondValue = getProfileRecordSortValue(second, sort.key);

  if (firstValue === undefined && secondValue === undefined) {
    return first.mapID - second.mapID;
  }
  if (firstValue === undefined) {
    return 1;
  }
  if (secondValue === undefined) {
    return -1;
  }

  const comparison = typeof firstValue === "string" && typeof secondValue === "string"
    ? mapNameCollator.compare(firstValue, secondValue)
    : Number(firstValue) - Number(secondValue);

  if (comparison === 0) {
    return first.mapID - second.mapID;
  }

  return sort.direction === "ascending" ? comparison : -comparison;
};

const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  games,
  viewerToken,
  editable = false,
  onProfileRefresh,
}) => {
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const { message, MessageDialogComponent } = useMessage();
  const { messageLoad, messageLoadClose, MessageDialogLoadComponent } = useMessageLoad();
  const [pageNumber, setPageNumber] = React.useState(1);
  const [sort, setSort] = React.useState<ProfileRecordSort | null>(null);
  const [expandedRecordIDs, setExpandedRecordIDs] = React.useState<Set<number>>(() => new Set());
  const [game, setGame] = React.useState("0");
  const [chapter, setChapter] = React.useState("0");
  const [chapterData, setChapterData] = React.useState<GameChapters | null>(null);
  const [maps, setMaps] = React.useState<GameMap[]>([]);

  const canEdit = editable && Boolean(viewerToken);

  const profileBoardRows = React.useMemo<ProfileBoardRow[]>(() => {
    if (game === "0") {
      return profile.records.map((record) => ({
        mapID: record.map_id,
        mapName: record.map_name,
        record,
      }));
    }

    const recordsByMapID = new globalThis.Map(profile.records.map((record) => [record.map_id, record]));
    return maps
      .filter((map) => !map.is_disabled)
      .map((map) => ({
        mapID: map.id,
        mapName: map.name,
        record: recordsByMapID.get(map.id),
      }));
  }, [game, maps, profile.records]);

  const sortedProfileBoardRows = React.useMemo(
    () => [...profileBoardRows].sort((first, second) => compareProfileBoardRows(first, second, sort)),
    [profileBoardRows, sort],
  );
  const pageMax = Math.max(1, Math.ceil(sortedProfileBoardRows.length / profilePageSize));
  const currentPage = Math.min(pageNumber, pageMax);
  const pageRows = sortedProfileBoardRows.slice(
    (currentPage - 1) * profilePageSize,
    currentPage * profilePageSize,
  );

  const resetBoard = () => {
    setPageNumber(1);
    setExpandedRecordIDs(new Set());
  };

  const updateProfile = async () => {
    if (!canEdit || !viewerToken) {
      return;
    }

    try {
      await API.post_profile(viewerToken);
      await onProfileRefresh?.();
    } catch {
      await message("Refresh Profile", "Could not refresh profile.");
    }
  };

  const deleteSubmission = async (mapID: number, recordID: number) => {
    if (!canEdit || !viewerToken) {
      return;
    }

    const userConfirmed = await confirm("Delete Record", "Are you sure you want to delete this record?");
    if (!userConfirmed) {
      return;
    }

    messageLoad("Deleting...");
    try {
      const apiSuccess = await API.delete_map_record(viewerToken, mapID, recordID);
      messageLoadClose();
      if (!apiSuccess) {
        await message("Delete Record", "Could not delete record.");
        return;
      }

      await message("Delete Record", "Successfully deleted record.");
      await onProfileRefresh?.();
    } catch {
      messageLoadClose();
      await message("Delete Record", "Could not delete record.");
    }
  };

  const downloadDemo = async (demoID: string) => {
    if (!viewerToken) {
      await message("Download Demo", "You must be logged in to download demos.");
      return;
    }

    try {
      const [success, errorMessage] = await API.download_demo(viewerToken, demoID);
      if (!success) {
        await message("Download Demo", errorMessage);
      }
    } catch {
      await message("Download Demo", "Could not download demo.");
    }
  };

  const toggleRecordHistory = (mapID: number) => {
    setExpandedRecordIDs((currentExpandedRecordIDs) => {
      const nextExpandedRecordIDs = new Set(currentExpandedRecordIDs);
      if (nextExpandedRecordIDs.has(mapID)) {
        nextExpandedRecordIDs.delete(mapID);
      } else {
        nextExpandedRecordIDs.add(mapID);
      }
      return nextExpandedRecordIDs;
    });
  };

  const sortRecords = (key: ProfileRecordSortKey) => {
    setSort((currentSort) => ({
      key,
      direction: currentSort?.key === key && currentSort.direction === "ascending"
        ? "descending"
        : "ascending",
    }));
    resetBoard();
  };

  const renderSortHeader = (key: ProfileRecordSortKey, label: string) => {
    const isActive = sort?.key === key;
    const direction = isActive ? sort.direction : undefined;
    const nextDirection = direction === "ascending" ? "descending" : "ascending";

    return (
      <button
        type="button"
        className={`profileboard-sort-button${isActive ? ` is-${direction}` : ""}`}
        onClick={() => sortRecords(key)}
        aria-pressed={isActive}
        aria-label={`Sort by ${label} ${nextDirection}`}
        title={`Sort by ${label} ${nextDirection}`}
      >
        <span>{label}</span>
        <img src={SortIcon} alt="" />
      </button>
    );
  };

  const renderProfileBoardRow = (row: ProfileBoardRow) => {
    if (!row.record) {
      return (
        <div className="profileboard-record" key={row.mapID} style={{ backgroundColor: "#1b1b20" }}>
          <Link to={`/maps/${row.mapID}`}><span>{row.mapName}</span></Link>
          <span style={{ display: "grid" }}>N/A</span>
          <span style={{ display: "grid" }}>N/A</span>
          <span>N/A</span>
          <span> </span>
          <span>N/A</span>
          <span>N/A</span>
          <span style={{ flexDirection: "row-reverse" }} />
        </div>
      );
    }

    const record = row.record;
    return (
      <div
        className="profileboard-record"
        key={row.mapID}
        style={expandedRecordIDs.has(row.mapID) ? { height: `${record.scores.length * 46}px` } : undefined}
      >
        {record.scores.map((score, index) => (
          <React.Fragment key={score.record_id}>
            {index !== 0 && <hr style={{ gridColumn: "1 / span 8" }} />}
            <Link to={`/maps/${row.mapID}`}><span>{row.mapName}</span></Link>
            <span style={{ display: "grid" }}>{score.score_count}</span>
            <span style={{ display: "grid" }}>
              {score.score_count - record.map_wr_count > 0 ? `+${score.score_count - record.map_wr_count}` : "-"}
            </span>
            <span style={{ display: "grid" }}>{ticks_to_time(score.score_time)}</span>
            <span> </span>
            {index === 0 ? <span>#{record.placement}</span> : <span> </span>}
            <span>{score.date.split("T")[0]}</span>
            <span style={{ flexDirection: "row-reverse" }}>
              <button
                type="button"
                style={{ marginRight: "10px" }}
                onClick={() => { void message("Demo Information", `Demo ID: ${score.demo_id}`); }}
                aria-label="Demo information"
              >
                <img src={ThreedotIcon} alt="demo_id" />
              </button>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => { void deleteSubmission(row.mapID, score.record_id); }}
                  aria-label="Delete record"
                >
                  <img src={DeleteIcon} alt="delete" />
                </button>
              )}
              <button type="button" onClick={() => { void downloadDemo(score.demo_id); }} aria-label="Download demo">
                <img src={DownloadIcon} alt="download" />
              </button>
              {index === 0 && record.scores.length > 1 && (
                <button type="button" onClick={() => toggleRecordHistory(row.mapID)} aria-label="Toggle record history">
                  <img src={HistoryIcon} alt="history" />
                </button>
              )}
            </span>
          </React.Fragment>
        ))}
      </div>
    );
  };

  React.useEffect(() => {
    if (game === "0") {
      setChapterData(null);
      return;
    }

    let cancelled = false;
    setChapterData(null);

    void (async () => {
      try {
        const gameChapters = await API.get_games_chapters(game);
        if (!cancelled) {
          setChapterData(gameChapters ?? null);
        }
      } catch {
        if (!cancelled) {
          setChapterData(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [game]);

  React.useEffect(() => {
    if (game === "0") {
      setMaps([]);
      return;
    }

    let cancelled = false;
    setMaps([]);

    void (async () => {
      try {
        const gameMaps = chapter === "0"
          ? await API.get_game_maps(game)
          : (await API.get_chapters(chapter))?.maps ?? [];
        if (!cancelled) {
          setMaps(gameMaps);
        }
      } catch {
        if (!cancelled) {
          setMaps([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chapter, game]);

  React.useEffect(() => {
    resetBoard();
  }, [profile]);

  return (
    <>
      <Helmet>
        <title>LPHUB | {profile.user_name}</title>
        <meta name="description" content={profile.user_name} />
      </Helmet>
      {MessageDialogComponent}
      {MessageDialogLoadComponent}
      {ConfirmDialogComponent}

      <main>
        <section id="section1" className="profile">
          {canEdit ? (
            <div
              id="profile-image"
              role="button"
              tabIndex={0}
              onClick={() => { void updateProfile(); }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  void updateProfile();
                }
              }}
            >
              <img src={profile.avatar_link} alt="profile-image" />
              <span>Refresh</span>
            </div>
          ) : (
            <div>
              <img src={profile.avatar_link} alt="profile-image" />
            </div>
          )}

          <div id="profile-top">
            <div>
              <div>{profile.user_name}</div>
              <div>
                {profile.country_code === "XX" ? "" : <img src={`https://flagcdn.com/w80/${profile.country_code.toLowerCase()}.jpg`} alt={profile.country_code} />}
              </div>
              <div>
                {profile.titles.map((title, index) => (
                  <span className="titles" style={{ backgroundColor: `#${title.color}` }} key={`${title.name}-${index}`}>
                    {title.name}
                  </span>
                ))}
              </div>
            </div>
            <div>
              {profile.links.steam === "-" ? "" : <a href={profile.links.steam}><img src={SteamIcon} alt="Steam" /></a>}
              {profile.links.twitch === "-" ? "" : <a href={profile.links.twitch}><img src={TwitchIcon} alt="Twitch" /></a>}
              {profile.links.youtube === "-" ? "" : <a href={profile.links.youtube}><img src={YouTubeIcon} alt="Youtube" /></a>}
              {profile.links.p2sr === "-" ? "" : <a href={profile.links.p2sr}><img src={PortalIcon} alt="P2SR" style={{ padding: "0" }} /></a>}
            </div>
          </div>
          <div id="profile-bottom">
            <div>
              <span>Overall</span>
              <span>{profile.rankings.overall.rank === 0 ? "N/A " : `#${profile.rankings.overall.rank} `}
                <span>({profile.rankings.overall.completion_count}/{profile.rankings.overall.completion_total})</span>
              </span>
            </div>
            <div>
              <span>Singleplayer</span>
              <span>{profile.rankings.singleplayer.rank === 0 ? "N/A " : `#${profile.rankings.singleplayer.rank} `}
                <span>({profile.rankings.singleplayer.completion_count}/{profile.rankings.singleplayer.completion_total})</span>
              </span>
            </div>
            <div>
              <span>Cooperative</span>
              <span>{profile.rankings.cooperative.rank === 0 ? "N/A " : `#${profile.rankings.cooperative.rank} `}
                <span>({profile.rankings.cooperative.completion_count}/{profile.rankings.cooperative.completion_total})</span>
              </span>
            </div>
          </div>
        </section>

        <section id="section2" className="profile">
          <button type="button"><img src={FlagIcon} alt="" />&nbsp;Player Records</button>
          <button type="button"><img src={StatisticsIcon} alt="" />&nbsp;Statistics</button>
        </section>

        <section id="section3" className="profile1">
          <div id="profileboard-nav">
            <select
              id="select-game"
              value={game}
              onChange={(event) => {
                setGame(event.currentTarget.value);
                setChapter("0");
                setChapterData(null);
                setMaps([]);
                resetBoard();
              }}
            >
              <option value="0">All Scores</option>
              {games.map((availableGame) => (
                <option value={availableGame.id} key={availableGame.id}>{availableGame.name}</option>
              ))}
            </select>

            {game === "0" ? (
              <select disabled value="0">
                <option value="0">All Chapters</option>
              </select>
            ) : chapterData === null ? <select disabled aria-label="Loading chapters" value="0"><option value="0" /></select> : (
              <select
                id="select-chapter"
                value={chapter}
                onChange={(event) => {
                  setChapter(event.currentTarget.value);
                  setMaps([]);
                  resetBoard();
                }}
              >
                <option value="0">All Chapters</option>
                {chapterData.chapters.filter((availableChapter) => !availableChapter.is_disabled).map((availableChapter) => (
                  <option value={availableChapter.id} key={availableChapter.id}>{availableChapter.name}</option>
                ))}
              </select>
            )}
          </div>
          <div id="profileboard-top">
            <span>{renderSortHeader("mapName", "Map Name")}</span>
            <span style={{ justifyContent: "center" }}>{renderSortHeader("portals", "Portals")}</span>
            <span style={{ justifyContent: "center" }}>{renderSortHeader("wrDelta", "WRΔ")}</span>
            <span style={{ justifyContent: "center" }}>{renderSortHeader("time", "Time")}</span>
            <span> </span>
            <span>{renderSortHeader("rank", "Rank")}</span>
            <span>{renderSortHeader("date", "Date")}</span>
            <div id="page-number">
              <div>
                <button
                  type="button"
                  onClick={() => {
                    if (currentPage > 1) {
                      setPageNumber(currentPage - 1);
                      setExpandedRecordIDs(new Set());
                    }
                  }}
                ><i className="triangle" style={{ position: "relative", left: "-5px" }} /></button>
                <span>{currentPage}/{pageMax}</span>
                <button
                  type="button"
                  onClick={() => {
                    if (currentPage < pageMax) {
                      setPageNumber(currentPage + 1);
                      setExpandedRecordIDs(new Set());
                    }
                  }}
                ><i className="triangle" style={{ position: "relative", left: "5px", transform: "rotate(180deg)" }} /></button>
              </div>
            </div>
          </div>
          <hr />
          <div id="profileboard-records">
            {pageRows.map(renderProfileBoardRow)}
          </div>
        </section>
      </main>
    </>
  );
};

export default ProfileView;
