"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@just1date/ui";
import { BirthdayPicker } from "./birthday-picker";
export function AuthForm({ mode }: { mode: string }) {
  const router = useRouter();
  const [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<{ email: string; password: string; date_of_birth: string }>();
  const isRegister = mode === "register",
    isRecovery = mode === "recovery",
    isReset = mode === "reset";
  const allowed = ["login", "register", "recovery", "reset"].includes(mode);
  return (
    <div className="auth-layout">
      <div className="auth-story">
        <Link className="wordmark" href="/discover">
          <img
            src="/images/logo.png"
            alt="Just1date"
            width={199}
            height={122}
          />
        </Link>
        <div>
          <p className="eyebrow">MAKE ROOM FOR SOMETHING REAL</p>
          <h1>
            One choice.
            <br />A world of
            <br />
            <em>possibility.</em>
          </h1>
          <p>Meet someone worth choosing.</p>
        </div>
        <span>THOUGHTFUL CONNECTIONS. SHARED INTENTIONS.</span>
      </div>
      <div className="auth-form-panel">
        <Link className="text-link" href="/discover">
          ← Back to Just1Date
        </Link>
        <p className="eyebrow">YOUR NEXT CHAPTER</p>
        <h2>
          {isRegister
            ? "Let’s begin."
            : isRecovery
              ? "Find your way back."
              : isReset
                ? "A fresh start."
                : "Welcome back."}
        </h2>
        <p>
          {isRegister
            ? "A few details to start something meaningful."
            : isRecovery
              ? "We’ll send a secure recovery link to your email."
              : isReset
                ? "Choose a new password for your account."
                : "Good connections are worth coming back to."}
        </p>
        {allowed && (
          <form
            onSubmit={handleSubmit(async (fields) => {
              setError("");
              setMessage("");
              try {
                const input: any = { mode };
                if (!isReset) input.email = fields.email;
                if (!isRecovery) input.password = fields.password;
                if (isRegister) input.date_of_birth = fields.date_of_birth;
                const r = await fetch("/api/auth", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(input),
                });
                const result = await r.json();
                if (!r.ok) {
                  setError(result.error);
                  return;
                }
                setMessage(result.message);
                if (mode === "login") router.push("/discover");
                if (isReset) router.push("/profile");
              } catch {
                setError(
                  "We could not connect. Check your connection and try again.",
                );
              }
            })}
          >
            {!isReset && (
              <label>
                Email address
                <input
                  type="email"
                  autoComplete="email"
                  required
                  {...register("email")}
                />
              </label>
            )}
            {!isRecovery && (
              <label>
                Password
                <input
                  type="password"
                  autoComplete={
                    isRegister || isReset ? "new-password" : "current-password"
                  }
                  minLength={mode === "login" ? 1 : 12}
                  required
                  {...register("password")}
                />
                <small>
                  {mode !== "login" && "Use at least 12 characters."}
                </small>
              </label>
            )}
            {isRegister && (
              <div className="birthday-field">
                <p>Date of birth</p>
                <input
                  type="hidden"
                  {...register("date_of_birth", { required: true })}
                />
                <BirthdayPicker
                  value={watch("date_of_birth") || ""}
                  onChange={(v) =>
                    setValue("date_of_birth", v, { shouldValidate: true })
                  }
                />
                <small>
                  You must be at least 18. This cannot be changed in your
                  profile.
                </small>
              </div>
            )}
            {error && (
              <p role="alert" className="error-inline">
                {error}
              </p>
            )}
            {message && (
              <p role="status" className="success-inline">
                {message}
              </p>
            )}
            <Button disabled={isSubmitting}>
              {isSubmitting
                ? "Please wait…"
                : isRegister
                  ? "Create account"
                  : isRecovery
                    ? "Send recovery link"
                    : isReset
                      ? "Update password"
                      : "Sign in"}
            </Button>
          </form>
        )}
        {mode === "login" && (
          <>
            <Link className="text-link" href="/auth/recovery">
              Forgot your password?
            </Link>
            <p>
              New here? <Link href="/auth/register">Create an account</Link>
            </p>
          </>
        )}
        {isRegister && (
          <p className="legal-note">
            By joining, you agree to the <Link href="/legal/terms">Terms</Link>{" "}
            and acknowledge the{" "}
            <Link href="/legal/privacy">Privacy Policy</Link>. These documents
            require legal review before launch.
          </p>
        )}
      </div>
    </div>
  );
}
