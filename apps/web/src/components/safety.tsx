"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, MapPin, Phone } from "lucide-react";
import { Button } from "@just1date/ui";
import { Shell } from "./shell";
import { QueryState } from "./query-state";
import { api, json } from "../lib/client";
export function Safety() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["safety"],
    queryFn: () => api<any[]>("safety/sessions"),
  });
  const [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Shell title="Your peace of mind matters" eyebrow="THE SAFETY CENTER">
      <div className="safety-banner">
        <ShieldCheck size={35} />
        <div>
          <h2>Connection, with care.</h2>
          <p>
            Meet in a public place. Tell someone you trust. Keep control of what
            you share.
          </p>
        </div>
      </div>
      <div className="safety-tips">
        <article>
          <MapPin size={23} />
          <h3>Choose a public place</h3>
          <p>
            Arrange your own transport and keep your exact home location
            private.
          </p>
        </article>
        <article>
          <ShieldCheck size={23} />
          <h3>Trust your instincts</h3>
          <p>
            Never send money, banking details or identity documents to someone
            you’ve met here.
          </p>
        </article>
        <article>
          <Phone size={23} />
          <h3>Keep someone in the loop</h3>
          <p>
            Tell a trusted contact where you’re going. If you are in danger,
            call local emergency services directly.
          </p>
        </article>
      </div>
      <div className="settings-grid">
        <section className="form-card">
          <h2>Plan a check-in</h2>
          <p>
            This records your session and check-ins. Automated contact alerts
            and location sharing are not connected.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              const f = new FormData(e.currentTarget);
              try {
                await api("safety/sessions", {
                  method: "POST",
                  body: json({
                    person_name: f.get("person_name"),
                    venue: f.get("venue"),
                    starts_at: new Date(
                      String(f.get("starts_at")),
                    ).toISOString(),
                    ends_at: new Date(String(f.get("ends_at"))).toISOString(),
                    location_consent: false,
                  }),
                });
                setMessage(
                  "Your session is saved. Notify your trusted contact yourself.",
                );
                qc.invalidateQueries({ queryKey: ["safety"] });
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Person you’re meeting
              <input
                name="person_name"
                required
                minLength={2}
                maxLength={100}
              />
            </label>
            <label>
              Public venue
              <input name="venue" required minLength={2} maxLength={200} />
            </label>
            <label>
              Date and start time
              <input name="starts_at" type="datetime-local" required />
            </label>
            <label>
              Expected end
              <input name="ends_at" type="datetime-local" required />
            </label>
            <Button disabled={busy}>
              {busy ? "Saving…" : "Create safety session"}
            </Button>
          </form>
        </section>
        <section className="form-card">
          <h2>Your sessions</h2>
          <QueryState pending={q.isPending} error={q.error} retry={q.refetch} />
          {q.data?.length === 0 && <p>No safety sessions yet.</p>}
          {q.data?.map((s) => (
            <div className="session-item" key={s.id}>
              <h3>{s.person_name}</h3>
              <p>
                {s.venue} · {new Date(s.starts_at).toLocaleString("en-GB")}
              </p>
              <span>{s.status}</span>
              {s.status !== "ended" && (
                <div className="form-actions">
                  {["check_in", "end"].map((action) => (
                    <Button
                      key={action}
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          await api(`safety/sessions/${s.id}/${action}`, {
                            method: "POST",
                          });
                          qc.invalidateQueries({ queryKey: ["safety"] });
                          setMessage(
                            action === "end"
                              ? "Session ended."
                              : "Check-in recorded.",
                          );
                        } catch (e) {
                          setError((e as Error).message);
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      {action === "end" ? "End session" : "Check in"}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      </div>
      <div className="safety-links">
        <Link href="/report">Report a concern →</Link>
        <Link href="/blocked">Blocked accounts →</Link>
        <Link href="/verification">Verification →</Link>
        <Link href="/legal/guidelines">Community guidelines →</Link>
      </div>
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
