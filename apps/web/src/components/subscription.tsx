"use client";
import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Plan } from "@just1date/types";
import { Button } from "@just1date/ui";
import { Shell } from "./shell";
import { QueryState } from "./query-state";
import { api, json } from "../lib/client";
export function Subscription() {
  const qc = useQueryClient();
  const plans = useQuery({
    queryKey: ["plans"],
    queryFn: () => api<Plan[]>("subscriptions/plans"),
  });
  const current = useQuery({
    queryKey: ["subscription"],
    queryFn: () => api<any[]>("subscriptions/me"),
  });
  const [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const operation = useRef<Record<string, string>>({});
  async function pay(p: Plan) {
    setBusy(true);
    setError("");
    try {
      operation.current[p.id] ??= crypto.randomUUID();
      const result = await api("payments/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": operation.current[p.id],
        },
        body: json({ plan_id: p.id }),
      });
      if (result.authorization_url)
        window.location.assign(result.authorization_url);
      else setMessage("Your payment is already confirmed.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Shell title="A little more possibility" eyebrow="YOUR MEMBERSHIP">
      <p className="section-description">
        Choose the experience that feels right for you. Memberships are
        confirmed by the payment provider and the server.
      </p>
      <QueryState
        pending={plans.isPending}
        error={plans.error}
        retry={plans.refetch}
      />
      <div className="plan-grid">
        {plans.data?.map((p) => (
          <article
            className={`plan-card ${p.code === "premium" ? "premium" : ""}`}
            key={p.id}
          >
            <p className="eyebrow">
              {p.code === "premium"
                ? "MORE INTENTIONAL CONNECTIONS"
                : "YOUR WAY TO CONNECT"}
            </p>
            <h2>{p.name}</h2>
            <div className="plan-price">
              {p.code === "free"
                ? "Free"
                : p.purchasable
                  ? new Intl.NumberFormat("en-NG", {
                      style: "currency",
                      currency: p.currency,
                    }).format(p.amount_minor / 100)
                  : "Not yet available"}
            </div>
            <p>
              {p.code === "free"
                ? "Start with thoughtful connections."
                : `Access for ${p.period_days} days. Manual renewal.`}
            </p>
            <ul>
              <li>
                {Number(p.entitlements.daily_likes) >= 100000
                  ? "Unlimited"
                  : p.entitlements.daily_likes}{" "}
                daily likes
              </li>
              <li>Matches and messaging</li>
              {p.entitlements.see_likes && <li>See who likes you</li>}
              {p.entitlements.advanced_filters && <li>Advanced preferences</li>}
              {p.entitlements.ai && <li>AI assistance when enabled</li>}
            </ul>
            {p.code === "free" ? (
              <span className="plan-status">Included with your account</span>
            ) : (
              <>
                <Button
                  disabled={!p.purchasable || busy}
                  onClick={() => pay(p)}
                >
                  {busy
                    ? "Connecting…"
                    : p.purchasable
                      ? `Choose ${p.name}`
                      : "Checkout unavailable"}
                </Button>
                {!p.purchasable && (
                  <small>Pricing and payment setup are pending.</small>
                )}
              </>
            )}
          </article>
        ))}
      </div>
      {current.data
        ?.filter(
          (s) => s.status === "active" && new Date(s.ends_at) > new Date(),
        )
        .map((s) => (
          <div className="form-card" key={s.id}>
            <h3>{s.name}</h3>
            <p>
              Period ends {new Date(s.ends_at).toLocaleDateString("en-GB")} ·{" "}
              {s.cancel_at_period_end
                ? "Ends at period boundary"
                : "Manual renewal"}
            </p>
            <Button
              disabled={busy || s.cancel_at_period_end}
              onClick={async () => {
                setBusy(true);
                try {
                  await api("subscriptions/cancel", { method: "POST" });
                  setMessage(
                    "Your membership will end at the paid period boundary.",
                  );
                  qc.invalidateQueries({ queryKey: ["subscription"] });
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Cancel at period end
            </Button>
          </div>
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
      <p className="legal-note">
        Checkout does not prove payment. Your membership updates after verified
        settlement. Native store subscriptions require separate store billing
        before release.
      </p>
    </Shell>
  );
}
