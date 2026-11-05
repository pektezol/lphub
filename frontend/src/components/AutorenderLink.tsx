import React from "react";
import autorenderLinkStyles from "@css/AutorenderLink.module.css";
import { classNames } from "@css/utils";

interface AutorenderLinkProps {
  autorenderID: string;
  playerLabel?: "Blue" | "Orange";
}

const AutorenderLink: React.FC<AutorenderLinkProps> = ({ autorenderID, playerLabel }) => {
  const label = playerLabel ? `Watch ${playerLabel} Autorendered Video` : "Watch Autorendered Video";

  return (
    <a
      href={`https://autorender.portal2.sr/videos/${encodeURIComponent(autorenderID)}`}
      aria-label={label}
      title={label}
      target="_blank"
      rel="noopener noreferrer"
      className={classNames(
        autorenderLinkStyles.videoLink,
        playerLabel === "Blue"
          ? autorenderLinkStyles.bluePlayer
          : playerLabel === "Orange"
            ? autorenderLinkStyles.orangePlayer
            : autorenderLinkStyles.inheritColor,
      )}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" width="30" height="30" fill="currentColor">
        <path d="M6 4v16l14-8z" />
      </svg>
    </a>
  );
};

export default AutorenderLink;
