import React from "react";

interface AutorenderLinkProps {
  autorenderID: string;
}

const AutorenderLink: React.FC<AutorenderLinkProps> = ({ autorenderID }) => (
  <a
    href={`https://autorender.portal2.sr/videos/${encodeURIComponent(autorenderID)}`}
    aria-label="Watch Autorendered Video"
    title="Watch Autorendered Video"
    target="_blank"
    rel="noopener noreferrer"
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "30px",
      height: "30px",
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

export default AutorenderLink;
