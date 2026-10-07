"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Activity, Flag, Camera, LogOut } from "lucide-react";
import { can, type AdminRole } from "@just1date/config";
import { Button } from "@just1date/ui";
import { api, json } from "../../../web/src/lib/client";
import { QueryState } from "../../../web/src/components/query-state";
export function Dashboard() {
  const [section, setSection] = useState("overview"),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const identity = useQuery({
    queryKey: ["staff"],
    queryFn: () => api<{ role: AdminRole }>("admin/me"),
  });
  const permission = identity.data?.role;
  const metrics = useQuery({
    queryKey: ["metrics"],
    queryFn: () => api("admin/metrics"),
    enabled: Boolean(permission && can(permission, "analytics")),
  });
  const queue = useQuery({
    queryKey: ["moderation"],
    queryFn: () => api<any[]>("admin/moderation"),
    enabled: Boolean(permission && can(permission, "moderation")),
  });
  const photos = useQuery({
    queryKey: ["photos"],
    queryFn: () => api<any[]>("admin/photos"),
    enabled: Boolean(permission && can(permission, "verification")),
  });
  async function run(work: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await work();
      setMessage("Action recorded in the audit trail.");
      qc.invalidateQueries({ queryKey: ["photos"] });
      qc.invalidateQueries({ queryKey: ["moderation"] });
      qc.invalidateQueries({ queryKey: ["metrics"] });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="admin-layout">
      <aside>
        <Link className="wordmark" href="/">
          JUST<span>1</span>DATE<i>✦</i>
        </Link>
        <p className="eyebrow">TRUST & OPERATIONS</p>
        {[
          ["overview", "Overview", Activity],
          ["moderation", "Moderation", Flag],
          ["photos", "Photo review", Camera],
        ].map(([key, label, Icon]: any) => (
          <button
            key={key}
            className={section === key ? "selected" : ""}
            onClick={() => setSection(key)}
          >
            <Icon size={19} />
            {label}
          </button>
        ))}
        <div className="staff-status">
          <ShieldCheck size={22} />
          <p>{permission ?? "Staff access required"}</p>
          <small>Permission checks run on the server and in PostgreSQL.</small>
        </div>
        <Button
          onClick={async () => {
            await fetch("/api/auth", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: json({ mode: "logout" }),
            });
            qc.clear();
            window.location.assign("/auth/login");
          }}
        >
          <LogOut size={17} />
          Sign out
        </Button>
      </aside>
      <main>
        <div className="page-heading">
          <div>
            <p className="eyebrow">JUST1DATE OPERATIONS</p>
            <h1>
              {section === "overview"
                ? "A responsible view."
                : section === "moderation"
                  ? "Care, with accountability."
                  : "First impressions, reviewed."}
            </h1>
          </div>
          <span className="admin-badge">RESTRICTED ACCESS</span>
        </div>
        <QueryState
          pending={identity.isPending}
          error={identity.error}
          retry={identity.refetch}
        />
        {identity.data && section === "overview" && (
          <>
            <p className="section-description">
              Operational metrics from live records. Cohort retention, churn,
              MAU and conversion reporting require the analytics pipeline before
              launch.
            </p>
            {can(identity.data.role, "analytics") ? (
              <>
                <QueryState
                  pending={metrics.isPending}
                  error={metrics.error}
                  retry={metrics.refetch}
                />
                <div className="metric-grid">
                  {Object.entries(metrics.data ?? {})
                    .filter(([k]) => k !== "revenue_by_currency")
                    .map(([k, v]) => (
                      <article className="metric-card" key={k}>
                        <p>{k.replaceAll("_", " ")}</p>
                        <strong>{Number(v).toLocaleString()}</strong>
                      </article>
                    ))}
                </div>
                {Object.entries(metrics.data?.revenue_by_currency ?? {}).map(
                  ([currency, amount]) => (
                    <p key={currency}>
                      Verified gross payments:{" "}
                      {new Intl.NumberFormat("en-NG", {
                        style: "currency",
                        currency,
                      }).format(Number(amount) / 100)}
                    </p>
                  ),
                )}
              </>
            ) : (
              <p>
                Your role does not have analytics access. Choose a permitted
                review section.
              </p>
            )}
            <div className="form-card">
              <h2>Launch gates</h2>
              <p>
                Refunds, recurring/store billing, settings management,
                verification vendor review, deletion processing and advanced
                analytics remain pending. They are not simulated in this
                dashboard.
              </p>
            </div>
          </>
        )}
        {identity.data && section === "moderation" && (
          <>
            {can(identity.data.role, "moderation") ? (
              <>
                <QueryState
                  pending={queue.isPending}
                  error={queue.error}
                  retry={queue.refetch}
                />
                {queue.data?.length === 0 && <p>No pending cases.</p>}
                {queue.data?.map((item) => (
                  <form
                    className="form-card review-case"
                    key={item.id}
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      run(() =>
                        api("admin/moderation", {
                          method: "POST",
                          body: json({
                            user_id: item.user_id,
                            action: f.get("action"),
                            reason: f.get("reason"),
                            ...(item.report_id
                              ? { report_id: item.report_id }
                              : {}),
                          }),
                        }),
                      );
                    }}
                  >
                    <div>
                      <p className="eyebrow">{item.kind}</p>
                      <h2>
                        {item.category?.replaceAll("_", " ") ?? "Rules signal"}
                      </h2>
                      <p>{item.details ?? item.signals?.join(", ")}</p>
                      <small>
                        Risk signal {item.risk_score}/100 · User {item.user_id}
                      </small>
                    </div>
                    <label>
                      Review action
                      <select name="action">
                        <option value="warn">Warn</option>
                        <option value="suspend">Suspend</option>
                        <option value="ban">Ban</option>
                        <option value="restore">
                          Restore for profile review
                        </option>
                      </select>
                    </label>
                    <label>
                      Reason for your decision
                      <textarea
                        name="reason"
                        required
                        minLength={10}
                        maxLength={1000}
                      />
                    </label>
                    <Button disabled={busy}>Record decision</Button>
                  </form>
                ))}
              </>
            ) : (
              <p>Your role does not have moderation access.</p>
            )}
          </>
        )}
        {identity.data && section === "photos" && (
          <>
            {can(identity.data.role, "verification") ? (
              <>
                <QueryState
                  pending={photos.isPending}
                  error={photos.error}
                  retry={photos.refetch}
                />
                {photos.data?.length === 0 && <p>No photos awaiting review.</p>}
                <div className="photo-review-grid">
                  {photos.data?.map((photo) => (
                    <form
                      className="form-card"
                      key={photo.id}
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        run(() =>
                          api(`admin/photos/${photo.id}/review`, {
                            method: "POST",
                            body: json({
                              approved: f.get("decision") === "approve",
                              reason: f.get("reason"),
                            }),
                          }),
                        );
                      }}
                    >
                      <img
                        src={photo.url}
                        alt="Private profile photo submitted for review"
                      />
                      <small>Owner {photo.user_id}</small>
                      <label>
                        Decision
                        <select name="decision">
                          <option value="reject">Reject</option>
                          <option value="approve">Approve photo content</option>
                        </select>
                      </label>
                      <label>
                        Reason
                        <textarea
                          name="reason"
                          required
                          minLength={10}
                          maxLength={1000}
                        />
                      </label>
                      <p>Photo approval is not identity verification.</p>
                      <Button disabled={busy}>Record photo review</Button>
                    </form>
                  ))}
                </div>
              </>
            ) : (
              <p>Your role does not have photo review access.</p>
            )}
          </>
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
      </main>
    </div>
  );
}
