"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Delete } from "lucide-react";
import { Button } from "@just1date/ui";
export function PhoneAuth() {
  const router = useRouter();
  const [phone, setPhone] = useState(""),
    [country, setCountry] = useState("234"),
    [code, setCode] = useState(""),
    [sent, setSent] = useState(false),
    [remaining, setRemaining] = useState(0),
    [resendAt, setResendAt] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (!resendAt) return;
    const t = setInterval(() => {
      const seconds = Math.max(0, Math.ceil((resendAt - Date.now()) / 1000));
      setRemaining(seconds);
      if (!seconds) clearInterval(t);
    }, 1000);
    return () => clearInterval(t);
  }, [resendAt]);
  async function submit(verify = false) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: verify ? "phone_verify" : "phone_send",
          phone: `+${country}${phone.replace(/^0/, "")}`,
          ...(verify ? { token: code } : {}),
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      if (verify) router.push("/discover");
      else {
        setSent(true);
        setCode("");
        setRemaining(60);
        setResendAt(Date.now() + 60000);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className={`phone-screen ${sent ? "otp-screen" : ""}`}>
      {sent ? (
        <button
          className="square-control"
          aria-label="Change phone number"
          onClick={() => setSent(false)}
        >
          <ChevronLeft />
        </button>
      ) : (
        <Link className="square-control" href="/auth/signup" aria-label="Back">
          <ChevronLeft />
        </Link>
      )}
      {sent ? (
        <>
          <h1>{`${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`}</h1>
          <p className="otp-description">
            Type the verification code
            <br />
            we’ve sent you
          </p>
          <label className="sr-only" htmlFor="otp">
            Verification code
          </label>
          <input
            id="otp"
            className="otp-native-input"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            maxLength={6}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
          <div className="otp-cells" aria-hidden="true">
            {Array.from({ length: 6 }, (_, i) => (
              <span
                key={i}
                className={
                  code[i] ? "filled" : i === code.length ? "current" : ""
                }
              >
                {code[i] ?? "0"}
              </span>
            ))}
          </div>
          <div className="numeric-keypad">
            {[
              "1",
              "2",
              "3",
              "4",
              "5",
              "6",
              "7",
              "8",
              "9",
              "",
              "0",
              "delete",
            ].map((n, i) =>
              n ? (
                <button
                  type="button"
                  disabled={busy}
                  key={n}
                  aria-label={n === "delete" ? "Delete last digit" : n}
                  onClick={() =>
                    setCode((x) =>
                      n === "delete" ? x.slice(0, -1) : (x + n).slice(0, 6),
                    )
                  }
                >
                  {n === "delete" ? <Delete size={24} /> : n}
                </button>
              ) : (
                <span key={i} />
              ),
            )}
          </div>
          <Button
            disabled={busy || code.length !== 6}
            onClick={() => submit(true)}
          >
            {busy ? "Verifying…" : "Verify code"}
          </Button>
          <button
            className="pink-link resend"
            disabled={busy || remaining > 0}
            onClick={() => submit()}
          >
            Send again
          </button>
        </>
      ) : (
        <>
          <h1>My mobile</h1>
          <p>
            Please enter your registered phone number. We will send you a code
            to sign in.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <div className="phone-field">
              <select
                aria-label="Country calling code"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                <option value="234">🇳🇬 234</option>
                <option value="233">🇬🇭 233</option>
                <option value="1">🇺🇸 1</option>
                <option value="44">🇬🇧 44</option>
              </select>
              <input
                aria-label="Phone number"
                type="tel"
                autoComplete="tel-national"
                placeholder="Phone number"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                minLength={7}
                maxLength={12}
              />
            </div>
            <Button disabled={busy}>{busy ? "Sending…" : "Continue"}</Button>
          </form>
          <p className="phone-note">
            New here?{" "}
            <Link href="/auth/register">Create your account with email</Link>.
          </p>
        </>
      )}
      {error && (
        <p role="alert" className="error-inline">
          {error}
        </p>
      )}
    </main>
  );
}
