"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@just1date/ui";
import { Shell } from "./shell";
import { QueryState } from "./query-state";
import { api, json } from "../lib/client";
export function Settings() {
  const router = useRouter(),
    qc = useQueryClient();
  const q = useQuery({ queryKey: ["me"], queryFn: () => api("profiles/me") });
  const [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [confirmation, setConfirmation] = useState("");
  async function run(work: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError("");
    try {
      await work();
      setMessage(success);
      qc.invalidateQueries({ queryKey: ["me"] });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Shell title="Your space, your choices" eyebrow="ACCOUNT & PRIVACY">
      <QueryState pending={q.isPending} error={q.error} retry={q.refetch} />
      {q.data && (
        <div className="settings-grid">
          <section className="form-card">
            <h2>Privacy</h2>
            <p>Set the pace. Choose when your profile appears.</p>
            {[
              ["visible", "Show my profile"],
              ["paused", "Pause discovery"],
              ["show_online", "Allow online status"],
            ].map(([key, label]) => (
              <label className="switch-row" key={key}>
                {label}
                <input
                  type="checkbox"
                  checked={Boolean(q.data[key])}
                  disabled={busy}
                  onChange={(e) =>
                    run(
                      () =>
                        api("privacy", {
                          method: "PATCH",
                          body: json({ [key]: e.target.checked }),
                        }),
                      "Privacy settings saved.",
                    )
                  }
                />
              </label>
            ))}
            <Link className="text-link" href="/blocked">
              View blocked accounts
            </Link>
          </section>
          <section className="form-card">
            <h2>Membership & account</h2>
            <Link className="setting-link" href="/settings/subscription">
              Your membership →
            </Link>
            <Link className="setting-link" href="/notifications">
              Notifications →
            </Link>
            <Link className="setting-link" href="/verification">
              Verification status →
            </Link>
            <Button
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const data = await api("account/export");
                  const url = URL.createObjectURL(
                    new Blob([JSON.stringify(data, null, 2)], {
                      type: "application/json",
                    }),
                  );
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "just1date-data.json";
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                }, "Your bounded data export has been downloaded. See its scope note for large historical records.")
              }
            >
              Download my data
            </Button>
            <Button
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const response = await fetch("/api/auth", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: json({ mode: "logout" }),
                  });
                  if (!response.ok)
                    throw new Error("Sign-out could not finish.");
                  qc.clear();
                  router.push("/auth/login");
                }, "Signed out.")
              }
            >
              Sign out
            </Button>
          </section>
          <section className="form-card danger-zone">
            <h2>Delete account</h2>
            <p>
              A deletion request hides your profile and revokes access
              immediately. Erasure across services awaits the retention-aware
              processing workflow. Pause discovery if you want a temporary
              break.
            </p>
            <label>
              Type DELETE to request deletion
              <input
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                autoComplete="off"
              />
            </label>
            <Button
              disabled={busy || confirmation !== "DELETE"}
              onClick={() =>
                run(async () => {
                  await api("account/deletion", {
                    method: "POST",
                    body: json({ confirmation: "DELETE" }),
                  });
                  await fetch("/api/auth", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: json({ mode: "logout" }),
                  });
                  qc.clear();
                  router.push("/auth/login");
                }, "Deletion requested.")
              }
            >
              Request account deletion
            </Button>
          </section>
        </div>
      )}
      {error && (
        <p className="error-inline" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="success-inline" role="status">
          {message}
        </p>
      )}
    </Shell>
  );
}
