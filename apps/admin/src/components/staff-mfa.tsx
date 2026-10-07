"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@just1date/ui";

export function StaffMfa() {
  const [factors, setFactors] = useState<{ id: string; name: string }[]>([]);
  const [factorId, setFactorId] = useState("");
  const [enrollment, setEnrollment] = useState<{
    qr_code: string;
    secret: string;
  }>();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/mfa", { cache: "no-store" })
      .then(async (res) => {
        const value = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(value.error);
        setFactors(value.factors);
        setFactorId(value.factors[0]?.id ?? "");
        setLoaded(true);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message ?? "Could not load authentication.");
      });
    return () => {
      cancelled = true;
    };
  }, []);
  async function submit(action: "enroll" | "verify") {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "enroll"
            ? { action }
            : { action, factor_id: factorId, code },
        ),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      if (action === "enroll") {
        setEnrollment(result);
        setFactorId(result.factor_id);
      } else {
        setEnrollment(undefined);
        setCode("");
        window.location.assign("/");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="staff-mfa">
      <h1>Staff authentication</h1>
      <p>Verify your authenticator to access moderation and photo review.</p>
      {error && <p role="alert">{error}</p>}
      {!loaded && !error && <p>Loading authentication…</p>}
      {loaded && !factorId && (
        <Button disabled={busy} onClick={() => submit("enroll")}>
          Set up authenticator
        </Button>
      )}
      {enrollment && (
        <div>
          <p>
            Scan this code with your authenticator app, then enter its six-digit
            code.
          </p>
          <img
            src={
              enrollment.qr_code.startsWith("data:")
                ? enrollment.qr_code
                : `data:image/svg+xml;utf8,${encodeURIComponent(enrollment.qr_code)}`
            }
            width={240}
            height={240}
            alt="Authenticator setup QR code"
          />
          <details>
            <summary>Enter a setup key manually</summary>
            <code>{enrollment.secret}</code>
          </details>
        </div>
      )}
      {factorId && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit("verify");
          }}
        >
          {factors.length > 1 && (
            <label>
              Authenticator
              <select
                value={factorId}
                onChange={(event) => setFactorId(event.target.value)}
              >
                {factors.map((factor) => (
                  <option key={factor.id} value={factor.id}>
                    {factor.name || "Authenticator"}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Authentication code
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, ""))
              }
            />
          </label>
          <Button disabled={busy || code.length !== 6} type="submit">
            {busy ? "Verifying…" : "Verify and continue"}
          </Button>
        </form>
      )}
      <p>
        <Link href="/auth/login">Sign in</Link> ·{" "}
        <Link href="/">Return to staff dashboard</Link>
      </p>
    </main>
  );
}
