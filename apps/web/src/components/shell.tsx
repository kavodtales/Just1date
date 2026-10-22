"use client";
import Link from "next/link";
import { ManagedPhoto } from "./managed-photo";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Brand } from "./brand";
import { IncomingCall } from "./call-invitation";
import {
  Copy,
  Heart,
  MessageCircle,
  ShieldCheck,
  UserRound,
  Settings,
  Bell,
  Sparkles,
  ChevronLeft,
  SlidersHorizontal,
  CalendarHeart,
} from "lucide-react";
const primary = [
  ["Discover", "/discover", Copy],
  ["Matches", "/matches", Heart],
  ["Messages", "/messages", MessageCircle],
  ["Dates", "/dates", CalendarHeart],
  ["Profile", "/profile", UserRound],
] as const;
const secondary = [
  ["Likes", "/likes", Heart],
  ["App preview", "/demo", Sparkles],
  ["Get the app", "/download", Copy],
  ["Safety Center", "/safety", ShieldCheck],
  ["Settings", "/settings", Settings],
  ["Notifications", "/notifications", Bell],
] as const;
export function Shell({
  children,
  title,
  headerAction,
  subtitle,
  variant,
}: {
  children: ReactNode;
  title: string;
  eyebrow?: string;
  aside?: ReactNode;
  headerAction?: ReactNode;
  subtitle?: string;
  variant?: "profile" | "chat";
}) {
  const path = usePathname();
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  const active = (href: string) =>
    path.startsWith(href) ||
    (href === "/discover" && path === "/") ||
    (href === "/matches" && path.startsWith("/likes"));
  const discovery = title === "Discover";
  return (
    <div
      className={`app-shell reference-shell ${variant ? `view-${variant}` : ""}`}
    >
      <aside className="sidebar">
        <div className="reference-brand">
          <Brand />
        </div>
        <nav aria-label="Main navigation">
          {[...primary, ...secondary].map(([label, href, Icon]) => (
            <Link
              key={href}
              className={`nav-item ${active(href) ? "selected" : ""}`}
              href={href}
            >
              <Icon size={21} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link className="sidebar-date-card" href="/dates">
            <ManagedPhoto slot="date_venue" loading="lazy" />
            <strong>
              One good date.
              <br />A little possibility.
            </strong>
            <span>Make a plan ↗</span>
          </Link>
          <Link className="button" href="/preferences">
            Your preferences
          </Link>
          <p>Meet someone worth choosing.</p>
          <Link href="/legal/privacy">Privacy</Link> ·{" "}
          <Link href="/legal/terms">Terms</Link>
        </div>
      </aside>
      <div className="workspace">
        <IncomingCall />
        {offline && (
          <div className="offline" role="status">
            You’re offline. We’ll reconnect automatically.
          </div>
        )}
        <main>
          <header className={`reference-header ${discovery ? "centered" : ""}`}>
            {discovery && (
              <Link
                className="square-control"
                href="/welcome"
                aria-label="Back to welcome"
              >
                <ChevronLeft size={23} />
              </Link>
            )}
            <div>
              <p className="shell-kicker">
                {variant === "chat"
                  ? "A BETTER KIND OF HELLO"
                  : discovery
                    ? "A LITTLE POSSIBILITY"
                    : "YOUR JUST1DATE"}
              </p>
              <h1>
                {variant === "chat" ? (
                  <Link href="/messages" aria-label="All conversations">
                    {title}
                  </Link>
                ) : (
                  title
                )}
              </h1>
              {subtitle && <p>{subtitle}</p>}
            </div>
            {headerAction ??
              (discovery ? (
                <Link
                  className="square-control"
                  href="/preferences"
                  aria-label="Open filters"
                >
                  <SlidersHorizontal size={23} />
                </Link>
              ) : (
                <Link
                  className="square-control"
                  href="/settings"
                  aria-label="Open settings"
                >
                  <SlidersHorizontal size={23} />
                </Link>
              ))}
          </header>
          <div className="page-content">{children}</div>
          {discovery && (
            <aside className="discovery-insight">
              <ManagedPhoto slot="date_venue" loading="lazy" />
              <span className="editorial-kicker">BEYOND THE FIRST HELLO</span>
              <h2>
                Give a spark
                <br />
                somewhere to go.
              </h2>
              <p>
                When the interest is mutual, choose a little time for each
                other. Coffee, a gallery, or a table for two.
              </p>
              <Link href="/dates" className="button">
                Explore Just One Date ↗
              </Link>
              <small>
                Illustrative setting. Plans need both people’s consent; no
                booking is made.
              </small>
            </aside>
          )}
        </main>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {primary.map(([label, href, Icon]) => (
          <Link
            key={href}
            className={active(href) ? "selected" : ""}
            href={href}
            aria-label={label}
            aria-current={active(href) ? "page" : undefined}
          >
            <Icon
              size={23}
              fill={href !== "/discover" ? "currentColor" : "none"}
            />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
