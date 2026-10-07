"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, State } from "@just1date/ui";
import { Shell } from "./shell";
import { QueryState } from "./query-state";
import { api, json } from "../lib/client";
export function Utility({
  kind,
  target,
}: {
  kind: "notifications" | "blocked" | "verification" | "matchmaker";
  target?: string;
}) {
  const qc = useQueryClient();
  const [error, setError] = useState(""),
    [output, setOutput] = useState(""),
    [busy, setBusy] = useState(false);
  const endpoint =
    kind === "blocked"
      ? "blocks"
      : kind === "verification"
        ? "safety/verification"
        : kind === "matchmaker"
          ? "matches"
          : "notifications";
  const q = useQuery({ queryKey: [kind], queryFn: () => api<any[]>(endpoint) });
  const [chosen, setChosen] = useState(target ?? "");
  return (
    <Shell
      title={
        {
          notifications: "Your updates",
          blocked: "Your boundaries",
          verification: "Trust, thoughtfully earned",
          matchmaker: "Your AI matchmaker",
        }[kind]
      }
    >
      <QueryState pending={q.isPending} error={q.error} retry={q.refetch} />
      {q.data?.length === 0 && (
        <State
          title={
            kind === "matchmaker"
              ? "Start with a connection"
              : "Nothing to show here yet"
          }
        >
          <p>
            {kind === "verification"
              ? "Confirm your email to get started. Selfie verification is not connected yet."
              : kind === "matchmaker"
                ? "Mutual connections will appear here for compatibility and conversation suggestions."
                : "Your updates will appear here when there is something to share."}
          </p>
        </State>
      )}
      {kind === "notifications" &&
        q.data?.map((n) => (
          <div className="notification-row" key={n.id}>
            <div>
              <h3>{n.title}</h3>
              <p>{new Date(n.created_at).toLocaleString("en-GB")}</p>
            </div>
            <Button
              disabled={Boolean(n.read_at)}
              onClick={async () => {
                try {
                  await api(`notifications/${n.id}/read`, { method: "POST" });
                  qc.invalidateQueries({ queryKey: [kind] });
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              {n.read_at ? "Read" : "Mark read"}
            </Button>
          </div>
        ))}
      {kind === "blocked" &&
        q.data?.map((b) => (
          <div className="notification-row" key={b.id}>
            <span>Blocked profile: {b.target_id}</span>
            <small>{new Date(b.created_at).toLocaleDateString("en-GB")}</small>
          </div>
        ))}
      {kind === "verification" &&
        q.data?.map((v) => (
          <div className="notification-row" key={v.method}>
            <span>
              {v.method} {v.revoked_at ? "revoked" : "confirmed"}
            </span>
            <small>{new Date(v.verified_at).toLocaleDateString("en-GB")}</small>
          </div>
        ))}
      {kind === "matchmaker" && (
        <div className="form-card">
          <p>
            AI uses explicit shared interests and intentions. Suggestions are
            editable and are never sent for you. Premium and enabled AI service
            are required.
          </p>
          <label>
            Your connection
            <select value={chosen} onChange={(e) => setChosen(e.target.value)}>
              <option value="">Choose a connection</option>
              {target && <option value={target}>Selected profile</option>}
              {q.data?.map((m) => (
                <option value={m.profile.user_id} key={m.id}>
                  {m.profile.display_name}
                </option>
              ))}
            </select>
          </label>
          <div className="form-actions">
            <Button
              disabled={!chosen || busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const result = await api(`compatibility/${chosen}`);
                  setOutput(
                    `${result.overall_score ?? "No"}% profile alignment. ${result.explanation}\nShared strengths: ${result.positive_matches.join(", ") || "More information needed"}`,
                  );
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Explore compatibility
            </Button>
            <Button
              disabled={!chosen || busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const result = await api("ai/suggestions", {
                    method: "POST",
                    body: json({ target_id: chosen, kind: "icebreakers" }),
                  });
                  setOutput(result.text);
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Suggest icebreakers
            </Button>
          </div>
          {output && (
            <label>
              Review and edit
              <textarea
                rows={7}
                value={output}
                onChange={(e) => setOutput(e.target.value)}
              />
            </label>
          )}
          <Link className="text-link" href="/messages">
            Open messages to send your own words →
          </Link>
        </div>
      )}
      {error && (
        <p className="error-inline" role="alert">
          {error}
        </p>
      )}
    </Shell>
  );
}
