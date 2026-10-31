import React from "react";
import { Helmet } from "react-helmet";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { API } from "../api/Api";
import { PortalCountData, RecordImprovement, ScoreLog } from "../api/Stats";
import "../css/Homepage.css";
import { Link } from "react-router-dom";
import { portalLabel } from "@utils/Portal";

interface PortalCountTooltipProps {
  active?: boolean;
  payload?: {
    value?: number | string;
    payload?: PortalCountData;
  }[];
}

interface HomepageCache {
  portalCountData?: {
    singleplayer: PortalCountData[];
    multiplayer: PortalCountData[];
  };
  recentWorldRecords?: RecentWorldRecord[];
  portalCountRequest?: Promise<void>;
  recentScores?: ScoreLog[];
  recentScoresRequest?: Promise<void>;
}

interface RecentWorldRecord extends RecordImprovement {
  date: string;
  mode: "Singleplayer" | "Multiplayer";
}

const homepageCache: HomepageCache = {};

const getLatestWorldRecords = (
  singleplayer: PortalCountData[],
  multiplayer: PortalCountData[],
): RecentWorldRecord[] =>
  [
    ...singleplayer.flatMap((entry) =>
      (entry.improvements ?? []).map((improvement) => ({
        ...improvement,
        date: entry.date,
        mode: "Singleplayer" as const,
      })),
    ),
    ...multiplayer.flatMap((entry) =>
      (entry.improvements ?? []).map((improvement) => ({
        ...improvement,
        date: entry.date,
        mode: "Multiplayer" as const,
      })),
    ),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

const Homepage: React.FC = () => {
  const [portalCountDataSingleplayer, setPortalCountDataSingleplayer] =
    React.useState<PortalCountData[]>(
      homepageCache.portalCountData?.singleplayer ?? [],
    );
  const [portalCountDataMultiplayer, setPortalCountDataMultiplayer] =
    React.useState<PortalCountData[]>(
      homepageCache.portalCountData?.multiplayer ?? [],
    );
  const [recentScores, setRecentScores] = React.useState<ScoreLog[]>(
    homepageCache.recentScores ?? [],
  );
  const [recentWorldRecords, setRecentWorldRecords] = React.useState<
    RecentWorldRecord[]
  >(homepageCache.recentWorldRecords ?? []);
  const [isLoading, setIsLoading] = React.useState<boolean>(
    !homepageCache.portalCountData,
  );
  const [isLoadingScores, setIsLoadingScores] = React.useState<boolean>(
    !homepageCache.recentScores,
  );
  const [selectedMode, setSelectedMode] = React.useState<
    "singleplayer" | "multiplayer"
  >("singleplayer");

  const processTimelineData = (data: PortalCountData[]): PortalCountData[] => {
    if (data.length === 0) {
      return [];
    }
    const startDate = new Date(data[0].date);
    const today = new Date();

    const result: PortalCountData[] = [];
    let currentDate = new Date(startDate.getFullYear(), 0, 1);

    let dataIndex = 0;
    let currentCount = data[0].count;

    while (currentDate <= today) {
      while (
        dataIndex < data.length &&
        new Date(data[dataIndex].date) <= currentDate
      ) {
        currentCount = data[dataIndex].count;
        dataIndex++;
      }
      result.push({
        date: currentDate.toISOString(),
        count: currentCount,
      });
      const nextDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate() + 7,
      );
      if (nextDate.getMonth() !== currentDate.getMonth()) {
        currentDate = new Date(nextDate.getFullYear(), nextDate.getMonth(), 1);
      } else {
        currentDate = nextDate;
      }
    }
    return result;
  };

  const processedDataSingleplayer = React.useMemo(
    () => processTimelineData(portalCountDataSingleplayer),
    [portalCountDataSingleplayer],
  );

  const processedDataMultiplayer = React.useMemo(
    () => processTimelineData(portalCountDataMultiplayer),
    [portalCountDataMultiplayer],
  );

  const getYearlyTicks = (data: PortalCountData[]): string[] => {
    if (data.length === 0) {
      return [];
    }
    const seenYears = new Set<number>();
    const ticks: string[] = [];
    for (const point of data) {
      const year = new Date(point.date).getFullYear();
      if (!seenYears.has(year)) {
        seenYears.add(year);
        ticks.push(point.date);
      }
    }
    return ticks;
  };

  const yearlyTicksSingleplayer = React.useMemo(
    () => getYearlyTicks(processedDataSingleplayer),
    [processedDataSingleplayer],
  );

  const yearlyTicksMultiplayer = React.useMemo(
    () => getYearlyTicks(processedDataMultiplayer),
    [processedDataMultiplayer],
  );

  React.useEffect(() => {
    let isActive = true;

    const fetchPortalCountData = () => {
      if (homepageCache.portalCountData) {
        setPortalCountDataSingleplayer(
          homepageCache.portalCountData.singleplayer,
        );
        setPortalCountDataMultiplayer(
          homepageCache.portalCountData.multiplayer,
        );
        setRecentWorldRecords(homepageCache.recentWorldRecords ?? []);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const request = (homepageCache.portalCountRequest ??=
        API.get_portal_count_history()
          .then((data) => {
            homepageCache.portalCountData = {
              singleplayer: data?.timeline_singleplayer ?? [],
              multiplayer: data?.timeline_multiplayer ?? [],
            };
            homepageCache.recentWorldRecords = getLatestWorldRecords(
              homepageCache.portalCountData.singleplayer,
              homepageCache.portalCountData.multiplayer,
            );
          })
          .finally(() => {
            homepageCache.portalCountRequest = undefined;
          }));

      void request
        .then(() => {
          if (isActive && homepageCache.portalCountData) {
            setRecentWorldRecords(homepageCache.recentWorldRecords ?? []);
            setPortalCountDataSingleplayer(
              homepageCache.portalCountData.singleplayer,
            );
            setPortalCountDataMultiplayer(
              homepageCache.portalCountData.multiplayer,
            );
            setIsLoading(false);
          }
        })
        .catch(() => {
          if (isActive) setIsLoading(false);
        });
    };

    const fetchRecentScores = () => {
      if (homepageCache.recentScores) {
        setRecentScores(homepageCache.recentScores);
        setIsLoadingScores(false);
        return;
      }

      setIsLoadingScores(true);
      const request = (homepageCache.recentScoresRequest ??=
        API.get_recent_scores()
          .then((scores) => {
            homepageCache.recentScores = scores;
          })
          .finally(() => {
            homepageCache.recentScoresRequest = undefined;
          }));

      void request
        .then(() => {
          if (isActive && homepageCache.recentScores) {
            setRecentScores(homepageCache.recentScores);
            setIsLoadingScores(false);
          }
        })
        .catch(() => {
          if (isActive) setIsLoadingScores(false);
        });
    };

    fetchPortalCountData();
    fetchRecentScores();

    return () => {
      isActive = false;
    };
  }, []);

  const CustomTooltip = ({ active, payload }: PortalCountTooltipProps) => {
    const dataPoint = payload?.[0];

    if (active && dataPoint?.payload) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-date">
            {new Date(dataPoint.payload.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          <p className="tooltip-count">{`Portal Count: ${dataPoint.value}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <main className="homepage">
      <Helmet>
        <title>LPHUB | Homepage</title>
      </Helmet>

      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Welcome to Least Portals Hub!</h1>
          <p className="hero-subtitle">
            Your ultimate destination for Portal 2 Least Portals speedrunning.
          </p>
        </div>
      </section>

      <section className="stats-section">
        <div className="stats-grid">
          <div className="stats-container">
            <div className="stats-header">
              <h3>Least Portals World Record Timeline</h3>
            </div>

            {isLoading ? (
              <div className="chart-loading">
                <div className="loading-spinner"></div>
              </div>
            ) : (selectedMode === "singleplayer"
              ? processedDataSingleplayer
              : processedDataMultiplayer
            ).length > 0 ? (
                <>
                  <div className="chart-wrapper">
                    <ResponsiveContainer width="100%" height={400}>
                      <AreaChart
                        data={
                          selectedMode === "singleplayer"
                            ? processedDataSingleplayer
                            : processedDataMultiplayer
                        }
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="colorCount"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#CDCFDF"
                              stopOpacity={0.6}
                            />
                            <stop
                              offset="95%"
                              stopColor="#CDCFDF"
                              stopOpacity={0.05}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#202232"
                          opacity={0.5}
                        />
                        <XAxis
                          dataKey="date"
                          stroke="#CDCFDF"
                          tick={{
                            fill: "#CDCFDF",
                            fontFamily: "BarlowSemiCondensed-Regular",
                          }}
                          ticks={
                            selectedMode === "singleplayer"
                              ? yearlyTicksSingleplayer
                              : yearlyTicksMultiplayer
                          }
                          tickFormatter={(date) => {
                            const d = new Date(date);
                            return d.getFullYear().toString();
                          }}
                        />
                        <YAxis
                          stroke="#CDCFDF"
                          tick={{
                            fill: "#CDCFDF",
                            fontFamily: "BarlowSemiCondensed-Regular",
                          }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="count"
                          stroke="#FFF"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorCount)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mode-toggle-container">
                    <button
                      onClick={() => setSelectedMode("singleplayer")}
                      className={`mode-toggle-button ${selectedMode === "singleplayer" ? "selected" : ""}`}
                    >
                    Singleplayer
                    </button>
                    <button
                      onClick={() => setSelectedMode("multiplayer")}
                      className={`mode-toggle-button ${selectedMode === "multiplayer" ? "selected" : ""}`}
                    >
                    Cooperative
                    </button>
                  </div>
                </>
              ) : (
                <div className="chart-empty">
                  <p>No data available yet.</p>
                </div>
              )}
          </div>

          <div className="recent-scores-container personal-bests-container">
            <div className="recent-scores-header">
              <h3>
                Recent <br />
                Personal Bests
              </h3>
            </div>

            {isLoadingScores ? (
              <div className="scores-loading">
                <div className="loading-spinner"></div>
              </div>
            ) : recentScores.length > 0 ? (
              <div className="recent-scores-list">
                {recentScores.map((score, index) => (
                  <div key={index} className="score-item">
                    <div className="score-user">
                      <Link to={`/users/${score.user.steam_id}`}>
                        {score.user.user_name}
                      </Link>
                    </div>
                    <div className="score-map">
                      <Link to={`/maps/${score.map.id}`}>
                        {score.map.name}
                      </Link>
                      {` | #${score.score_rank}`}
                    </div>
                    <div className="score-portals">
                      {score.score_count} {portalLabel(score.score_count)}
                      <span className="score-date">
                        {" "}
                        · {new Date(score.date).toISOString().split("T")[0]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="scores-empty">
                <p>No Recent Scores.</p>
              </div>
            )}
          </div>

          <div className="recent-scores-container world-records-container">
            <div className="recent-scores-header">
              <h3>
                Latest <br />
                World Records
              </h3>
            </div>

            {isLoading ? (
              <div className="scores-loading">
                <div className="loading-spinner"></div>
              </div>
            ) : recentWorldRecords.length > 0 ? (
              <div className="recent-scores-list">
                {recentWorldRecords.map((record, index) => (
                  <div
                    key={`${record.date}-${record.mode}-${record.map.name}-${index}`}
                    className="score-item"
                  >
                    <div className="score-user">
                      {record.user.steam_id ? (
                        <Link to={`/users/${record.user.steam_id}`}>
                          {record.user.user_name}
                        </Link>
                      ) : record.user.user_name}
                    </div>
                    <div className="score-map">
                      <Link to={`/maps/${record.map.id}`}>{record.map.name}</Link>
                    </div>
                    <div className="score-portals">
                      Saved {record.score_delta}{" "}
                      {portalLabel(record.score_delta)}
                      <span className="score-date">
                        {" "}
                        · {new Date(record.date).toISOString().split("T")[0]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="scores-empty">
                <p>No world records yet.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
};

export default Homepage;
