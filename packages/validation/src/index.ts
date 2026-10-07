import { z } from "zod";
export const uuid = z.uuid();
export const dateOfBirth = z.iso
  .date()
  .refine(
    (v) => v < new Date().toISOString().slice(0, 10),
    "Enter a date in the past.",
  );
export function isAdult(dob: string, minimum = 18, now = new Date()): boolean {
  const d = new Date(`${dob}T00:00:00Z`);
  if (!Number.isFinite(d.getTime())) return false;
  let age = now.getUTCFullYear() - d.getUTCFullYear();
  if (
    now.getUTCMonth() < d.getUTCMonth() ||
    (now.getUTCMonth() === d.getUTCMonth() && now.getUTCDate() < d.getUTCDate())
  )
    age--;
  return age >= minimum && age <= 120;
}
export const registerSchema = z
  .object({
    email: z.email().max(254),
    password: z.string().min(12).max(128),
    date_of_birth: dateOfBirth,
  })
  .strict();
export const loginSchema = z
  .object({ email: z.email(), password: z.string().min(1).max(128) })
  .strict();
export const gender = z.enum(["woman", "man", "nonbinary", "self_described"]);
export const profileSchema = z
  .object({
    display_name: z.string().trim().min(2).max(50),
    gender,
    city: z.string().trim().min(2).max(100),
    bio: z.string().trim().min(20).max(1000),
    profession: z.string().trim().max(100),
    education: z.string().trim().max(100),
    goal: z.enum([
      "serious",
      "marriage",
      "long_term",
      "dating",
      "friendship",
      "exploring",
    ]),
    interests: z.array(z.string().min(1).max(50)).min(3).max(20),
    values: z.array(z.string().min(1).max(40)).max(10),
    lifestyle: z.partialRecord(
      z.enum(["smoking", "drinking", "exercise", "children", "pets", "social"]),
      z.string().max(40),
    ),
    communication: z.string().max(50),
    personality: z.array(z.string().max(40)).max(10),
    prompts: z
      .array(
        z.object({
          question: z.string().min(5).max(150),
          answer: z.string().min(5).max(500),
        }),
      )
      .max(3),
  })
  .strict();
export const preferencesSchema = z
  .object({
    age_min: z.number().int().min(18).max(100),
    age_max: z.number().int().min(18).max(100),
    genders: z.array(gender).min(1).max(4),
    goals: z.array(z.string().max(30)).max(6),
    distance_km: z.number().int().min(1).max(500),
    deal_breakers: z.record(z.string().max(30), z.string().max(40)),
  })
  .strict()
  .refine(
    (v) => v.age_min <= v.age_max,
    "Minimum age must be below maximum age.",
  );
export const interactionSchema = z
  .object({ target_id: uuid, operation_id: uuid })
  .strict();
export const messageSchema = z
  .object({
    body: z.string().trim().min(1).max(2000),
    client_id: uuid,
    reply_to: uuid.nullable().optional(),
  })
  .strict();
export const reportSchema = z
  .object({
    target_id: uuid,
    category: z.enum([
      "fake_profile",
      "scam",
      "harassment",
      "threats",
      "hate",
      "sexual_misconduct",
      "underage",
      "spam",
      "other",
    ]),
    details: z.string().trim().min(10).max(2000),
    message_id: uuid.optional(),
  })
  .strict();
export const safetySchema = z
  .object({
    person_name: z.string().trim().min(2).max(100),
    venue: z.string().trim().min(2).max(200),
    starts_at: z.iso.datetime({ offset: true }),
    ends_at: z.iso.datetime({ offset: true }),
    trusted_contact_id: uuid.nullable().optional(),
    location_consent: z.boolean(),
  })
  .strict()
  .refine(
    (v) =>
      new Date(v.ends_at) > new Date(v.starts_at) &&
      new Date(v.ends_at).getTime() - new Date(v.starts_at).getTime() <=
        86400000,
    "Choose an end within 24 hours after the start.",
  );
export const paymentSchema = z.object({ plan_id: uuid }).strict();
export const moderationSchema = z
  .object({
    user_id: uuid,
    action: z.enum(["warn", "suspend", "ban", "restore"]),
    reason: z.string().trim().min(10).max(1000),
    report_id: uuid.optional(),
  })
  .strict();
