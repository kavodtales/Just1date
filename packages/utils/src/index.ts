import { defaultWeights } from "@just1date/config";
import type { Profile, Compatibility } from "@just1date/types";
function overlap(a: string[], b: string[]): number | null {
  if (!a.length || !b.length) return null;
  const x = new Set(a),
    y = new Set(b);
  return [...x].filter((v) => y.has(v)).length / new Set([...x, ...y]).size;
}
export function compatibility(
  a: Profile,
  b: Profile,
  weights: Record<string, number> = defaultWeights,
  distanceKm?: number,
  maxDistance = 100,
): Compatibility {
  const common = Object.keys(a.lifestyle).filter((k) => b.lifestyle[k]);
  const raw: Record<string, number | null> = {
    goals: a.goal && b.goal ? (a.goal === b.goal ? 1 : 0) : null,
    values: overlap(a.values, b.values),
    lifestyle: common.length
      ? common.filter((k) => a.lifestyle[k] === b.lifestyle[k]).length /
        common.length
      : null,
    interests: overlap(a.interests, b.interests),
    communication:
      a.communication && b.communication
        ? a.communication === b.communication
          ? 1
          : 0.3
        : null,
    personality: overlap(a.personality, b.personality),
    distance:
      distanceKm === undefined
        ? null
        : Math.max(0, 1 - distanceKm / maxDistance),
  };
  const factors: Record<string, number> = {};
  let weighted = 0,
    used = 0,
    total = 0;
  for (const [key, weight] of Object.entries(weights)) {
    if (!Number.isFinite(weight) || weight < 0)
      throw new Error("Invalid matching weight");
    total += weight;
    const score = raw[key];
    if (score !== null && score !== undefined && weight > 0) {
      factors[key] = Math.round(score * 100);
      weighted += score * weight;
      used += weight;
    }
  }
  return {
    overall_score: used ? Math.round((weighted / used) * 100) : null,
    factor_scores: factors,
    positive_matches: Object.keys(factors).filter((k) => factors[k] >= 70),
    potential_differences: Object.keys(factors).filter((k) => factors[k] < 40),
    coverage: total ? Math.round((used / total) * 100) : 0,
    explanation:
      "Based on your preferences and profile information. This is a suggestion, not a prediction of relationship success.",
  };
}
export function riskSignals(body: string): {
  risk_score: number;
  signals: string[];
} {
  const signals: string[] = [];
  if (
    /\b(send money|wire transfer|crypto investment|gift card|bank details)\b/i.test(
      body,
    )
  )
    signals.push("financial_request");
  if (/https?:\/\//i.test(body)) signals.push("external_link");
  if (/\b(urgent|secret|guaranteed profit)\b/i.test(body))
    signals.push("pressure");
  return { risk_score: Math.min(100, signals.length * 25), signals };
}
export function completion(
  fields: Record<string, unknown>,
  hasPhoto: boolean,
): number {
  const keys = [
    "display_name",
    "gender",
    "city",
    "bio",
    "goal",
    "interests",
    "profession",
  ];
  const count = keys.filter((k) =>
    Array.isArray(fields[k])
      ? (fields[k] as unknown[]).length >= 3
      : Boolean(fields[k]),
  ).length;
  return Math.round(((count + Number(hasPhoto)) / (keys.length + 1)) * 100);
}
