import React from "react";
import axios from "axios";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { url } from "@api/Api";
import { Game } from "@customTypes/Game";
import styles from "@css/Statistics.module.css";
import StatisticsInsights from "@components/StatisticsInsights";
import { portalLabel } from "@utils/Portal";

type Entry = {
  id: number;
  map_id: number;
  map_name: string;
  user_name: string;
  user_id: string;
  score: number;
  previous: number | null;
  date: string;
};
type Feed = { entries: Entry[]; more: boolean };
type Overview = { maps: number; players: number; runs: number };

async function fetchStats<T>(game: number, kind: string, offset?: number): Promise<T> {
  const response = await axios.get(url("stats/statistics"), { params: { game_id: game, kind, offset } });
  if (!response.data?.success || !response.data.data) throw new Error("Statistics unavailable");
  return response.data.data as T;
}

function Activity({ game, kind, title }: { game: number; kind: "history" | "bests"; title: string }) {
  const [feed, setFeed] = React.useState<Feed>({ entries: [], more: false });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const request = React.useRef(0);
  const load = React.useCallback(
    async (offset: number) => {
      const current = ++request.current;
      setLoading(true);
      setError(false);
      try {
        const data = await fetchStats<Feed>(game, kind, offset);
        if (request.current === current)
          setFeed((previous) => ({
            entries: offset ? [...previous.entries, ...data.entries] : data.entries,
            more: data.more,
          }));
      } catch {
        if (request.current === current) setError(true);
      } finally {
        if (request.current === current) setLoading(false);
      }
    },
    [game, kind],
  );
  React.useEffect(() => {
    setFeed({ entries: [], more: false });
    void load(0);
    return () => {
      request.current++;
    };
  }, [load]);
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h2>{title}</h2>
        </div>
      </div>
      {feed.entries.map((entry, index) => (
        <div className={styles.entry} key={`${entry.id}-${entry.user_id}-${index}`}>
          <div className={styles.entryMain}>
            <div className={styles.entryUser}>
              {kind === "bests" && entry.user_id ? (
                <Link to={`/users/${entry.user_id}`}>{entry.user_name}</Link>
              ) : (
                entry.user_name
              )}
            </div>
            <Link className={styles.entryMap} to={`/maps/${entry.map_id}`}>
              {entry.map_name}
            </Link>
          </div>
          <div className={styles.entryDetails}>
            <span className={styles.score}>
              {entry.score} {portalLabel(entry.score)}
            </span>
            {kind === "history" && (
              <span className={styles.change}>
                {entry.previous === null
                  ? "Initial Record"
                  : entry.previous > entry.score
                    ? `Saved ${entry.previous - entry.score} ${portalLabel(entry.previous - entry.score)}`
                    : "Historical Entry"}
              </span>
            )}
            <time className={styles.date} dateTime={entry.date}>
              {entry.date.slice(0, 10)}
            </time>
          </div>
        </div>
      ))}
      {loading && <p>Loading…</p>}
      {error && (
        <p>
          Could not load this feed. <button onClick={() => void load(feed.entries.length)}>Retry</button>
        </p>
      )}
      {!loading && !error && feed.entries.length === 0 && <p>No entries yet.</p>}
      {!loading && !error && feed.more && <button onClick={() => void load(feed.entries.length)}>Load more</button>}
    </section>
  );
}

export default function Statistics({ games }: { games: Game[] }) {
  const [game, setGame] = React.useState<number>(0);
  const [overview, setOverview] = React.useState<Overview>();
  const [error, setError] = React.useState(false);
  React.useEffect(() => {
    if (game === undefined) return;
    let active = true;
    setOverview(undefined);
    setError(false);
    fetchStats<Overview>(game, "overview")
      .then((data) => {
        if (active) setOverview(data);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [game]);
  return (
    <main className={styles.page}>
      <Helmet>
        <title>Statistics | LPHUB</title>
      </Helmet>
      <div className={styles.content}>
        <section className={styles.overview} aria-label="Community overview">
          <label className={styles.gamePicker}>
            <span>SELECT GAME</span>
            <select value={game} onChange={(event) => setGame(Number(event.target.value))}>
              <option value={0}>All Games</option>
              {games.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          {error ? (
            <p>Could not load community statistics.</p>
          ) : overview ? (
            <>
              <div>
                <span>MAPS</span>
                <strong>{overview.maps.toLocaleString()}</strong>
              </div>
              <div>
                <span>PLAYERS</span>
                <strong>{overview.players.toLocaleString()}</strong>
              </div>
              <div>
                <span>SUBMITTED RUNS</span>
                <strong>{overview.runs.toLocaleString()}</strong>
              </div>
            </>
          ) : (
            <p>Loading statistics…</p>
          )}
        </section>
        <StatisticsInsights game={game} />
        <div className={styles.feeds}>
          <Activity game={game} kind="history" title="World Record History" />
          <Activity game={game} kind="bests" title="Recent Personal Bests" />
        </div>
      </div>
    </main>
  );
}
