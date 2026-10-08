"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { ArrowRight, Eye, EyeOff, Heart, ArrowUpRight } from "lucide-react";
import { Brand } from "./brand";
export function AuthForm({
  mode,
  staff = false,
}: {
  mode: string;
  staff?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [visible, setVisible] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<{ email: string; password: string; date_of_birth: string }>();
  const isRegister = mode === "register",
    isRecovery = mode === "recovery",
    isReset = mode === "reset";
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 18);
  return (
    <div className="premium-auth">
      <aside className="premium-auth-story">
        <Brand />
        <div className="auth-photo">
          <Image
            sizes="(max-width: 767px) 90vw, 35vw"
            width={1024}
            height={1536}
            src="/images/demo/amara.png"
            alt="Fictional demo portrait"
          />
          <div>
            <span className="premium-kicker">
              {staff ? "JUST1DATE COMMUNITY CARE" : "MAKE ROOM FOR POSSIBILITY"}
            </span>
            <h1>
              {staff ? "A little care." : "Your next chapter"}
              <br />
              {staff ? "A safer" : "starts with"}
              <br />
              <em>{staff ? "community." : "a little hello."}</em>
            </h1>
            <p>
              Shared values. Thoughtful conversations.
              <br />
              Someone worth getting to know.
            </p>
          </div>
        </div>
        <span className="auth-photo-note">Illustrative fictional profile</span>
      </aside>
      <main className="premium-auth-panel">
        <Link href="/" className="quiet-link">
          ← Back to Just1date
        </Link>
        <div className="auth-form-content">
          <span className="auth-heart">
            <Heart size={24} />
          </span>
          <p className="premium-kicker">
            {isRegister ? "SOMETHING GOOD STARTS HERE" : "YOUR NEXT CHAPTER"}
          </p>
          <h2>
            {isRegister
              ? "Let’s get to know you."
              : isRecovery
                ? "Find your way back."
                : isReset
                  ? "A fresh start."
                  : "Welcome back."}
          </h2>
          <p className="auth-intro">
            {isRegister
              ? "A few details. A little intention. A world of possibility."
              : isRecovery
                ? "We’ll send a secure recovery link to your email."
                : isReset
                  ? "Choose a new password for your account."
                  : "Your connections are waiting. Let’s pick up where you left off."}
          </p>
          {["login", "register", "recovery", "reset"].includes(mode) && (
            <form
              onSubmit={handleSubmit(async (fields) => {
                setError("");
                setMessage("");
                try {
                  const input: Record<string, string> = { mode };
                  if (!isReset) input.email = fields.email;
                  if (!isRecovery) input.password = fields.password;
                  if (isRegister) input.date_of_birth = fields.date_of_birth;
                  const response = await fetch("/api/auth", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(input),
                  });
                  const result = await response.json();
                  if (!response.ok) {
                    setError(result.error);
                    return;
                  }
                  setMessage(result.message);
                  if (mode === "login") {
                    router.push(staff ? "/auth/mfa" : "/discover");
                    router.refresh();
                  }
                  if (isReset) router.push(staff ? "/auth/login" : "/profile");
                } catch {
                  setError(
                    "We couldn’t connect. Check your connection and try again.",
                  );
                }
              })}
            >
              {!isReset && (
                <label>
                  Email address
                  <input
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    {...register("email")}
                  />
                </label>
              )}
              {!isRecovery && (
                <label>
                  Password
                  <div className="premium-password">
                    <input
                      type={visible ? "text" : "password"}
                      autoComplete={
                        isRegister || isReset
                          ? "new-password"
                          : "current-password"
                      }
                      placeholder={
                        mode === "login"
                          ? "Enter your password"
                          : "Create a strong password"
                      }
                      minLength={mode === "login" ? 1 : 12}
                      maxLength={128}
                      required
                      {...register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setVisible(!visible)}
                      aria-label={visible ? "Hide password" : "Show password"}
                    >
                      {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {mode !== "login" && (
                    <small>Use at least 12 characters.</small>
                  )}
                </label>
              )}
              {isRegister && (
                <label>
                  Date of birth
                  <input
                    type="date"
                    required
                    max={cutoff.toISOString().slice(0, 10)}
                    min="1900-01-01"
                    autoComplete="bday"
                    {...register("date_of_birth")}
                  />
                  <small>
                    You must be 18 or older. Your birthday stays private.
                  </small>
                </label>
              )}
              {mode === "login" && (
                <Link className="auth-forgot" href="/auth/recovery">
                  Forgot password?
                </Link>
              )}
              {error && (
                <p className="premium-error" role="alert">
                  {error}
                </p>
              )}
              {message && (
                <p className="success-inline" role="status">
                  {message}
                </p>
              )}
              <button
                className="premium-button auth-submit"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Please wait…"
                  : isRegister
                    ? "Create my account"
                    : isRecovery
                      ? "Send recovery link"
                      : isReset
                        ? "Update password"
                        : "Sign in"}
                <ArrowRight size={18} />
              </button>
            </form>
          )}
          {isRegister && (
            <p className="auth-legal">
              By joining, you agree to our{" "}
              <Link href="/legal/terms">Terms</Link> and acknowledge our{" "}
              <Link href="/legal/privacy">Privacy Policy</Link>. Check your
              email to confirm your account before joining the community.
            </p>
          )}
          {!staff && (
            <p className="auth-switch">
              {isRegister ? "Already have an account? " : "New to Just1date? "}
              <Link href={isRegister ? "/auth/login" : "/auth/register"}>
                {isRegister ? "Sign in" : "Join us"}
              </Link>
            </p>
          )}
          {!staff && (
            <div className="auth-preview">
              <div>
                <strong>Want to look around first?</strong>
                <p>Explore 4 fictional profiles. No signup required.</p>
              </div>
              <Link href="/demo" aria-label="Try the app">
                Try the app <ArrowUpRight size={17} />
              </Link>
            </div>
          )}
          {staff && (
            <p className="auth-switch">
              Staff access requires an approved account and authenticator
              verification.
            </p>
          )}
        </div>
        <footer>THOUGHTFUL CONNECTIONS. SHARED INTENTIONS.</footer>
      </main>
    </div>
  );
}
