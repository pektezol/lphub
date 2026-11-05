import React from "react";
import { Link } from "react-router-dom";
import { API } from "@api/Api";
import { MapDiscussion } from "@customTypes/Map";
import { time_ago } from "@utils/Time";
import styles from "@css/DiscussionThread.module.css";

interface Props {
  thread: MapDiscussion;
  mapID: string;
  token?: string;
  onClose: () => void;
  onUpdate: (thread: MapDiscussion) => void;
  onRefresh: () => void;
}

const DiscussionThread: React.FC<Props> = ({ thread, mapID, token, onClose, onUpdate, onRefresh }) => {
  const [message, setMessage] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState("");
  const discussion = thread.discussion;
  const comments = [...(discussion.comments || [])].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !message.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      const success = await API.post_map_discussion_comment(token, mapID, discussion.id, message.trim());
      if (!success) throw new Error("Unable to send reply");
      setMessage("");
      onRefresh();
      try {
        const updated = await API.get_map_discussion(mapID, discussion.id);
        if (updated) onUpdate(updated);
        else setError("Reply sent, but the discussion could not be refreshed.");
      } catch {
        setError("Reply sent, but the discussion could not be refreshed.");
      }
    } catch {
      setError("Could not send the reply. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const renderMessage = (user: typeof discussion.creator, date: string, content: string) => (
    <article className={styles.message}>
      <Link className={styles.avatar} to={`/users/${user.steam_id}`}>
        <img src={user.avatar_link} alt="" />
      </Link>
      <div className={styles.body}>
        <div className={styles.meta}>
          <Link className={styles.username} to={`/users/${user.steam_id}`}>
            {user.user_name}
          </Link>
          <span className={styles.time}>{time_ago(new Date(date.replace("T", " ").replace("Z", "")))}</span>
        </div>
        <div className={styles.content}>{content}</div>
      </div>
    </article>
  );

  return (
    <div className={styles.thread}>
      <div className={styles.heading}>
        <h2>{discussion.title}</h2>
        <button type="button" aria-label="Close discussion" onClick={onClose}>
          ×
        </button>
      </div>
      <div className={styles.messages}>
        {renderMessage(discussion.creator, discussion.created_at, discussion.content)}
        {comments.map((comment, index) => (
          <React.Fragment key={`${comment.user.steam_id}-${comment.date}-${index}`}>
            {renderMessage(comment.user, comment.date, comment.comment)}
          </React.Fragment>
        ))}
      </div>
      {token ? (
        <form className={styles.send} onSubmit={send}>
          <input
            aria-label="Reply"
            value={message}
            placeholder="Message"
            onChange={(event) => setMessage(event.target.value)}
          />
          <button type="submit" disabled={sending || !message.trim()}>
            {sending ? "Sending..." : "Send"}
          </button>
        </form>
      ) : (
        <p className={styles.notice}>Sign in to reply.</p>
      )}
      {error && (
        <p className={styles.notice} role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default DiscussionThread;
