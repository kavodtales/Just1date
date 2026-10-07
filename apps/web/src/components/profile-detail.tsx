"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, ShieldCheck, ChevronLeft, Send } from "lucide-react";
import { Button } from "@just1date/ui";
import { Shell } from "./shell";
import { QueryState } from "./query-state";
import { Reactions, type Reaction } from "./reactions";
import { PhotoViewer } from "./photo-viewer";
import { api, json } from "../lib/client";
export function ProfileDetail({ id }: { id?: string }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["profile", id ?? "me"],
    queryFn: () => api(id ? `profiles/${id}` : "profiles/me"),
  });
  const [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [expanded, setExpanded] = useState(false),
    [photo, setPhoto] = useState<number | null>(null);
  const p = q.data;
  async function action(path: Reaction | "blocks") {
    setBusy(true);
    setError("");
    try {
      const result = await api(path, {
        method: "POST",
        body: json({
          target_id: id,
          ...(path === "blocks" ? {} : { operation_id: crypto.randomUUID() }),
        }),
      });
      setMessage(
        path === "blocks"
          ? "This person is blocked and your conversation is closed."
          : result.matched
            ? "It’s a match! Open Matches to start your conversation."
            : path === "passes"
              ? "You passed on this profile."
              : "Your like was recorded.",
      );
      qc.invalidateQueries({ queryKey: ["discover"] });
      qc.invalidateQueries({ queryKey: ["matches"] });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Shell title={id ? "Profile" : "Your profile"} variant="profile">
      <QueryState pending={q.isPending} error={q.error} retry={q.refetch} />
      {p && (
        <article className="full-profile">
          <div className="profile-hero">
            {p.photos?.[0] ? (
              <img
                src={p.photos[0]}
                alt={p.display_name}
                fetchPriority="high"
              />
            ) : (
              <div className="profile-initial">
                {p.display_name?.[0] || "♡"}
              </div>
            )}
            <Link
              className="square-control profile-back"
              href="/discover"
              aria-label="Back to discovery"
            >
              <ChevronLeft />
            </Link>
          </div>
          <div className="profile-detail-body">
            {id && <Reactions onAction={action} disabled={busy} />}
            <div className="profile-detail-heading">
              <h2>
                {p.display_name || "Your profile"}
                {p.age ? `, ${p.age}` : ""}
              </h2>
              {id && (
                <Link
                  className="square-control"
                  aria-label="View your compatibility"
                  href={`/matchmaker?target=${id}`}
                >
                  <Send size={23} />
                </Link>
              )}
              {p.verified && (
                <ShieldCheck aria-label="Selfie verified" color="#df3594" />
              )}
            </div>
            <p className="profile-profession">
              {p.profession || "Profession not shared"}
            </p>
            <section className="profile-section profile-location">
              <div>
                <h3>Location</h3>
                <p>{p.city}</p>
              </div>
              {p.distance_km && (
                <span className="profile-distance">
                  <MapPin size={13} />
                  Within {p.distance_km} km
                </span>
              )}
            </section>
            <section className="profile-section">
              <h3>About</h3>
              <p>
                {expanded || p.bio?.length < 180
                  ? p.bio
                  : `${p.bio?.slice(0, 180)}…`}
              </p>
              {p.bio?.length >= 180 && (
                <button
                  className="pink-link"
                  onClick={() => setExpanded((v) => !v)}
                >
                  {expanded ? "Read less" : "Read more"}
                </button>
              )}
            </section>
            <section className="profile-section">
              <h3>Interests</h3>
              <div className="chips">
                {p.interests?.map((i: string) => (
                  <span key={i}>{i.replaceAll("_", " ")}</span>
                ))}
              </div>
            </section>
            {p.photos?.length > 0 && (
              <section className="profile-section">
                <div className="gallery-title">
                  <h3>Gallery</h3>
                  <button className="pink-link" onClick={() => setPhoto(0)}>
                    See all
                  </button>
                </div>
                <div className="profile-gallery">
                  {p.photos.map((src: string, i: number) => (
                    <button
                      key={src}
                      onClick={() => setPhoto(i)}
                      aria-label={`Open photo ${i + 1}`}
                    >
                      <img
                        src={src}
                        alt={`${p.display_name}, photo ${i + 1}`}
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              </section>
            )}
            <section className="profile-section">
              <h3>Looking for</h3>
              <p>{p.goal?.replaceAll("_", " ")}</p>
              {p.education && <p>Education: {p.education}</p>}
              {p.values?.length > 0 && <p>Values: {p.values.join(" · ")}</p>}
            </section>
            {p.prompts?.map((prompt: any, i: number) => (
              <section className="profile-section" key={i}>
                <h3>{prompt.question}</h3>
                <p>{prompt.answer}</p>
              </section>
            ))}
            {Object.entries(p.lifestyle ?? {}).filter(([, v]) => v).length >
              0 && (
              <section className="profile-section">
                <h3>Lifestyle</h3>
                {Object.entries(p.lifestyle)
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <p key={k}>
                      {k}: {String(v)}
                    </p>
                  ))}
              </section>
            )}
            {id ? (
              <div className="profile-controls">
                <Link className="text-link" href={`/report?target=${id}`}>
                  Report a concern
                </Link>
                <Button disabled={busy} onClick={() => action("blocks")}>
                  Block this person
                </Button>
              </div>
            ) : (
              <>
                <p>
                  Profile status: {p.status} · {p.completion}% complete
                </p>
                <Link className="button" href="/onboarding">
                  Edit my profile
                </Link>
                <Link className="text-link" href="/settings">
                  Settings & privacy
                </Link>
              </>
            )}
            {message && (
              <p className="success-inline" role="status">
                {message}
              </p>
            )}
            {error && (
              <p className="error-inline" role="alert">
                {error}
              </p>
            )}
          </div>
        </article>
      )}
      {photo !== null && p && (
        <PhotoViewer
          photos={p.photos}
          name={p.display_name}
          initial={photo}
          onClose={() => setPhoto(null)}
        />
      )}
    </Shell>
  );
}
