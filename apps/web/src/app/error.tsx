"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="route-loading" role="alert">
      <h1>Let’s try that again.</h1>
      <p>This page could not load. Your account details are safe.</p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
