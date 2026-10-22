export const appImageSlots = [
  {
    slot: "welcome_algorithm",
    title: "Algorithm",
    fallback: "/images/editorial/amara.webp",
    alt: "Original AI-created portrait of a fictional Nigerian adult",
  },
  {
    slot: "welcome_matches",
    title: "Matches",
    fallback: "/images/editorial/tomi.webp",
    alt: "Original AI-created portrait of a fictional Nigerian man",
  },
  {
    slot: "welcome_premium",
    title: "Premium",
    fallback: "/images/editorial/venue.webp",
    alt: "Original AI-created illustrative Lagos-inspired date setting",
  },
  {
    slot: "landing_hero",
    title: "Landing · Rooftop dinner",
    fallback: "/images/editorial/hero.webp",
    alt: "AI-created illustrative rooftop dinner with fictional adults",
  },
  {
    slot: "date_venue",
    title: "Just One Date · Venue",
    fallback: "/images/editorial/venue.webp",
    alt: "AI-created illustrative restaurant courtyard",
  },
] as const;
export type AppImage = {
  slot: string;
  url: string | null;
  alt_text: string;
  revision: number;
  updated_at: string;
};
