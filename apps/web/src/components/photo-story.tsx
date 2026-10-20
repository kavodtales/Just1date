"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Send, Pause, Play, ChevronLeft, ChevronRight } from "lucide-react";
import { api, json } from "../lib/client";
import { QueryState } from "./query-state";

export function PhotoStory({ id }: { id: string }) {
  const qc = useQueryClient();
  const profile = useQuery({
    queryKey: ["profile", id],
    queryFn: () => api(`profiles/${id}`),
  });
  const inbox = useQuery({
    queryKey: ["conversations"],
    queryFn: () => api<any[]>("conversations"),
  });
  const [index, setIndex] = useState(0),
    [playing, setPlaying] = useState(false),
    [text, setText] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [sent, setSent] = useState(false),
    [broken, setBroken] = useState(false);
  const operation = useRef<{ body: string; id: string } | null>(null);
  const photos: string[] = profile.data?.photos ?? [];
  const conversation = inbox.data?.find(
    (row) => row.profile.user_id === id,
  )?.conversation_id;
  const position = Math.min(index, Math.max(0, photos.length - 1));
  function move(delta: number) {
    setIndex(Math.max(0, Math.min(photos.length - 1, position + delta)));
    setBroken(false);
  }
  useEffect(() => {
    if (!playing || text || busy || broken || !photos.length) return;
    const timer = setInterval(() => {
      if (document.hidden) return;
      if (position === photos.length - 1) setPlaying(false);
      else {
        setIndex(position + 1);
        setBroken(false);
      }
    }, 6000);
    return () => clearInterval(timer);
  }, [playing, text, busy, broken, position, photos.length]);
  async function reply(event: React.FormEvent) {
    event.preventDefault();
    const body = text.trim();
    if (!conversation || !body || busy) return;
    if (operation.current?.body !== body)
      operation.current = { body, id: crypto.randomUUID() };
    setBusy(true);
    setError("");
    setSent(false);
    try {
      await api(`conversations/${conversation}/messages`, {
        method: "POST",
        body: json({ body, client_id: operation.current.id, reply_to: null }),
      });
      operation.current = null;
      setText("");
      setSent(true);
      qc.invalidateQueries({ queryKey: ["messages", conversation] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="photo-story" aria-label="Profile photo viewer">
      {photos[position] && !broken && (
        <img
          className="story-photo"
          src={photos[position]}
          alt={`${profile.data.display_name}, photo ${position + 1}`}
          onError={() => {
            setBroken(true);
            setPlaying(false);
          }}
        />
      )}
      <div className="story-shade" />
      <header className="story-header">
        <div
          className="story-progress"
          aria-label={`Photo ${position + 1} of ${photos.length}`}
        >
          {photos.map((_, i) => (
            <button
              key={i}
              aria-label={`Show photo ${i + 1}`}
              aria-pressed={position === i}
              onClick={() => {
                setIndex(i);
                setBroken(false);
              }}
            >
              <span className={i <= position ? "viewed" : ""} />
            </button>
          ))}
        </div>
        <div className="story-author">
          <Link href={`/profile/${id}`} aria-label="Open profile">
            {photos[0] && <img src={photos[0]} alt="" />}
            <span>
              <strong>{profile.data?.display_name ?? "Profile photos"}</strong>
              <small>Profile photos</small>
            </span>
          </Link>
          <button
            aria-label={playing ? "Pause photos" : "Play photos"}
            aria-pressed={playing}
            onClick={() => setPlaying(!playing)}
            disabled={!photos.length}
          >
            {playing ? <Pause size={19} /> : <Play size={19} />}
          </button>
          <Link
            className="story-close"
            href="/messages"
            aria-label="Close photo viewer"
          >
            <X size={22} />
          </Link>
        </div>
      </header>
      <div className="story-navigation">
        <button
          aria-label="Previous photo"
          disabled={position === 0}
          onClick={() => move(-1)}
        >
          <ChevronLeft />
        </button>
        <button
          aria-label="Next photo"
          disabled={position >= photos.length - 1}
          onClick={() => move(1)}
        >
          <ChevronRight />
        </button>
      </div>
      {(profile.isPending ||
        profile.error ||
        broken ||
        (profile.data && !photos.length)) && (
        <div className="story-state">
          <QueryState
            pending={profile.isPending}
            error={profile.error}
            retry={profile.refetch}
          />
          {broken && (
            <>
              <p>This photo could not load.</p>
              <button
                className="button"
                onClick={() => {
                  setBroken(false);
                  profile.refetch();
                }}
              >
                Reload photo
              </button>
            </>
          )}
          {profile.data && !photos.length && <p>No approved photos to show.</p>}
        </div>
      )}
      <footer className="story-footer">
        {error && (
          <p role="alert" className="story-notice">
            {error}
          </p>
        )}
        {sent && (
          <p role="status" className="story-notice">
            Message sent.{" "}
            <Link href={`/messages/${conversation}`}>Open conversation</Link>
          </p>
        )}
        {conversation ? (
          <form onSubmit={reply}>
            <input
              aria-label="Your message"
              placeholder="Your message"
              value={text}
              maxLength={2000}
              onChange={(e) => {
                setText(e.target.value);
                setSent(false);
              }}
              onFocus={() => setPlaying(false)}
              disabled={busy}
            />
            <button
              type="submit"
              aria-label="Send message"
              disabled={busy || !text.trim()}
            >
              <Send size={21} />
            </button>
          </form>
        ) : (
          <p className="story-notice">
            {inbox.isPending
              ? "Checking your connection…"
              : inbox.error
                ? "We couldn't check your connection. Open Messages to try again."
                : "A mutual match opens a private conversation."}
          </p>
        )}
      </footer>
    </main>
  );
}
