import React from "react";
import { Helmet } from "react-helmet";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { API } from "../api/Api";
import { PortalCountData, RecordImprovement, ScoreLog } from "../api/Stats";

import { Link } from "react-router-dom";
import { portalLabel } from "@utils/Portal";
import homepageStyles from "@css/Homepage.module.css";
import { classNames } from "@css/utils";

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

const getLatestWorldRecords = (singleplayer: PortalCountData[], multiplayer: PortalCountData[]): RecentWorldRecord[] =>
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
  const [portalCountDataSingleplayer, setPortalCountDataSingleplayer] = React.useState<PortalCountData[]>(
    homepageCache.portalCountData?.singleplayer ?? [],
  );
  const [portalCountDataMultiplayer, setPortalCountDataMultiplayer] = React.useState<PortalCountData[]>(
    homepageCache.portalCountData?.multiplayer ?? [],
  );
  const [recentScores, setRecentScores] = React.useState<ScoreLog[]>(homepageCache.recentScores ?? []);
  const [recentWorldRecords, setRecentWorldRecords] = React.useState<RecentWorldRecord[]>(
    homepageCache.recentWorldRecords ?? [],
  );
  const [isLoading, setIsLoading] = React.useState<boolean>(!homepageCache.portalCountData);
  const [isLoadingScores, setIsLoadingScores] = React.useState<boolean>(!homepageCache.recentScores);
  const [selectedMode, setSelectedMode] = React.useState<"singleplayer" | "multiplayer">("singleplayer");

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
      while (dataIndex < data.length && new Date(data[dataIndex].date) <= currentDate) {
        currentCount = data[dataIndex].count;
        dataIndex++;
      }
      result.push({
        date: currentDate.toISOString(),
        count: currentCount,
      });
      const nextDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 7);
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
        setPortalCountDataSingleplayer(homepageCache.portalCountData.singleplayer);
        setPortalCountDataMultiplayer(homepageCache.portalCountData.multiplayer);
        setRecentWorldRecords(homepageCache.recentWorldRecords ?? []);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const request = (homepageCache.portalCountRequest ??= API.get_portal_count_history()
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
            setPortalCountDataSingleplayer(homepageCache.portalCountData.singleplayer);
            setPortalCountDataMultiplayer(homepageCache.portalCountData.multiplayer);
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
      const request = (homepageCache.recentScoresRequest ??= API.get_recent_scores()
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
        <div className={homepageStyles.customTooltip}>
          <p className={homepageStyles.tooltipDate}>
            {new Date(dataPoint.payload.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          <p className={homepageStyles.tooltipCount}>{`Portal Count: ${dataPoint.value}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <main>
      <Helmet>
        <title>LPHUB | Homepage</title>
      </Helmet>

      <section className={homepageStyles.heroSection}>
        <div className={homepageStyles.heroContent}>
          <h1 className={homepageStyles.heroTitle}>Welcome to Least Portals Hub!</h1>
          <p className={homepageStyles.heroSubtitle}>
            Your ultimate destination for Portal 2 Least Portals speedrunning.
          </p>
        </div>
      </section>

      <section className={homepageStyles.statsSection}>
        <div className={homepageStyles.statsGrid}>
          <div className={homepageStyles.statsContainer}>
            <div className={homepageStyles.statsHeader}>
              <h3>Least Portals World Record Timeline</h3>
            </div>

            {isLoading ? (
              <div className={homepageStyles.chartLoading}>
                <div className={homepageStyles.loadingSpinner}></div>
              </div>
            ) : (selectedMode === "singleplayer" ? processedDataSingleplayer : processedDataMultiplayer).length > 0 ? (
              <>
                <div className={homepageStyles.chartWrapper}>
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart
                      data={selectedMode === "singleplayer" ? processedDataSingleplayer : processedDataMultiplayer}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#CDCFDF" stopOpacity={0.6} />
                          <stop offset="95%" stopColor="#CDCFDF" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#202232" opacity={0.5} />
                      <XAxis
                        dataKey="date"
                        stroke="#CDCFDF"
                        tick={{
                          fill: "#CDCFDF",
                          fontFamily: "BarlowSemiCondensed-Regular",
                        }}
                        ticks={selectedMode === "singleplayer" ? yearlyTicksSingleplayer : yearlyTicksMultiplayer}
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
                <div className={homepageStyles.modeToggleContainer}>
                  <button
                    onClick={() => setSelectedMode("singleplayer")}
                    className={classNames(
                      homepageStyles.modeToggleButton,
                      selectedMode === "singleplayer" ? homepageStyles.selected : "",
                    )}
                  >
                    Singleplayer
                  </button>
                  <button
                    onClick={() => setSelectedMode("multiplayer")}
                    className={classNames(
                      homepageStyles.modeToggleButton,
                      selectedMode === "multiplayer" ? homepageStyles.selected : "",
                    )}
                  >
                    Cooperative
                  </button>
                </div>
              </>
            ) : (
              <div className={homepageStyles.chartEmpty}>
                <p>No data available yet.</p>
              </div>
            )}
          </div>

          <div className={classNames(homepageStyles.recentScoresContainer, homepageStyles.personalBestsContainer)}>
            <div className={homepageStyles.recentScoresHeader}>
              <h3>
                Recent <br />
                Personal Bests
              </h3>
            </div>

            {isLoadingScores ? (
              <div className={homepageStyles.scoresLoading}>
                <div className={homepageStyles.loadingSpinner}></div>
              </div>
            ) : recentScores.length > 0 ? (
              <div className={homepageStyles.recentScoresList}>
                {recentScores.map((score, index) => (
                  <div key={index} className={homepageStyles.scoreItem}>
                    <div className={homepageStyles.scoreUser}>
                      <Link to={`/users/${score.user.steam_id}`}>{score.user.user_name}</Link>
                    </div>
                    <div className={homepageStyles.scoreMap}>
                      <Link to={`/maps/${score.map.id}`}>{score.map.name}</Link>
                      {` | #${score.score_rank}`}
                    </div>
                    <div className={homepageStyles.scorePortals}>
                      {score.score_count} {portalLabel(score.score_count)}
                      <span className={homepageStyles.scoreDate}>
                        {" "}
                        · {new Date(score.date).toISOString().split("T")[0]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={homepageStyles.scoresEmpty}>
                <p>No Recent Scores.</p>
              </div>
            )}
          </div>

          <div className={classNames(homepageStyles.recentScoresContainer, homepageStyles.worldRecordsContainer)}>
            <div className={homepageStyles.recentScoresHeader}>
              <h3>
                Latest <br />
                World Records
              </h3>
            </div>

            {isLoading ? (
              <div className={homepageStyles.scoresLoading}>
                <div className={homepageStyles.loadingSpinner}></div>
              </div>
            ) : recentWorldRecords.length > 0 ? (
              <div className={homepageStyles.recentScoresList}>
                {recentWorldRecords.map((record, index) => (
                  <div
                    key={`${record.date}-${record.mode}-${record.map.name}-${index}`}
                    className={homepageStyles.scoreItem}
                  >
                    <div className={homepageStyles.scoreUser}>
                      {record.user.steam_id ? (
                        <Link to={`/users/${record.user.steam_id}`}>{record.user.user_name}</Link>
                      ) : (
                        record.user.user_name
                      )}
                    </div>
                    <div className={homepageStyles.scoreMap}>
                      <Link to={`/maps/${record.map.id}`}>{record.map.name}</Link>
                    </div>
                    <div className={homepageStyles.scorePortals}>
                      Saved {record.score_delta} {portalLabel(record.score_delta)}
                      <span className={homepageStyles.scoreDate}>
                        {" "}
                        · {new Date(record.date).toISOString().split("T")[0]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={homepageStyles.scoresEmpty}>
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
