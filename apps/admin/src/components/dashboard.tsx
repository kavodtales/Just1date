"use client";
import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  Activity,
  Flag,
  Camera,
  LogOut,
  Users,
} from "lucide-react";
import { Brand } from "../../../web/src/components/brand";
import { can, type AdminRole } from "@just1date/config";
import { Button } from "@just1date/ui";
import { api, json, ClientError } from "../../../web/src/lib/client";
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
  const demos = useQuery({
    queryKey: ["demo-admin"],
    queryFn: () =>
      api<{
        active: number;
        profiles: Array<{
          id: string;
          name: string;
          age: number;
          city: string;
          image: string;
          removed_at: string | null;
        }>;
      }>("admin/demo"),
    enabled: Boolean(permission && can(permission, "settings")),
  });
  const [confirmDemo, setConfirmDemo] = useState(false);
  async function run(work: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await work();
      setMessage("Action recorded in the audit trail.");
      qc.invalidateQueries({ queryKey: ["photos"] });
      qc.invalidateQueries({ queryKey: ["moderation"] });
      qc.invalidateQueries({ queryKey: ["metrics"] });
      qc.invalidateQueries({ queryKey: ["demo-admin"] });
      setConfirmDemo(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="admin-layout">
      <aside>
        <Brand />
        <p className="eyebrow">TRUST & OPERATIONS</p>
        {[
          ["overview", "Overview", Activity],
          ["moderation", "Moderation", Flag],
          ["photos", "Photo review", Camera],
          ["demo", "Demo profiles", Users],
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
          <small>Protected staff workspace</small>
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
        {identity.error instanceof ClientError &&
          identity.error.code === "MFA_REQUIRED" && (
            <p role="alert">
              Verify your authenticator to continue.{" "}
              <Link href="/auth/mfa">Staff authentication</Link>
            </p>
          )}
        <div className="page-heading">
          <div>
            <p className="eyebrow">JUST1DATE OPERATIONS</p>
            <h1>
              {section === "overview"
                ? "A responsible view."
                : section === "moderation"
                  ? "Care, with accountability."
                  : section === "demo"
                    ? "Ready for real connections."
                    : "First impressions, reviewed."}
            </h1>
          </div>
          <span className="admin-badge">RESTRICTED ACCESS</span>
        </div>
        <QueryState
          staff
          pending={identity.isPending}
          error={identity.error}
          retry={identity.refetch}
        />
        {identity.data && section === "overview" && (
          <>
            <p className="section-description">
              Community activity from your live member records.
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
              <h2>Community care</h2>
              <p>
                Review new photos, respond to member reports, and manage the
                four fictional demo profiles.
              </p>
              <button
                className="button secondary"
                onClick={() => setSection("demo")}
              >
                Manage demo profiles
              </button>
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
                      <Image
                        sizes="(max-width: 767px) 90vw, 35vw"
                        width={1024}
                        height={1536}
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
        {identity.data &&
          section === "demo" &&
          (can(identity.data.role, "settings") ? (
            <>
              <p className="section-description">
                Exactly four fictional profiles power the interactive preview.
                They stay separate from real member accounts, matches and
                messages.
              </p>
              <QueryState
                pending={demos.isPending}
                error={demos.error}
                retry={demos.refetch}
              />
              {demos.data && (
                <>
                  <div className="admin-demo-grid">
                    {demos.data.profiles.map((p) => (
                      <article className="admin-demo-card" key={p.id}>
                        <Image
                          sizes="(max-width: 767px) 90vw, 35vw"
                          width={1024}
                          height={1536}
                          src={p.image}
                          alt={`${p.name}, fictional demo profile`}
                        />
                        <div>
                          <span className="premium-kicker">FICTIONAL DEMO</span>
                          <h2>
                            {p.name}, {p.age}
                          </h2>
                          <p>
                            {p.city} ·{" "}
                            {p.removed_at ? "Removed" : "Visible in preview"}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                  <div className="form-card">
                    <h2>
                      {demos.data.active
                        ? "Switch to real members"
                        : "The demo is removed"}
                    </h2>
                    <p>
                      {demos.data.active
                        ? "Remove all four demo profiles from the public preview when your real accounts are ready. This also clears demo conversations. Real members and their activity are unaffected."
                        : "The public preview is disabled. Your real community continues normally. Restore the same four profiles if you need another preview."}
                    </p>
                    {demos.data.active ? (
                      confirmDemo ? (
                        <div className="admin-demo-confirm">
                          <p>
                            Remove Amara, Tomi, Zara and Daniel, and clear their
                            demo sessions? You can restore the four profiles
                            here later. Cleared demo chats cannot be restored.
                          </p>
                          <Button
                            disabled={busy}
                            onClick={() =>
                              run(() =>
                                api("admin/demo", {
                                  method: "POST",
                                  body: json({ action: "remove" }),
                                }),
                              )
                            }
                          >
                            Confirm removal of 4 demos
                          </Button>
                          <button
                            className="button secondary"
                            disabled={busy}
                            onClick={() => setConfirmDemo(false)}
                          >
                            Keep the demo
                          </button>
                        </div>
                      ) : (
                        <Button
                          disabled={busy}
                          onClick={() => setConfirmDemo(true)}
                        >
                          Remove all 4 demo profiles
                        </Button>
                      )
                    ) : (
                      <Button
                        disabled={busy}
                        onClick={() =>
                          run(() =>
                            api("admin/demo", {
                              method: "POST",
                              body: json({ action: "restore" }),
                            }),
                          )
                        }
                      >
                        Restore the 4 demo profiles
                      </Button>
                    )}
                  </div>
                </>
              )}
            </>
          ) : (
            <p>Your role does not have demo management access.</p>
          ))}
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
