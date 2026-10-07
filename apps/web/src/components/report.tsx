"use client";
import { useState } from "react";
import { Button } from "@just1date/ui";
import { Shell } from "./shell";
import { api, json } from "../lib/client";
export function Report({
  target = "",
  messageId,
}: {
  target?: string;
  messageId?: string;
}) {
  const [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Shell title="Tell us what happened" eyebrow="REPORT A CONCERN">
      <div className="form-card">
        <p>
          Reports enter a moderation queue for human review. If you’re in
          immediate danger, contact local emergency services directly.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const f = new FormData(e.currentTarget);
            try {
              await api("reports", {
                method: "POST",
                body: json({
                  target_id: f.get("target_id"),
                  category: f.get("category"),
                  details: f.get("details"),
                  ...(messageId ? { message_id: messageId } : {}),
                }),
              });
              setSuccess(
                "Your report is saved for review. You can also block this person from their profile.",
              );
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Profile identifier
            <input
              name="target_id"
              defaultValue={target}
              required
              readOnly={Boolean(target)}
            />
          </label>
          <label>
            Category
            <select name="category">
              {[
                "fake_profile",
                "scam",
                "harassment",
                "threats",
                "hate",
                "sexual_misconduct",
                "underage",
                "spam",
                "other",
              ].map((c) => (
                <option value={c} key={c}>
                  {c.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <label>
            What should the team know?
            <textarea
              name="details"
              required
              minLength={10}
              maxLength={2000}
              rows={5}
            />
          </label>
          <Button disabled={busy || Boolean(success)}>
            {busy ? "Submitting…" : "Submit report"}
          </Button>
        </form>
        {error && (
          <p className="error-inline" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="success-inline" role="status">
            {success}
          </p>
        )}
      </div>
    </Shell>
  );
}
