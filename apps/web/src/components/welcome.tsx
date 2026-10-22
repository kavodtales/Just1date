"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { appImageSlots, type AppImage } from "@just1date/config";
const slides = [
  {
    title: "Algorithm",
    text: "Your intentions and preferences help us find connections worth exploring.",
  },
  {
    title: "Matches",
    text: "We match you with people that have a large array of similar interests.",
  },
  {
    title: "Premium",
    text: "Make room for more possibilities with premium benefits.",
  },
];
export function Welcome() {
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  const media = useQuery({
    queryKey: ["app-media"],
    queryFn: async () => {
      const r = await fetch("/api/app-media", { cache: "no-store" });
      if (!r.ok) throw new Error("Images unavailable");
      return (await r.json()).data as AppImage[];
    },
    staleTime: 60000,
    refetchInterval: 60000,
    retry: 1,
  });
  const image = media.data?.find((p) => p.slot === appImageSlots[index].slot);
  return (
    <main className={`welcome-screen welcome-${index + 1}`}>
      <Link href="/" className="welcome-home">
        Just1Date <span>Meet with intention ↗</span>
      </Link>
      <div className="welcome-image">
        <img
          key={`${index}-${image?.revision ?? 0}`}
          src={image?.url ?? appImageSlots[index].fallback}
          alt={image?.url ? image.alt_text : appImageSlots[index].alt}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = appImageSlots[index].fallback;
          }}
          width={345}
          height={417}
        />
      </div>
      <div className="welcome-copy" aria-live="polite">
        <span className="editorial-kicker">YOUR NEXT GOOD STORY</span>
        <h1>{slide.title}</h1>
        <p>{slide.text}</p>
      </div>
      <small className="welcome-disclosure">
        Original AI-created illustrative photography
      </small>
      <div className="carousel-dots" aria-label="Introduction slides">
        {slides.map((s, i) => (
          <button
            key={s.title}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Show ${s.title}`}
            aria-pressed={index === i}
          >
            <span />
          </button>
        ))}
      </div>
      <div className="welcome-bottom">
        <Link className="button" href="/auth/signup">
          Create an account
        </Link>
        <p>
          Already have an account? <Link href="/auth/login">Sign In</Link>
        </p>
      </div>
    </main>
  );
}
