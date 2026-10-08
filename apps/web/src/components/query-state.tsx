"use client";
import Link from "next/link";
import { State, Button } from "@just1date/ui";
import { ClientError } from "../lib/client";
export function QueryState({
  pending,
  error,
  retry,
  staff = false,
}: {
  pending: boolean;
  error: Error | null;
  retry: () => unknown;
  staff?: boolean;
}) {
  if (pending)
    return (
      <div className="skeleton-card" aria-label="Loading" role="status">
        <div className="skeleton" />
        <div className="skeleton-line" />
        <div className="skeleton-line short" />
        <span className="sr-only">Loading your experience…</span>
      </div>
    );
  if (error instanceof ClientError && error.status === 401)
    if (staff)
      return (
        <State title="Sign in to your staff workspace">
          <p>
            Use your approved staff account, then verify your authenticator.
          </p>
          <Link className="button" href="/auth/login">
            Staff sign in
          </Link>
        </State>
      );
  if (error instanceof ClientError && error.status === 401)
    return (
      <State title="Your next chapter starts here">
        <p>Make room for a connection with shared intentions.</p>
        <div className="state-actions">
          <Link className="button" href="/auth/register">
            Create your account
          </Link>
          <Link className="text-link" href="/auth/login">
            Already a member? Sign in
          </Link>
          <Link className="text-link" href="/demo">
            Try the app with 4 demo profiles
          </Link>
        </div>
      </State>
    );
  if (error)
    return (
      <State
        kind="error"
        title={
          error instanceof ClientError && error.code === "ONBOARDING_REQUIRED"
            ? "A few details before we begin"
            : "We couldn’t load this yet"
        }
      >
        <p>{error.message}</p>
        <div className="state-actions">
          {error instanceof ClientError &&
          error.code === "ONBOARDING_REQUIRED" ? (
            <Link className="button" href="/onboarding">
              Complete my profile
            </Link>
          ) : (
            <Button onClick={() => retry()}>Try again</Button>
          )}
          <Link className="text-link" href="/auth/login">
            Sign in
          </Link>
        </div>
      </State>
    );
  return null;
}
