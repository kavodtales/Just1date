"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, X, Search, ArrowDownUp } from "lucide-react";
import { State, Button } from "@just1date/ui";
import { Shell } from "./shell";
import { Sheet } from "./sheet";
import { QueryState } from "./query-state";
import { api, json } from "../lib/client";
export function Connections({
  likes = false,
  messages = false,
}: {
  likes?: boolean;
  messages?: boolean;
}) {
  const qc = useQueryClient();
  const [search, setSearch] = useState(""),
    [reverse, setReverse] = useState(false),
    [older, setOlder] = useState<any[]>([]),
    [more, setMore] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [remove, setRemove] = useState<any>(null);
  const endpoint = likes ? "likes" : messages ? "conversations" : "matches";
  const q = useQuery({
    queryKey: [endpoint],
    queryFn: () => api<any[]>(endpoint),
    refetchInterval: messages ? 15000 : false,
  });
  const rows = [
    ...new Map(
      [...(q.data ?? []), ...older].map((row) => [
        likes ? row.user_id : row.id,
        row,
      ]),
    ).values(),
  ];
  const visible = rows.filter((row) =>
    (likes ? row.display_name : row.profile.display_name)
      ?.toLowerCase()
      .includes(search.toLowerCase()),
  );
  if (reverse) visible.reverse();
  async function react(row: any, pass: boolean) {
    setBusy(true);
    setError("");
    try {
      await api(pass ? "passes" : "likes", {
        method: "POST",
        body: json({
          target_id: row.user_id,
          operation_id: crypto.randomUUID(),
        }),
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["likes"] }),
        qc.invalidateQueries({ queryKey: ["matches"] }),
      ]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function loadMore() {
    const last = rows.at(-1);
    if (!last) return;
    setMore(true);
    try {
      const result = await api<any[]>(
        `${endpoint}?before=${encodeURIComponent(last.created_at)}&before_id=${last.id}`,
      );
      setOlder((v) => [...v, ...result]);
      if (!result.length)
        setError("You’ve reached the end of your connections.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setMore(false);
    }
  }
  return (
    <Shell
      title={likes ? "Likes" : messages ? "Messages" : "Matches"}
      headerAction={
        <button
          className="square-control"
          onClick={() => setReverse((v) => !v)}
          aria-label={
            reverse ? "Sort newest first" : "Reverse connection order"
          }
        >
          <ArrowDownUp size={23} />
        </button>
      }
    >
      {!messages && (
        <>
          <p className="section-description">
            This is a list of people who have liked you and your matches.
          </p>
          <nav className="connections-tabs" aria-label="Connection lists">
            <Link className={likes ? "" : "selected"} href="/matches">
              Matches
            </Link>
            <Link className={likes ? "selected" : ""} href="/likes">
              Likes you
            </Link>
          </nav>
        </>
      )}
      {messages && (
        <div className="message-search">
          <Search size={19} />
          <input
            aria-label="Search messages by member name"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}
      <QueryState pending={q.isPending} error={q.error} retry={q.refetch} />
      {q.data?.length === 0 && (
        <State
          title={
            likes ? "No new likes yet" : "Your next connection starts here"
          }
        >
          <p>
            {likes
              ? "New likes will appear here."
              : "When the interest is mutual, your match and conversation appear here."}
          </p>
          <Link className="button" href="/discover">
            Keep swiping
          </Link>
        </State>
      )}
      {messages && rows.length > 0 && (
        <>
          <h2 className="messages-heading">Activities</h2>
          <div className="activities">
            {rows.slice(0, 20).map((row) => (
              <Link
                className="activity"
                href={`/profile/${row.profile.user_id}`}
                key={row.id}
              >
                {row.profile.photos?.[0] ? (
                  <img src={row.profile.photos[0]} alt="" />
                ) : (
                  <span className="activity-placeholder">
                    {row.profile.display_name?.[0]}
                  </span>
                )}
                <span>{row.profile.display_name}</span>
              </Link>
            ))}
          </div>
          <h2 className="messages-heading">Messages</h2>
        </>
      )}
      {messages ? (
        <div className="conversation-list">
          {visible.map((row) => (
            <Link
              className="conversation-row"
              href={`/messages/${row.conversation_id}`}
              key={row.id}
            >
              {row.profile.photos?.[0] ? (
                <img src={row.profile.photos[0]} alt="" />
              ) : (
                <span className="conversation-avatar">
                  {row.profile.display_name?.[0]}
                </span>
              )}
              <div className="conversation-preview">
                <h3>{row.profile.display_name}</h3>
                <time dateTime={row.last_message?.created_at ?? row.created_at}>
                  {new Date(
                    row.last_message?.created_at ?? row.created_at,
                  ).toLocaleDateString("en", {
                    month: "short",
                    day: "numeric",
                  })}
                </time>
                <p>
                  {row.last_message
                    ? row.last_message.deleted
                      ? "Message removed"
                      : row.last_message.body
                    : "Say hello to your new match"}
                </p>
                {row.unread_count > 0 && (
                  <span
                    className="unread-badge"
                    aria-label={`${row.unread_count} unread messages`}
                  >
                    {row.unread_count > 99 ? "99+" : row.unread_count}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="connections-grid">
          {visible.map((row) => {
            const p = likes ? row : row.profile;
            return (
              <article
                className="connection-card"
                key={likes ? p.user_id : row.id}
              >
                <Link
                  className="connection-art"
                  href={`/profile/${p.user_id}`}
                  aria-label={`View ${p.display_name}'s profile`}
                >
                  {p.photos?.[0] ? (
                    <img src={p.photos[0]} alt="" loading="lazy" />
                  ) : (
                    <span>{p.display_name?.[0]}</span>
                  )}
                </Link>
                <div className="connection-caption">
                  <h2>
                    {p.display_name}, {p.age}
                  </h2>
                  <div className="connection-actions">
                    <button
                      disabled={busy}
                      aria-label={
                        likes
                          ? `Pass on ${p.display_name}`
                          : `Unmatch ${p.display_name}`
                      }
                      onClick={() =>
                        likes ? react(row, true) : setRemove(row)
                      }
                    >
                      <X size={20} strokeWidth={4} />
                    </button>
                    {likes ? (
                      <button
                        disabled={busy}
                        aria-label={`Like ${p.display_name} back`}
                        onClick={() => react(row, false)}
                      >
                        <Heart size={22} fill="currentColor" />
                      </button>
                    ) : (
                      <Link
                        href={`/messages/${row.conversation_id}`}
                        aria-label={`Message ${p.display_name}`}
                      >
                        <Heart size={22} fill="currentColor" />
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {messages && q.data && visible.length === 0 && rows.length > 0 && (
        <p role="status">No conversations match your search.</p>
      )}
      {!likes && rows.length >= 30 && (
        <Button disabled={more} onClick={loadMore}>
          {more ? "Loading…" : "Load more"}
        </Button>
      )}
      {error && (
        <p className="error-inline" role="alert">
          {error}
        </p>
      )}
      {remove && (
        <Sheet title="Unmatch?" onClose={() => setRemove(null)}>
          <p>
            This closes your conversation with {remove.profile.display_name}.
          </p>
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await api(`matches/${remove.id}`, { method: "DELETE" });
                setOlder((v) => v.filter((r) => r.id !== remove.id));
                await qc.invalidateQueries({ queryKey: ["matches"] });
                setRemove(null);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Unmatch
          </Button>
        </Sheet>
      )}
    </Shell>
  );
}
