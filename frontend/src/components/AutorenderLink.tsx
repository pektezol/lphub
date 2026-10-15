import React from "react";

interface AutorenderLinkProps {
  autorenderID: string;
  playerLabel?: "Blue" | "Orange";
}

const AutorenderLink: React.FC<AutorenderLinkProps> = ({ autorenderID, playerLabel }) => {
  const label = playerLabel
    ? `Watch ${playerLabel} Autorendered Video`
    : "Watch Autorendered Video";

  return (
    <a
      href={`https://autorender.portal2.sr/videos/${encodeURIComponent(autorenderID)}`}
      aria-label={label}
      title={label}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "30px",
        height: "30px",
        color: playerLabel === "Blue" ? "#39a9ff" : playerLabel === "Orange" ? "#ff9b42" : "inherit",
      }}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        width="30"
        height="30"
        fill="currentColor"
      >
        <path d="M6 4v16l14-8z" />
      </svg>
    </a>
  );
};

export default AutorenderLink;
