import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { compatibility, riskSignals } from "@just1date/utils";
import {
  isAdult,
  profileSchema,
  preferencesSchema,
  messageSchema,
  registerSchema,
} from "@just1date/validation";
import { can } from "@just1date/config";
import type { Profile } from "@just1date/types";
import { validPaystackSignature } from "../../apps/api/src/modules/payments/provider";
const p: Profile = {
  user_id: "x",
  display_name: "Test",
  age: 30,
  city: "Lagos",
  bio: "Test profile content",
  profession: "Engineer",
  education: "University",
  gender: "woman",
  goal: "serious",
  values: ["kindness", "honesty"],
  lifestyle: { smoking: "no" },
  interests: ["travel", "art"],
  communication: "thoughtful",
  personality: ["curious"],
  photo_keys: [],
  verified: false,
};
describe("domain security and validation", () => {
  it("checks the exact birthday and does not accept future dates", () => {
    const now = new Date("2026-10-06T12:00:00Z");
    expect(isAdult("2008-10-06", 18, now)).toBe(true);
    expect(isAdult("2008-10-07", 18, now)).toBe(false);
    expect(isAdult("2027-01-01", 18, now)).toBe(false);
    expect(isAdult("invalid", 18, now)).toBe(false);
  });
  it("requires strong signup and rejects privilege fields", () => {
    expect(
      registerSchema.safeParse({
        email: "x@example.test",
        password: "short",
        date_of_birth: "1995-01-01",
      }).success,
    ).toBe(false);
    expect(
      registerSchema.safeParse({
        email: "x@example.test",
        password: "a-long-password",
        date_of_birth: "1995-01-01",
        role: "SUPER_ADMIN",
      }).success,
    ).toBe(false);
  });
  it("rejects malformed preference ranges, sender impersonation and blank messages", () => {
    expect(
      preferencesSchema.safeParse({
        age_min: 40,
        age_max: 20,
        genders: ["woman"],
        goals: [],
        distance_km: 20,
        deal_breakers: {},
      }).success,
    ).toBe(false);
    expect(
      messageSchema.safeParse({ body: "   ", client_id: crypto.randomUUID() })
        .success,
    ).toBe(false);
    expect(
      messageSchema.safeParse({
        body: "Hello",
        client_id: crypto.randomUUID(),
        sender_id: crypto.randomUUID(),
      }).success,
    ).toBe(false);
  });
  it("accepts omitted lifestyle fields without silently inventing preferences", () => {
    const {
      user_id: _id,
      age: _age,
      photo_keys: _photos,
      verified: _verified,
      ...fields
    } = p;
    expect(
      profileSchema.safeParse({
        ...fields,
        interests: ["travel", "art", "music"],
        prompts: [],
        lifestyle: {},
      }).success,
    ).toBe(true);
  });
  it("normalizes missing factors and makes uncertainty explicit", () => {
    const score = compatibility(p, p);
    expect(score.overall_score).toBe(100);
    expect(score.coverage).toBeLessThan(100);
    expect(score.factor_scores.distance).toBeUndefined();
    expect(score.explanation).toContain("not a prediction");
  });
  it("respects configured weights and rejects corrupt weights", () => {
    expect(
      compatibility(p, { ...p, goal: "dating" }, { goals: 100 }).overall_score,
    ).toBe(0);
    expect(() => compatibility(p, p, { goals: -1 })).toThrow();
  });
  it("does not fabricate a score for empty profiles", () => {
    const empty = {
      ...p,
      goal: "",
      values: [],
      lifestyle: {},
      interests: [],
      communication: "",
      personality: [],
    };
    expect(compatibility(empty, empty).overall_score).toBeNull();
  });
  it("gives no sensitive attribute a matching score", () => {
    expect(
      compatibility(p, { ...p, gender: "man", education: "different" })
        .overall_score,
    ).toBe(100);
  });
  it("flags financial pressure for review without deciding a ban", () => {
    expect(
      riskSignals("Urgent! Send money at https://example.test").risk_score,
    ).toBe(75);
    expect(riskSignals("Tell me about your favourite book.").risk_score).toBe(
      0,
    );
  });
  it("restricts staff permissions", () => {
    expect(can("FINANCE", "moderation")).toBe(false);
    expect(can("MODERATOR", "finance")).toBe(false);
    expect(can("MODERATOR", "verification")).toBe(true);
  });
  it("validates raw HMAC and rejects payload/signature tampering", () => {
    const b = Buffer.from('{"event":"charge.success"}'),
      secret = "test-secret";
    const signature = createHmac("sha512", secret).update(b).digest("hex");
    expect(validPaystackSignature(b, signature, secret)).toBe(true);
    expect(validPaystackSignature(Buffer.from("{}"), signature, secret)).toBe(
      false,
    );
    expect(validPaystackSignature(b, "bad", secret)).toBe(false);
  });
});
