"use client";
import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Heart, Trash2, Flag, Reply, MoreHorizontal } from "lucide-react";
import type { Message } from "@just1date/types";
import { Button, State } from "@just1date/ui";
import { Shell } from "./shell";
import { QueryState } from "./query-state";
import { api, json } from "../lib/client";
import { realtimeClient } from "../lib/realtime";
export function Chat({ id }: { id: string }) {
  const qc = useQueryClient();
  const [text, setText] = useState(""),
    [older, setOlder] = useState<Message[]>([]),
    [reply, setReply] = useState<Message | null>(null),
    [typing, setTyping] = useState(false),
    [realtime, setRealtime] = useState(false),
    [error, setError] = useState(""),
    [loadingOlder, setLoadingOlder] = useState(false);
  const operation = useRef<{ body: string; id: string } | null>(null);
  const channel = useRef<any>(null);
  const q = useQuery({
    queryKey: ["messages", id],
    queryFn: () => api<Message[]>(`conversations/${id}/messages`),
    refetchInterval: realtime ? false : 15000,
  });
  const me = useQuery({ queryKey: ["me"], queryFn: () => api("profiles/me") });
  const matches = useQuery({
    queryKey: ["matches"],
    queryFn: () => api<any[]>("matches"),
  });
  const match = matches.data?.find((m) => m.conversation_id === id);
  const send = useMutation({
    mutationFn: async () => {
      if (operation.current?.body !== text)
        operation.current = { body: text, id: crypto.randomUUID() };
      return api(`conversations/${id}/messages`, {
        method: "POST",
        body: json({
          body: text,
          client_id: operation.current.id,
          reply_to: reply?.id ?? null,
        }),
      });
    },
    onSuccess: () => {
      operation.current = null;
      setText("");
      setReply(null);
      qc.invalidateQueries({ queryKey: ["messages", id] });
    },
    onError: (e) => setError(e.message),
  });
  useEffect(() => {
    let cancelled = false;
    let cleanup = () => {};
    let timeout: ReturnType<typeof setTimeout>;
    realtimeClient()
      .then((session) => {
        if (!session || cancelled) return;
        const c = session.client
          .channel(`chat:${id}`, {
            config: { postgres_changes_options: { wait: true } },
          })
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "messages",
              filter: `conversation_id=eq.${id}`,
            },
            () => qc.invalidateQueries({ queryKey: ["messages", id] }),
          )
          .subscribe((status) => {
            const subscribed = status === "SUBSCRIBED";
            setRealtime(subscribed);
            if (subscribed)
              qc.invalidateQueries({ queryKey: ["messages", id] });
          });
        const presence = session.client
          .channel(`conversation:${id}`, {
            config: { private: true, broadcast: { self: false } },
          })
          .on("broadcast", { event: "typing" }, () => {
            setTyping(true);
            clearTimeout(timeout);
            timeout = setTimeout(() => setTyping(false), 3000);
          })
          .subscribe();
        channel.current = presence;
        const refresh = setInterval(async () => {
          const r = await fetch("/api/session");
          if (r.ok)
            await session.client.realtime.setAuth(
              (await r.json()).access_token,
            );
        }, 240000);
        cleanup = () => {
          clearInterval(refresh);
          clearTimeout(timeout);
          session.client.removeChannel(c);
          session.client.removeChannel(presence);
        };
      })
      .catch(() => {
        if (!cancelled) setRealtime(false);
      });
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [id, qc]);
  useEffect(() => {
    if (q.data)
      api(`conversations/${id}/read`, { method: "POST" })
        .then(() => qc.invalidateQueries({ queryKey: ["conversations"] }))
        .catch(() => {});
  }, [q.data, id, qc]);
  const messages = [
    ...new Map([...(q.data ?? []), ...older].map((m) => [m.id, m])).values(),
  ].sort(
    (a, b) =>
      a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id),
  );
  return (
    <Shell title="Messages" variant="chat" eyebrow="LET’S START WITH HELLO">
      <div className="sheet-handle" aria-hidden="true" />
      <div className="chat-person">
        <Link
          className="square-control"
          aria-label="All conversations"
          href="/messages"
        >
          ‹
        </Link>
        {match?.profile.photos?.[0] && (
          <img src={match.profile.photos[0]} alt="" />
        )}
        <div>
          <Link href={match ? `/profile/${match.profile.user_id}` : "/matches"}>
            <h2>{match?.profile.display_name ?? "Your conversation"}</h2>
          </Link>
          <span>
            {realtime ? "Live updates connected" : "Checking for new messages"}
          </span>
        </div>
        {match && (
          <Link
            className="square-control"
            aria-label="Report a concern"
            href={`/report?target=${match.profile.user_id}`}
          >
            ⋮
          </Link>
        )}
      </div>
      <QueryState pending={q.isPending} error={q.error} retry={q.refetch} />
      {q.data && (
        <div className="chat-panel">
          {messages.length >= 30 && (
            <Button
              disabled={loadingOlder}
              onClick={async () => {
                setLoadingOlder(true);
                try {
                  const oldest = messages[0];
                  const page = await api<Message[]>(
                    `conversations/${id}/messages?before=${encodeURIComponent(oldest.created_at)}&before_id=${oldest.id}`,
                  );
                  setOlder((x) => [...x, ...page]);
                  if (!page.length)
                    setError(
                      "You have reached the beginning of this conversation.",
                    );
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setLoadingOlder(false);
                }
              }}
            >
              {loadingOlder ? "Loading…" : "Load earlier messages"}
            </Button>
          )}
          {messages.length === 0 && (
            <State title="A thoughtful hello goes a long way">
              <p>
                Ask an open question. Share a little about yourself. Let the
                conversation find its own pace.
              </p>
            </State>
          )}
          <div className="message-list">
            {messages.map((m, index) => (
              <Fragment key={m.id}>
                {(index === 0 ||
                  new Date(messages[index - 1].created_at).toDateString() !==
                    new Date(m.created_at).toDateString()) && (
                  <div className="message-day">
                    <span>
                      {new Date(m.created_at).toDateString() ===
                      new Date().toDateString()
                        ? "Today"
                        : new Date(m.created_at).toLocaleDateString("en", {
                            month: "short",
                            day: "numeric",
                          })}
                    </span>
                  </div>
                )}
                <div
                  className={`message ${m.sender_id === me.data?.user_id ? "own" : ""}`}
                  key={m.id}
                >
                  {m.reply_to && <small>Reply to an earlier message</small>}
                  <p>{m.deleted_at ? "Message removed" : m.body}</p>
                  <time dateTime={m.created_at}>
                    {new Date(m.created_at).toLocaleTimeString("en", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                  {!m.deleted_at && (
                    <details className="message-action-menu">
                      <summary aria-label="Message actions">
                        <MoreHorizontal size={14} />
                      </summary>
                      <div className="message-tools">
                        <button aria-label="Reply" onClick={() => setReply(m)}>
                          <Reply size={14} />
                        </button>
                        <button
                          aria-label="React with heart"
                          onClick={async () => {
                            try {
                              await api(`messages/${m.id}/reactions`, {
                                method: "POST",
                                body: json({ emoji: "❤️" }),
                              });
                            } catch (e) {
                              setError((e as Error).message);
                            }
                          }}
                        >
                          <Heart size={14} />
                        </button>
                        {m.sender_id === me.data?.user_id ? (
                          <button
                            aria-label="Delete your message"
                            onClick={async () => {
                              try {
                                await api(`messages/${m.id}`, {
                                  method: "DELETE",
                                });
                                qc.invalidateQueries({
                                  queryKey: ["messages", id],
                                });
                              } catch (e) {
                                setError((e as Error).message);
                              }
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : (
                          <Link
                            aria-label="Report message"
                            href={`/report?target=${m.sender_id}&message=${m.id}`}
                          >
                            <Flag size={14} />
                          </Link>
                        )}
                      </div>
                    </details>
                  )}
                </div>
              </Fragment>
            ))}
          </div>
          {typing && <p role="status">They’re typing…</p>}
          {reply && (
            <div className="reply-banner">
              Replying to: {reply.body?.slice(0, 80)}{" "}
              <button onClick={() => setReply(null)}>Cancel</button>
            </div>
          )}
          <form
            className="message-composer"
            onSubmit={(e) => {
              e.preventDefault();
              setError("");
              send.mutate();
            }}
          >
            <textarea
              aria-label="Your message"
              value={text}
              maxLength={2000}
              placeholder="Your message"
              onChange={(e) => {
                setText(e.target.value);
                channel.current?.send({
                  type: "broadcast",
                  event: "typing",
                  payload: {},
                });
              }}
            />
            <Button
              disabled={!text.trim() || send.isPending}
              aria-label="Send message"
            >
              <Send size={20} />
            </Button>
          </form>
        </div>
      )}
      {error && (
        <p className="error-inline" role="alert">
          {error}
        </p>
      )}
    </Shell>
  );
}
