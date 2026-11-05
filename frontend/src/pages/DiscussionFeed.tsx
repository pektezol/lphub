import React from "react";
import DiscussionCard from "@components/DiscussionCard";
import axios from "axios";
import { Link } from "react-router-dom";
import { API, url } from "@api/Api";
import styles from "@css/DiscussionFeed.module.css";
import { Search } from "@customTypes/Search";
type Entry = {
  id: number;
  map_id: number;
  map: string;
  game: string;
  title: string;
  content: string;
  author: string;
  activity: string;
  replies: number;
};
export default function DiscussionFeed({ token }: { token?: string }) {
  const [q, S] = React.useState("");
  const [rows, R] = React.useState<Entry[]>([]);
  const [more, M] = React.useState(false);
  const [error, E] = React.useState(false);
  const [loading, L] = React.useState(false);
  const [picker, P] = React.useState(false);
  const [mq, Q] = React.useState("");
  const [maps, A] = React.useState<Search["maps"]>([]);
  React.useEffect(() => {
    let live = true;
    L(true);
    R([]);
    M(false);
    axios
      .get(url("discussions"), { params: { q } })
      .then((r) => {
        if (live) {
          R(r.data.discussions);
          M(r.data.more);
          E(false);
        }
      })
      .catch(() => {
        if (live) E(true);
      })
      .finally(() => {
        if (live) L(false);
      });
    return () => {
      live = false;
    };
  }, [q]);
  React.useEffect(() => {
    if (!mq.trim()) {
      A([]);
      return;
    }
    const c = new AbortController();
    const t = setTimeout(() => {
      void API.get_search(mq, c.signal)
        .then((r) => A(r.maps))
        .catch(() => {});
    }, 250);
    return () => {
      clearTimeout(t);
      c.abort();
    };
  }, [mq]);
  return (
    <main>
      <div className={styles.page}>
        <section className={styles.feed} aria-label="Recent discussions">
          <div className={styles.search}>
            <input
              aria-label="Search titles"
              placeholder="Search for posts..."
              value={q}
              onChange={(e) => S(e.target.value)}
            />
            {token && (
              <button type="button" onClick={() => P(!picker)}>
                {picker ? "Close" : "New Post"}
              </button>
            )}
          </div>
          {token && picker && (
            <div className={styles.picker}>
              <h2>Choose a map</h2>
              <input
                aria-label="Search maps"
                placeholder="Search for a map..."
                value={mq}
                onChange={(e) => Q(e.target.value)}
              />
              <div className={styles.mapResults}>
                {maps.map((m) => (
                  <Link key={m.id} to={`/maps/${m.id}?tab=discussions&create=1`}>
                    <span>{m.map}</span>
                    <small>
                      {m.game} · {m.section_name}
                    </small>
                  </Link>
                ))}
              </div>
            </div>
          )}
          <div className={styles.list}>
            {rows.map((r) => (
              <DiscussionCard
                key={r.id}
                to={`/maps/${r.map_id}?tab=discussions&discussion=${r.id}`}
                title={r.title}
                map={`${r.game} · ${r.map}`}
                author={r.author}
                content={r.content}
                replies={r.replies}
                activity={r.activity}
              />
            ))}
          </div>
          {loading && <p className={styles.state}>Loading discussions...</p>}
          {error && <p className={styles.state}>Could not load discussions. Please try again.</p>}
          {!loading && !error && !rows.length && (
            <p className={styles.state}>{q ? "No discussions match your search." : "No discussions yet."}</p>
          )}
          {more && (
            <div className={styles.more}>
              <button
                type="button"
                onClick={() => {
                  void axios
                    .get(url("discussions"), {
                      params: { q, before: rows[rows.length - 1].activity, before_id: rows[rows.length - 1].id },
                    })
                    .then((r) => {
                      R([...rows, ...r.data.discussions]);
                      M(r.data.more);
                    })
                    .catch(() => E(true));
                }}
              >
                Load More
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
