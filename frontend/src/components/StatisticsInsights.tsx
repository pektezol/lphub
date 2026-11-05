import React from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { url } from "@api/Api";
import { UserIcon } from "@images/Images";
import styles from "@css/Statistics.module.css";

type Leader = { id: string | number; name: string; count: number; avatar_link?: string };
type Insights = {
  active_all: Leader[];
  active_recent: Leader[];
  holders: Leader[];
  maps: Leader[];
  maps_recent: Leader[];
  months: { month: string; total: number }[];
};

function Leaderboard({
  title,
  entries,
  unit,
  link,
}: {
  title: string;
  entries: Leader[];
  unit: string;
  link: "users" | "maps";
}) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h2>{title}</h2>
        </div>
      </div>
      {entries.length ? (
        entries.map((entry) => (
          <div className={styles.leaderRow} key={entry.id}>
            {link === "users" && (
              <img
                className={styles.avatar}
                src={entry.avatar_link || UserIcon}
                alt=""
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = UserIcon;
                }}
              />
            )}
            <Link to={`/${link}/${entry.id}`}>{entry.name}</Link>
            <span className={styles.leaderValue}>
              {entry.count.toLocaleString()} <small>{unit}</small>
            </span>
          </div>
        ))
      ) : (
        <p>No data yet.</p>
      )}
    </section>
  );
}

function fillMonths(months: Insights["months"], range: number): Insights["months"] {
  if (!months.length) return [];
  const counts = new Map(months.map((item) => [item.month, item.total]));
  const now = new Date();
  const first = new Date("2024-10-01T00:00:00Z");
  const requested = range ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - range + 1, 1)) : first;
  const start = new Date(Math.max(first.getTime(), requested.getTime()));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const result: Insights["months"] = [];
  for (const date = new Date(start); date <= end; date.setUTCMonth(date.getUTCMonth() + 1)) {
    const month = date.toISOString().slice(0, 7);
    result.push({ month, total: counts.get(month) ?? 0 });
  }
  return result;
}

export default function StatisticsInsights({ game }: { game: number }) {
  const [data, setData] = React.useState<Insights>();
  const [error, setError] = React.useState(false);
  const [attempt, setAttempt] = React.useState(0);
  const [recent, setRecent] = React.useState(false);
  const [recentMaps, setRecentMaps] = React.useState(false);
  const [range, setRange] = React.useState(12);
  React.useEffect(() => {
    let active = true;
    setData(undefined);
    setError(false);
    axios
      .get(url("stats/statistics"), { params: { game_id: game, kind: "insights" } })
      .then((response) => {
        if (!response.data?.success || !response.data.data) throw new Error("Statistics unavailable");
        if (active) setData(response.data.data);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [game, attempt]);
  if (error)
    return (
      <section className={styles.panel}>
        <p>Could not load community insights.</p>
        <button onClick={() => setAttempt((value) => value + 1)}>Retry</button>
      </section>
    );
  if (!data)
    return (
      <section className={styles.panel}>
        <p>Loading community insights…</p>
      </section>
    );
  const chart = fillMonths(data.months, range);
  return (
    <div className={styles.insights}>
      <section className={styles.panel}>
        <div className={`${styles.panelHeader} ${styles.chartHeader}`}>
          <div>
            <h2>Runs Over Time</h2>
          </div>
          <label className={styles.chartPicker}>
            <span className={styles.srOnly}>Activity date range</span>
            <select value={range} onChange={(event) => setRange(Number(event.target.value))}>
              <option value={12}>Last 12 Months</option>
              <option value={36}>Last 3 Years</option>
              <option value={0}>All Time</option>
            </select>
          </label>
        </div>
        {chart.length ? (
          <div className={styles.chart}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 8, right: 8, left: -15, bottom: 0 }}>
                <CartesianGrid stroke="#3a3e59" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "#a5a9c2", fontSize: 12 }} minTickGap={25} />
                <YAxis allowDecimals={false} tick={{ fill: "#a5a9c2", fontSize: 12 }} />
                <Tooltip contentStyle={{ background: "#2b2e46", border: "none", borderRadius: 10 }} />
                <Bar dataKey="total" name="Runs" fill="#969fe7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p>No runs yet.</p>
        )}
      </section>
      <div className={styles.insightGrid}>
        <div>
          <div className={styles.periodToggle} aria-label="Player activity period">
            <button className={!recent ? styles.selected : ""} onClick={() => setRecent(false)}>
              All Time
            </button>
            <button className={recent ? styles.selected : ""} onClick={() => setRecent(true)}>
              Last 30 Days
            </button>
          </div>
          <Leaderboard
            title="Most Active Players"
            entries={recent ? data.active_recent : data.active_all}
            unit="runs"
            link="users"
          />
        </div>
        <div>
          <div className={styles.periodSpacer} aria-hidden="true" />
          <Leaderboard title="Least Time Record Holders" entries={data.holders} unit="records" link="users" />
        </div>
        <div>
          <div className={styles.periodToggle} aria-label="Map activity period">
            <button className={!recentMaps ? styles.selected : ""} onClick={() => setRecentMaps(false)}>
              All Time
            </button>
            <button className={recentMaps ? styles.selected : ""} onClick={() => setRecentMaps(true)}>
              Last 30 Days
            </button>
          </div>
          <Leaderboard
            title="Most Played Maps"
            entries={recentMaps ? data.maps_recent : data.maps}
            unit="runs"
            link="maps"
          />
        </div>
      </div>
    </div>
  );
}
