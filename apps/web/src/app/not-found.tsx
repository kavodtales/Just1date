import Link from "next/link";
export default function NotFound() {
  return (
    <div className="route-loading">
      <h1>A different path awaits.</h1>
      <p>This page doesn’t exist.</p>
      <Link className="button" href="/discover">
        Back to discovery
      </Link>
    </div>
  );
}
