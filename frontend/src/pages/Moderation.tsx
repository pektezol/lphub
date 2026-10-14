import React from "react";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";

import { API } from "@api/Api";
import type { RouteDescriptionSuggestion } from "@api/Mod";

const Moderation: React.FC<{ token?: string; isModerator: boolean }> = ({ token, isModerator }) => {
  const [suggestions, setSuggestions] = React.useState<RouteDescriptionSuggestion[]>([]);
  const [error, setError] = React.useState("");
  const [busyID, setBusyID] = React.useState<number>();

  const refresh = React.useCallback(async () => {
    if (!token || !isModerator) return;
    try {
      setSuggestions(await API.get_route_description_suggestions(token));
      setError("");
    } catch {
      setError("Could not load route description suggestions.");
    }
  }, [token, isModerator]);

  React.useEffect(() => { void refresh(); }, [refresh]);

  const review = async (id: number, decision: "accepted" | "rejected") => {
    if (!token) return;
    setBusyID(id);
    try {
      if (!await API.review_route_description_suggestion(token, id, decision)) throw new Error();
      await refresh();
    } catch {
      setError("Could not review this suggestion. Refresh the queue and try again.");
    } finally {
      setBusyID(undefined);
    }
  };

  return (
    <main className="moderation-page">
      <Helmet><title>LPHUB | Moderation</title></Helmet>
      <h1>Route description suggestions</h1>
      {!isModerator ? <p>Moderator access is required.</p> : (
        <>
          {error && <p role="alert">{error}</p>}
          {suggestions.length === 0 && !error && <p>No pending suggestions.</p>}
          {suggestions.map((item) => (
            <article className="suggestion-card" key={item.id}>
              <h2><Link to={`/maps/${item.map_id}`}>{item.game_name} / {item.section_name} / {item.map_name}</Link></h2>
              <p><strong>Route:</strong> {item.category_name} · <strong>Submitted by:</strong> {item.submitter_name} ({item.submitter_id})</p>
              <section><h3>Submitted baseline</h3><ReactMarkdown>{item.submitted_description || "_Empty description_"}</ReactMarkdown></section>
              <section><h3>Current description</h3><ReactMarkdown>{item.current_description || "_Empty description_"}</ReactMarkdown></section>
              <section><h3>Proposal</h3><ReactMarkdown>{item.proposed_description || "_Empty description_"}</ReactMarkdown></section>
              <button disabled={busyID !== undefined} onClick={() => void review(item.id, "accepted")}>Accept</button>
              <button disabled={busyID !== undefined} onClick={() => void review(item.id, "rejected")}>Reject</button>
            </article>
          ))}
        </>
      )}
    </main>
  );
};

export default Moderation;
