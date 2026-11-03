import React from "react";
import { Link } from "react-router-dom";
import styles from "@css/DiscussionFeed.module.css";

interface Props {
  to: string;
  title: string;
  map?: string;
  author: string;
  content: string;
  replies: number;
  activity: string;
  onDelete?: () => void;
}

const DiscussionCard: React.FC<Props> = ({ to, title, map, author, content, replies, activity, onDelete }) => (
  <div className={styles.cardContainer}>
    <Link className={styles.card} to={to}>
      <div className={styles.cardMain}>
        <span className={styles.title}>{title}</span>
        {map && <span className={styles.map}>{map}</span>}
        <span className={styles.preview}><b>{author}:</b> {content.slice(0, 200)}{content.length > 200 ? "…" : ""}</span>
      </div>
      <div className={styles.activity}><span>{replies} {replies === 1 ? "reply" : "replies"}</span><span>Last activity: {new Date(activity).toLocaleString()}</span></div>
    </Link>
    {onDelete && <button type="button" className={styles.deleteButton} onClick={onDelete}>Delete Post</button>}
  </div>
);

export default DiscussionCard;
