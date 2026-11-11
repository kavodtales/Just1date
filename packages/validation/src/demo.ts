import { z } from "zod";
export const demoActionSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("date-propose"),
      profile_id: z.uuid(),
      operation_id: z.uuid(),
      activity: z.enum(["coffee", "dinner", "gallery", "walk"]),
      venue: z.string().trim().min(3).max(160),
      starts_at: z.iso.datetime({ offset: true }),
      note: z.string().trim().max(500).default(""),
    })
    .strict(),
  z
    .object({
      action: z.literal("date-respond"),
      profile_id: z.uuid(),
      plan_id: z.uuid(),
      response: z.enum(["accept", "decline", "cancel"]),
      revision: z.number().int().nonnegative(),
      simulated: z.literal(true),
    })
    .strict(),
  z.object({ action: z.literal("like"), profile_id: z.uuid() }).strict(),
  z.object({ action: z.literal("pass"), profile_id: z.uuid() }).strict(),
  z
    .object({
      action: z.literal("message"),
      profile_id: z.uuid(),
      client_id: z.uuid(),
      body: z.string().trim().min(1).max(1000),
    })
    .strict(),
  z
    .object({
      action: z.literal("filter"),
      gender: z.enum(["everyone", "woman", "man"]),
    })
    .strict(),
  z.object({ action: z.literal("reset") }).strict(),
]);
