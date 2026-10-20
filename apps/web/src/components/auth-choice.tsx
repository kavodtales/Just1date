"use client";
import Link from "next/link";
export function AuthChoice() {
  return (
    <main className="signup-screen">
      <Link
        href="/welcome"
        aria-label="Back to welcome"
        className="signup-logo"
      >
        <img src="/images/logo.png" alt="Just1date" width={199} height={122} />
      </Link>
      <h1>Sign up to continue</h1>
      <div className="signup-options">
        <Link className="button" href="/auth/register">
          Continue with email
        </Link>
        <Link className="button secondary" href="/auth/phone">
          Use phone number
        </Link>
      </div>
      <div className="signup-divider">
        <span />
        or sign up
        <br />
        with
        <span />
      </div>
      <div className="social-options" aria-label="Social sign-in availability">
        {["Facebook", "Google", "Apple"].map((provider) => (
          <button
            key={provider}
            disabled
            aria-label={`${provider} sign-in is not enabled`}
          >
            {provider === "Apple" ? (
              <svg
                aria-hidden="true"
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M17.1 12.6c0-2 1.7-3 1.8-3.1-1-1.5-2.5-1.7-3.1-1.7-1.3-.1-2.5.8-3.2.8-.7 0-1.7-.8-2.8-.8C7.5 7.8 5 9.5 5 13c0 2.2.8 4.6 1.8 6.1.8 1.1 1.5 2.3 2.7 2.2 1.1 0 1.5-.7 2.9-.7 1.3 0 1.7.7 2.9.7s1.9-1.1 2.7-2.2c.9-1.3 1.2-2.5 1.3-2.6-.1 0-2.2-.9-2.2-3.9ZM15.1 6.3c.6-.8 1.1-1.9 1-3-.9 0-2 .6-2.7 1.4-.6.7-1.2 1.8-1.1 2.9 1 .1 2.1-.5 2.8-1.3Z" />
              </svg>
            ) : (
              <span
                aria-hidden="true"
                style={{
                  fontFamily: "Arial,sans-serif",
                  fontWeight: 700,
                  fontSize: 36,
                  lineHeight: 1,
                }}
              >
                {provider === "Facebook" ? "f" : "G"}
              </span>
            )}
          </button>
        ))}
      </div>
      <p className="social-availability">Social sign-in is not enabled yet.</p>
      <footer>
        <Link href="/legal/terms">Terms of use</Link>
        <Link href="/legal/privacy">Privacy Policy</Link>
      </footer>
    </main>
  );
}
