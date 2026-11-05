import React from "react";
import { API } from "@api/Api";
import styles from "@css/DiscussionComposer.module.css";

interface Props {
  mapID: string;
  token?: string;
  onClose: () => void;
  onCreated: () => void;
}

const DiscussionComposer: React.FC<Props> = ({ mapID, token, onClose, onCreated }) => {
  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !title.trim() || !content.trim() || sending) return;
    setSending(true);
    setError(false);
    try {
      const success = await API.post_map_discussion(token, mapID, { title: title.trim(), content: content.trim() });
      if (!success) throw new Error("Unable to create post");
      onCreated();
    } catch {
      setError(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <form className={styles.composer} onSubmit={submit}>
      <div className={styles.heading}>
        <h2>New Post</h2>
        <button type="button" className={styles.close} aria-label="Close new post" onClick={onClose}>
          ×
        </button>
      </div>
      <label className={styles.field}>
        Title
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Give your post a title..."
          required
        />
      </label>
      <label className={styles.field}>
        Message
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Share your thoughts..."
          rows={5}
          required
        />
      </label>
      {!token && <p className={styles.notice}>Sign in to create a post.</p>}
      {error && (
        <p className={styles.notice} role="alert">
          Could not create your post. Please try again.
        </p>
      )}
      <div className={styles.actions}>
        <button type="submit" disabled={!token || sending || !title.trim() || !content.trim()}>
          {sending ? "Posting..." : "Post"}
        </button>
      </div>
    </form>
  );
};

export default DiscussionComposer;
