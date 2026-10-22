"use client";
import Link from "next/link";
import { ManagedPhoto } from "./managed-photo";
import { useRef, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarHeart,
  Coffee,
  Utensils,
  Palette,
  Sun,
  MapPin,
  Clock,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react";
import { dateActivities } from "@just1date/config";
import type { DatePlan } from "@just1date/types";
import { api, json } from "../lib/client";
import { QueryState } from "./query-state";
type Participant = { id: string; name: string };
const icons = { coffee: Coffee, dinner: Utensils, gallery: Palette, walk: Sun };
export function DatePlanner({
  demoProfiles,
  demoPlans,
  onDemoAction,
  onDiscover,
  initialMatch = "",
}: {
  demoProfiles?: Participant[];
  demoPlans?: DatePlan[];
  onDemoAction?: (input: Record<string, unknown>) => Promise<boolean>;
  onDiscover?: () => void;
  initialMatch?: string;
}) {
  const demo = Boolean(onDemoAction),
    qc = useQueryClient();
  const matches = useQuery({
    queryKey: ["matches"],
    queryFn: () => api<any[]>("matches"),
    enabled: !demo,
  });
  const plans = useQuery({
    queryKey: ["dates"],
    queryFn: () => api<DatePlan[]>("dates"),
    enabled: !demo,
    refetchInterval: 15000,
  });
  const participants: Participant[] = demo
    ? (demoProfiles ?? [])
    : (matches.data ?? []).map((m) => ({
        id: m.id,
        name: m.profile.display_name,
      }));
  const [matchId, setMatchId] = useState(initialMatch),
    [activity, setActivity] = useState<DatePlan["activity"]>("coffee"),
    [venue, setVenue] = useState(""),
    [starts, setStarts] = useState(""),
    [note, setNote] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const operation = useRef<{ body: string; id: string } | null>(null);
  const selected =
    participants.find((p) => p.id === matchId)?.id ?? participants[0]?.id;
  const rows = demo ? (demoPlans ?? []) : (plans.data ?? []);
  async function propose(e: FormEvent) {
    e.preventDefault();
    if (busy || !selected) return;
    setError("");
    setNotice("");
    const timestamp = new Date(starts).getTime();
    if (
      !Number.isFinite(timestamp) ||
      timestamp < Date.now() + 15 * 60000 ||
      timestamp > Date.now() + 90 * 86400000
    ) {
      setError("Choose a time between 15 minutes and 90 days from now.");
      return;
    }
    const body = {
      match_id: selected,
      activity,
      venue: venue.trim(),
      starts_at: new Date(timestamp).toISOString(),
      note: note.trim(),
    };
    if (!operation.current || operation.current.body !== json(body))
      operation.current = { body: json(body), id: crypto.randomUUID() };
    setBusy(true);
    try {
      if (demo) {
        if (
          !(await onDemoAction!({
            action: "date-propose",
            profile_id: selected,
            operation_id: operation.current.id,
            activity,
            venue: body.venue,
            starts_at: body.starts_at,
            note: body.note,
          }))
        )
          throw new Error("Your demo invitation could not save. Try again.");
      } else
        await api("dates", {
          method: "POST",
          body: json({ ...body, operation_id: operation.current.id }),
        });
      operation.current = null;
      setVenue("");
      setStarts("");
      setNote("");
      setNotice(
        demo
          ? "Demo invitation created. You can simulate the other person’s response below."
          : "Invitation sent to your match. Your plan needs their acceptance.",
      );
      await qc.invalidateQueries({ queryKey: ["dates"] });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function respond(
    plan: DatePlan,
    response: "accept" | "decline" | "cancel",
  ) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (demo) {
        if (
          !(await onDemoAction!({
            action: "date-respond",
            profile_id: plan.match_id,
            plan_id: plan.id,
            response,
            revision: plan.revision,
            simulated: true,
          }))
        )
          throw new Error("The demo plan could not update.");
      } else
        await api(`dates/${plan.id}/actions`, {
          method: "POST",
          body: json({ action: response, revision: plan.revision }),
        });
      setNotice(
        demo
          ? "Simulated response saved. No real invitation or reservation was made."
          : "Date plan updated.",
      );
      await qc.invalidateQueries({ queryKey: ["dates"] });
    } catch (e) {
      setError((e as Error).message);
      await qc.invalidateQueries({ queryKey: ["dates"] });
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="date-experience">
      <section className="date-hero">
        <ManagedPhoto slot="date_venue" />
        <div>
          <span className="editorial-kicker">LESS MAYBE. MORE MEMORIES.</span>
          <h2>
            Just one date.
            <br />
            <em>A beautiful beginning.</em>
          </h2>
          <p>
            Choose something you’ll both enjoy. Make a little time for each
            other.
          </p>
        </div>
        <span className="illustrative-tag">
          Illustrative setting · No venue bookings
        </span>
      </section>
      {demo && (
        <p className="demo-date-notice">
          <ShieldCheck size={18} /> Fictional demo only. Responses are
          simulated; no invitations or reservations are sent.
        </p>
      )}
      {!demo && (
        <>
          <QueryState
            pending={matches.isPending}
            error={matches.error}
            retry={matches.refetch}
          />
          <QueryState
            pending={plans.isPending}
            error={plans.error}
            retry={plans.refetch}
          />
        </>
      )}
      {error && (
        <p role="alert" className="error-inline">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="date-notice">
          {notice}
        </p>
      )}
      <div className="date-columns">
        <section className="date-form-card">
          <p className="editorial-kicker">MAKE THE FIRST MOVE</p>
          <h3>A little invitation.</h3>
          {!participants.length ? (
            <div className="date-empty">
              <CalendarHeart size={32} />
              <p>A mutual match opens the door to your first date.</p>
              {demo ? (
                <button className="button" onClick={onDiscover}>
                  Explore demo profiles
                </button>
              ) : (
                <>
                  <Link className="button" href="/discover">
                    Discover connections
                  </Link>
                  <Link className="pink-link" href="/demo">
                    Try the fictional interactive preview{" "}
                    <ArrowUpRight size={15} />
                  </Link>
                </>
              )}
            </div>
          ) : (
            <form onSubmit={propose}>
              <label>
                Your connection
                <select
                  aria-label="Your connection"
                  value={selected}
                  onChange={(e) => setMatchId(e.target.value)}
                  disabled={busy}
                >
                  {participants.map((p) => (
                    <option value={p.id} key={p.id}>
                      {p.name}
                      {demo ? " · Demo" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <fieldset>
                <legend>What sounds like you?</legend>
                <div className="date-activity-grid">
                  {dateActivities.map((a) => {
                    const Icon = icons[a.id];
                    return (
                      <button
                        type="button"
                        key={a.id}
                        aria-pressed={activity === a.id}
                        onClick={() => setActivity(a.id)}
                        disabled={busy}
                      >
                        <Icon size={20} />
                        <span>{a.name}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <label>
                Public meeting place
                <input
                  required
                  minLength={3}
                  maxLength={160}
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="A café, gallery or public place you both know"
                  disabled={busy}
                />
              </label>
              <label>
                Date & time
                <input
                  required
                  type="datetime-local"
                  value={starts}
                  onChange={(e) => setStarts(e.target.value)}
                  disabled={busy}
                />
              </label>
              <small>
                Times use your device’s timezone. Choose 15 minutes to 90 days
                ahead.
              </small>
              <label>
                A thoughtful note <span>(optional)</span>
                <textarea
                  maxLength={500}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="I thought you’d like this because…"
                  disabled={busy}
                />
              </label>
              <button className="button" disabled={busy}>
                {busy
                  ? "Saving…"
                  : demo
                    ? "Create demo invitation"
                    : "Send date invitation"}
                <ArrowUpRight size={18} />
              </button>
              <p className="date-consent">
                An invitation is a proposal. Both people choose whether to go.
                Your venue is never booked by Just1Date.
              </p>
            </form>
          )}
        </section>
        <section className="date-agenda">
          <p className="editorial-kicker">SOMETHING TO LOOK FORWARD TO</p>
          <h3>Your date plans.</h3>
          {rows.length === 0 ? (
            <div className="date-empty">
              <CalendarHeart size={36} />
              <p>Your next good story starts with a simple invitation.</p>
            </div>
          ) : (
            rows.map((p) => {
              const upcoming = new Date(p.starts_at).getTime() > Date.now();
              const Icon = icons[p.activity];
              return (
                <article className="date-plan" key={p.id}>
                  <header>
                    <span className="date-plan-icon">
                      <Icon size={22} />
                    </span>
                    <div>
                      <h4>
                        {dateActivities.find((a) => a.id === p.activity)?.name}
                      </h4>
                      <p>
                        With {p.other_name}
                        {demo ? " · Fictional demo" : ""}
                      </p>
                    </div>
                    <span className={`date-status ${p.status}`}>
                      {!upcoming && p.status === "accepted"
                        ? "Past date"
                        : p.status === "proposed"
                          ? "Awaiting reply"
                          : p.status}
                    </span>
                  </header>
                  <p>
                    <MapPin size={16} />
                    {p.venue}
                  </p>
                  <p>
                    <Clock size={16} />
                    <time dateTime={p.starts_at}>
                      {new Date(p.starts_at).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </time>
                  </p>
                  {p.note && <blockquote>{p.note}</blockquote>}
                  <div className="date-plan-actions">
                    {upcoming &&
                      p.status === "proposed" &&
                      (!p.is_sender || demo) && (
                        <>
                          <button
                            className="button"
                            disabled={busy}
                            onClick={() => respond(p, "accept")}
                          >
                            {demo ? "Simulate acceptance" : "Accept invitation"}
                          </button>
                          <button
                            className="button secondary"
                            disabled={busy}
                            onClick={() => respond(p, "decline")}
                          >
                            {demo ? "Simulate decline" : "Decline"}
                          </button>
                        </>
                      )}
                    {upcoming &&
                      ["proposed", "accepted"].includes(p.status) && (
                        <button
                          className="text-button"
                          disabled={busy}
                          onClick={() => respond(p, "cancel")}
                        >
                          Cancel plan
                        </button>
                      )}
                  </div>
                </article>
              );
            })
          )}
          <aside className="date-safety-note">
            <ShieldCheck size={23} />
            <div>
              <h4>A good date feels safe.</h4>
              <p>
                Meet in a public place, arrange your own travel and tell someone
                you trust. You can change your mind at any time.
              </p>
              <Link href="/safety">Open the Safety Center ↗</Link>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
