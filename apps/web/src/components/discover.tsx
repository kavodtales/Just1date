"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, ShieldCheck, SlidersHorizontal, Heart } from "lucide-react";
import type { Profile } from "@just1date/types";
import { Button, State } from "@just1date/ui";
import { Shell } from "./shell";
import { Filters } from "./filters";
import { Reactions, type Reaction } from "./reactions";
import { QueryState } from "./query-state";
import { api, json } from "../lib/client";
import { MatchCelebration } from "./match-celebration";
export function Discover() {
  const client = useQueryClient();
  const [index, setIndex] = useState(0),
    [cursor, setCursor] = useState<string | null>(null),
    [filters, setFilters] = useState(false);
  const [match, setMatch] = useState<{
      profile: Profile;
      conversation: string;
    } | null>(null),
    [drag, setDrag] = useState(0);
  const query = useQuery({
    queryKey: ["discover", cursor],
    queryFn: () =>
      api<{ items: Profile[]; next_cursor: string | null }>(
        `profiles/discover${cursor ? `?cursor=${cursor}` : ""}`,
      ),
  });
  const p = query.data?.items[index];
  const operation = useRef<{
    target: string;
    action: string;
    id: string;
  } | null>(null);
  const start = useRef<number | null>(null),
    moved = useRef(false);
  const action = useMutation({
    mutationFn: async (kind: Reaction) => {
      if (!p) return;
      if (
        operation.current?.target !== p.user_id ||
        operation.current?.action !== kind
      )
        operation.current = {
          target: p.user_id,
          action: kind,
          id: crypto.randomUUID(),
        };
      const result = await api<{
        matched: boolean;
        conversation_id: string | null;
      }>(kind, {
        method: "POST",
        body: json({
          target_id: p.user_id,
          operation_id: operation.current.id,
        }),
      });
      return { ...result, profile: p };
    },
    onSuccess: (data) => {
      operation.current = null;
      setDrag(0);
      setIndex((i) => i + 1);
      if (data?.matched && data.conversation_id)
        setMatch({ profile: data.profile, conversation: data.conversation_id });
      client.invalidateQueries({ queryKey: ["matches"] });
    },
  });
  const interact = useCallback(
    (kind: Reaction) => {
      if (p && !action.isPending && !filters && !match) action.mutate(kind);
    },
    [p, action, filters, match],
  );
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement).closest(
          "input,textarea,select,button,a,dialog",
        )
      )
        return;
      if (e.key === "ArrowLeft") interact("passes");
      if (e.key === "ArrowRight") interact("likes");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [interact]);
  return (
    <Shell
      title="Discover"
      headerAction={
        <button
          className="square-control"
          aria-label="Open filters"
          onClick={() => setFilters(true)}
        >
          <SlidersHorizontal size={23} />
        </button>
      }
    >
      <div className="discovery-stage">
        <QueryState
          pending={query.isPending}
          error={query.error}
          retry={query.refetch}
        />
        {!query.isPending && !query.error && !p && (
          <State title="New possibilities are on their way">
            <p>
              No more profiles in this set. Adjust your preferences or return
              when more members join.
            </p>
            {query.data?.next_cursor ? (
              <Button
                onClick={() => {
                  setCursor(query.data!.next_cursor);
                  setIndex(0);
                }}
              >
                See more profiles
              </Button>
            ) : (
              <Button onClick={() => setFilters(true)}>
                Adjust preferences
              </Button>
            )}
          </State>
        )}
        {p && (
          <>
            <div className="discovery-deck">
              {query.data?.items
                .slice(index + 1, index + 3)
                .reverse()
                .map((next, layer) => (
                  <div
                    key={next.user_id}
                    className="discovery-underlay"
                    aria-hidden="true"
                    style={{
                      transform: `translateY(${8 + layer * 8}px) scale(${0.94 + layer * 0.03})`,
                    }}
                  >
                    {next.photos?.[0] && <img src={next.photos[0]} alt="" />}
                    <div className="underlay-caption">
                      <strong>
                        {next.display_name}, {next.age}
                      </strong>
                      <p>{next.profession}</p>
                    </div>
                  </div>
                ))}
              <article
                className={`discovery-card ${drag > 30 ? "swipe-like" : ""}`}
                style={{
                  transform: `translateX(${drag}px) rotate(${Math.max(-18, Math.min(18, drag / 10))}deg)`,
                }}
                onPointerDown={(e) => {
                  if (action.isPending) return;
                  start.current = e.clientX;
                  moved.current = false;
                }}
                onPointerMove={(e) => {
                  if (start.current === null) return;
                  const x = e.clientX - start.current;
                  if (Math.abs(x) > 8) {
                    moved.current = true;
                    e.currentTarget.setPointerCapture(e.pointerId);
                    setDrag(x);
                  }
                }}
                onPointerUp={() => {
                  const delta = drag;
                  start.current = null;
                  setDrag(0);
                  if (Math.abs(delta) > 100)
                    interact(delta > 0 ? "likes" : "passes");
                }}
                onPointerCancel={() => {
                  start.current = null;
                  setDrag(0);
                }}
                onClickCapture={(e) => {
                  if (moved.current) {
                    e.preventDefault();
                    moved.current = false;
                  }
                }}
              >
                <Link
                  href={`/profile/${p.user_id}`}
                  className="card-profile-link"
                  aria-label={`View ${p.display_name}'s profile`}
                  draggable={false}
                >
                  <div className="profile-visual">
                    {p.photos?.[0] ? (
                      <img
                        src={p.photos[0]}
                        alt={`${p.display_name}'s approved profile photo`}
                        fetchPriority="high"
                        draggable={false}
                      />
                    ) : (
                      <div className="photo-unavailable">
                        Photo temporarily unavailable
                      </div>
                    )}
                    <div className="photo-shade" />
                    <div className="swipe-feedback" aria-hidden="true">
                      <span>
                        <Heart size={42} fill="currentColor" />
                      </span>
                    </div>
                    <span className="distance-pill">
                      <MapPin size={14} />
                      {(p as Profile & { distance_km?: number }).distance_km
                        ? `Within ${(p as Profile & { distance_km: number }).distance_km} km`
                        : p.city}
                    </span>
                    {p.verified && (
                      <ShieldCheck
                        className="verification-dot"
                        size={27}
                        aria-label="Selfie verified"
                      />
                    )}
                    <div className="photo-caption">
                      <h2>
                        {p.display_name}, {p.age}
                      </h2>
                      <p>{p.profession || p.goal.replaceAll("_", " ")}</p>
                    </div>
                  </div>
                </Link>
              </article>
            </div>
            <Reactions onAction={interact} disabled={action.isPending} />
          </>
        )}
        {action.error && (
          <p className="error-inline" role="alert">
            {action.error.message}
          </p>
        )}
      </div>
      {filters && (
        <Filters
          onClose={() => {
            setFilters(false);
            setIndex(0);
            setCursor(null);
          }}
        />
      )}
      {match && (
        <MatchCelebration
          profile={match.profile}
          conversation={match.conversation}
          onClose={() => setMatch(null)}
        />
      )}
    </Shell>
  );
}
