import React from "react";
import { Helmet } from "react-helmet";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { API } from "../api/Api";
import { PortalCountData, ScoreLog } from "../api/Stats";
import "../css/Homepage.css";
import { Link } from "react-router-dom";

const Homepage: React.FC = () => {
  const [portalCountDataSingleplayer, setPortalCountDataSingleplayer] = React.useState<PortalCountData[]>([]);
  const [portalCountDataMultiplayer, setPortalCountDataMultiplayer] = React.useState<PortalCountData[]>([]);
  const [recentScores, setRecentScores] = React.useState<ScoreLog[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [isLoadingScores, setIsLoadingScores] = React.useState<boolean>(true);
  const [selectedMode, setSelectedMode] = React.useState<"singleplayer" | "multiplayer">("singleplayer");

  const processTimelineData = (data: PortalCountData[]): PortalCountData[] => {
    if (data.length === 0) {
      return [];
    };
    const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const startDate = new Date(sortedData[0].date);
    const endDate = new Date(sortedData[sortedData.length - 1].date);

    const result: PortalCountData[] = [];
    let currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

    let dataIndex = 0;
    let currentCount = sortedData[0].count;

    while (currentDate <= endDate) {
      while (dataIndex < sortedData.length && new Date(sortedData[dataIndex].date) <= currentDate) {
        currentCount = sortedData[dataIndex].count;
        dataIndex++;
      }
      result.push({
        date: currentDate.toISOString(),
        count: currentCount
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
    [portalCountDataSingleplayer]
  );

  const processedDataMultiplayer = React.useMemo(
    () => processTimelineData(portalCountDataMultiplayer),
    [portalCountDataMultiplayer]
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
    [processedDataSingleplayer]
  );

  const yearlyTicksMultiplayer = React.useMemo(
    () => getYearlyTicks(processedDataMultiplayer),
    [processedDataMultiplayer]
  );

  const fetchPortalCountData = async () => {
    setIsLoading(true);
    const data = await API.get_portal_count_history();
    setPortalCountDataSingleplayer(data?.timeline_singleplayer || []);
    setPortalCountDataMultiplayer(data?.timeline_multiplayer || []);
    setIsLoading(false);
  };

  const fetchRecentScores = async () => {
    setIsLoadingScores(true);
    const scores = await API.get_recent_scores();
    setRecentScores(scores);
    setIsLoadingScores(false);
  };

  React.useEffect(() => {
    fetchPortalCountData();
    fetchRecentScores();
  }, []);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-date">{new Date(payload[0].payload.date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric"
          })}</p>
          <p className="tooltip-count">{`Portal Count: ${payload[0].value}`}</p>
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
            ) : (selectedMode === "singleplayer" ? processedDataSingleplayer : processedDataMultiplayer).length > 0 ? (
              <>
                <div className="chart-wrapper">
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
                        tick={{ fill: "#CDCFDF", fontFamily: "BarlowSemiCondensed-Regular" }}
                        ticks={selectedMode === "singleplayer" ? yearlyTicksSingleplayer : yearlyTicksMultiplayer}
                        tickFormatter={(date) => {
                          const d = new Date(date);
                          return d.getFullYear().toString();
                        }}
                      />
                      <YAxis
                        stroke="#CDCFDF"
                        tick={{ fill: "#CDCFDF", fontFamily: "BarlowSemiCondensed-Regular" }}
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
                    Multiplayer
                  </button>
                </div>
              </>
            ) : (
              <div className="chart-empty">
                <p>No data available yet.</p>
              </div>
            )}
          </div>

          <div className="recent-scores-container">
            <div className="recent-scores-header">
              <h3>Recent Scores</h3>
            </div>

            {isLoadingScores ? (
              <div className="scores-loading">
                <div className="loading-spinner"></div>
              </div>
            ) : recentScores.length > 0 ? (
              <div className="recent-scores-list">
                {recentScores.map((score, index) => (
                  <div key={index} className="score-item">
                    <div>
                      <Link key={index} to={`/users/${score.user.steam_id}`} className="score-user">{score.user.user_name}</Link>
                    </div>
                    <div className="score-map">
                      <Link key={index} to={`/maps/${score.map.id}`} className="score-map">{score.map.name}</Link>
                    </div>
                    <div className="score-portals">{score.score_count} { } portals</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="scores-empty">
                <p>No Recent Scores.</p>
              </div>
            )}
          </div>
        </div>
      </section>

    </main>
  );
};

export default Homepage;
