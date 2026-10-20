export const appImageSlots = [
  {
    slot: "welcome_algorithm",
    title: "Algorithm",
    fallback: "/images/welcome-1.jpg",
    alt: "A smiling woman wearing glasses",
  },
  {
    slot: "welcome_matches",
    title: "Matches",
    fallback: "/images/welcome-2.jpg",
    alt: "A woman enjoying a break after exercise",
  },
  {
    slot: "welcome_premium",
    title: "Premium",
    fallback: "/images/welcome-3.jpg",
    alt: "A woman outdoors in the sunshine",
  },
] as const;
export type AppImage = {
  slot: string;
  url: string | null;
  alt_text: string;
  revision: number;
  updated_at: string;
};
