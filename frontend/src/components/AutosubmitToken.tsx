import React from "react";
import axios from "axios";
import { url } from "@api/Api";

const AUTOSUBMIT_TOKEN_HELP =
  "SourceAutoRecord (SAR) plugin version 1.15.7 and later supports autosubmit for LPHUB. Once configured, it checks your personal best after every challenge mode run and uploads the demo to LPHUB when you achieve a new least portals personal best. Click Copy, then open autosubmit.key in your Portal 2 directory. Add lp.portal2.sr on its own line and paste the token on the line immediately below it:\n\nlp.portal2.sr\n<your token>\n\nKeep the token private. Regenerate immediately invalidates the old token; replace it in autosubmit.key with the new token.";

interface AutosubmitTokenProps {
  token: string;
  confirm: (title: string, subtitle: string) => Promise<boolean>;
}

export default function AutosubmitToken({ token, confirm }: AutosubmitTokenProps) {
  const [value, setValue] = React.useState("");
  const [busy, setBusy] = React.useState(true);
  const [status, setStatus] = React.useState("");
  const active = React.useRef(true);
  const request = React.useCallback(
    async (rotate: boolean, signal?: AbortSignal) => {
      setBusy(true);
      setStatus("");
      try {
        const response = await axios.request({
          method: rotate ? "PUT" : "POST",
          url: url("token/autosubmit"),
          headers: { Authorization: `Bearer ${token}` },
          signal,
        });
        if (!active.current || signal?.aborted) return;
        if (!response.data.success) throw new Error("Token request failed");
        setValue(response.data.data.token);
      } catch {
        if (active.current && !signal?.aborted) setStatus("Could not load token. Please retry.");
      } finally {
        if (active.current && !signal?.aborted) setBusy(false);
      }
    },
    [token],
  );
  React.useEffect(() => {
    active.current = true;
    const controller = new AbortController();
    void request(false, controller.signal);
    return () => {
      active.current = false;
      controller.abort();
    };
  }, [request]);
  return (
    <section style={{ padding: "8px 15px", fontSize: "16px", whiteSpace: "normal", maxWidth: "90vw" }}>
      <h3 style={{ margin: "0 0 6px", fontSize: "18px" }}>
        Autosubmit Token{" "}
        <span
          tabIndex={0}
          title={AUTOSUBMIT_TOKEN_HELP}
          aria-label={AUTOSUBMIT_TOKEN_HELP}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "16px",
            height: "16px",
            border: "1px solid currentColor",
            borderRadius: "50%",
            fontSize: "12px",
            cursor: "help",
            verticalAlign: "middle",
          }}
        >
          ?
        </span>
      </h3>
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
        <code aria-label="Autosubmit token ending" style={{ fontSize: "14px" }}>
          {value ? `•••••${value.slice(-5)}` : "•••••"}
        </code>
        <button
          disabled={busy || !value}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              if (active.current) setStatus("Copied!");
            } catch {
              if (active.current) setStatus("Could not copy. Please try again.");
            }
          }}
        >
          Copy
        </button>
        <button
          disabled={busy}
          onClick={async () => {
            if (
              await confirm(
                "Regenerate Autosubmit Token",
                "Your previous token will stop working. Update configured clients with the replacement token.",
              )
            ) {
              if (active.current) await request(true);
            }
          }}
        >
          Regenerate
        </button>
      </div>
      {(busy || status) && (
        <p role="status" style={{ margin: "6px 0 0", fontSize: "14px" }}>
          {busy ? "Loading token..." : status}
        </p>
      )}
    </section>
  );
}
