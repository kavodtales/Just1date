"use client";
import Link from "next/link";
import { useState } from "react";
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
  return (
    <main className={`welcome-screen welcome-${index + 1}`}>
      <div className="welcome-image">
        <img
          src={`/images/welcome-${index + 1}.jpg`}
          alt={
            [
              "A smiling woman wearing glasses",
              "A woman enjoying a break after exercise",
              "A woman outdoors in the sunshine",
            ][index]
          }
          width={345}
          height={417}
        />
      </div>
      <div className="welcome-copy" aria-live="polite">
        <h1>{slide.title}</h1>
        <p>{slide.text}</p>
      </div>
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
