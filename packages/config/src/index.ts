export const brand = {
  name: "JUST1DATE",
  tagline: "Meet someone worth choosing.",
  colors: {
    obsidian: "#17191b",
    gold: "#df3594",
    rose: "#fbeaf5",
    indigo: "#8f208e",
    paper: "#ffffff",
  },
};
export { legalDocuments } from "./legal";
export const defaultWeights = {
  goals: 25,
  values: 15,
  lifestyle: 15,
  interests: 10,
  communication: 10,
  personality: 10,
  preferences: 10,
  distance: 5,
};
export const onboardingSteps = [
  "Welcome",
  "Name",
  "Date of birth",
  "Gender",
  "Interested in",
  "Intention",
  "Location",
  "Interests",
  "Lifestyle",
  "Career and education",
  "Prompts",
  "Photos",
  "Preferences",
  "Verification",
  "Completion",
] as const;
export const permissions = {
  SUPER_ADMIN: [
    "users",
    "moderation",
    "verification",
    "finance",
    "analytics",
    "settings",
    "audit",
    "admins",
  ],
  ADMIN: [
    "users",
    "moderation",
    "verification",
    "analytics",
    "settings",
    "audit",
  ],
  MODERATOR: ["moderation", "verification"],
  SUPPORT: ["users"],
  FINANCE: ["finance"],
  ANALYST: ["analytics"],
} as const;
export type AdminRole = keyof typeof permissions;
export function can(role: AdminRole, permission: string): boolean {
  return (permissions[role] as readonly string[]).includes(permission);
}
export const en = {
  offline: "You're offline. We'll reconnect automatically.",
  emptyDiscovery:
    "You’ve reached today’s possibilities. Adjust your preferences or check back soon.",
  compatibility: "Based on your preferences and profile information.",
};
