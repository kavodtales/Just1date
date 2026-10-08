"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Brand } from "./brand";
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
} from "lucide-react";
const primary = [
  ["Discover", "/discover", Copy],
  ["Matches", "/matches", Heart],
  ["Messages", "/messages", MessageCircle],
  ["Profile", "/profile", UserRound],
] as const;
const secondary = [
  ["Likes", "/likes", Heart],
  ["App preview", "/demo", Sparkles],
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
          <Link className="button" href="/preferences">
            Your preferences
          </Link>
          <p>Meet someone worth choosing.</p>
          <Link href="/legal/privacy">Privacy</Link> ·{" "}
          <Link href="/legal/terms">Terms</Link>
        </div>
      </aside>
      <div className="workspace">
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
            <span className="sr-only">{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
