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
        {["Facebook", "Google", "Apple"].map(provider => <button key={provider} disabled aria-label={`${provider} sign-in is not enabled`}><img src={`/images/social-${provider.toLowerCase()}.png`} alt="" width={30} height={30} /></button>)}
      </div>
      <p className="social-availability">Social sign-in is not enabled yet.</p>
      <footer>
        <Link href="/legal/terms">Terms of use</Link>
        <Link href="/legal/privacy">Privacy Policy</Link>
      </footer>
    </main>
  );
}
