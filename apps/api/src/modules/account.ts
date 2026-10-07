import { Router } from "express";
import { z } from "zod";
import { uuid } from "@just1date/validation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Repository } from "../lib/repository";
import { AppError, ok } from "../lib/http";
import type { Config } from "../config";
export const passwordSchema = z
  .object({
    password: z.string().min(12).max(128),
    nonce: z.string().max(200).optional(),
  })
  .strict();
export async function updateMemberPassword(
  config: Config,
  bearer: string,
  payload: z.infer<typeof passwordSchema>,
) {
  const response = await fetch(`${config.SUPABASE_URL}/auth/v1/user`, {
    method: "PUT",
    headers: {
      apikey: config.SUPABASE_ANON_KEY,
      Authorization: bearer,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok)
    throw new AppError(
      "PASSWORD_UPDATE_FAILED",
      400,
      "Your password could not be changed. Complete account recovery or reauthentication and try again.",
    );
}
export function accountRoutes(
  repo: Repository,
  auth: SupabaseClient,
  config: Config,
) {
  const r = Router();
  r.patch("/privacy", async (req, res) => {
    const p = z
      .object({
        visible: z.boolean().optional(),
        paused: z.boolean().optional(),
        show_online: z.boolean().optional(),
      })
      .strict()
      .parse(req.body);
    ok(res, await repo.call(req.actor.id, "privacy", [p]));
  });
  r.post("/account/deletion", async (req, res) => {
    z.object({ confirmation: z.literal("DELETE") })
      .strict()
      .parse(req.body);
    const result = await repo.call(req.actor.id, "deletion");
    await auth.auth.admin.signOut(
      req.headers.authorization!.slice(7),
      "global",
    );
    ok(res, result, 202);
  });
  r.get("/account/export", async (req, res) => {
    const me = await repo.call(req.actor.id, "me");
    const [messages, reports, payments, contacts, preferences] =
      await Promise.all([
        repo.read(
          req.actor.id,
          "select id,conversation_id,body,created_at from public.messages where sender_id=$1 order by created_at desc limit 1000",
          [req.actor.id],
        ),
        repo.read(
          req.actor.id,
          "select id,category,details,created_at from public.reports limit 1000",
        ),
        repo.read(
          req.actor.id,
          "select id,reference,amount_minor,currency,status,created_at from public.payments limit 1000",
        ),
        repo.read(req.actor.id, "select * from public.emergency_contacts"),
        repo.read(
          req.actor.id,
          "select * from public.notification_preferences",
        ),
      ]);
    ok(res, {
      profile: me,
      messages,
      reports,
      payments,
      contacts,
      notification_preferences: preferences,
      export_scope:
        "Bounded self-service export. Large or inaccessible historical records require an operator export job.",
      generated_at: new Date().toISOString(),
    });
  });
  r.post("/auth/logout", async (req, res) => {
    const { error } = await auth.auth.admin.signOut(
      req.headers.authorization!.slice(7),
      "global",
    );
    if (error)
      throw new AppError(
        "LOGOUT_FAILED",
        503,
        "Sign-out could not finish. Try again.",
      );
    ok(res, { signed_out: true });
  });
  r.post("/auth/password", async (req, res) => {
    const payload = passwordSchema.parse(req.body);
    await updateMemberPassword(config, req.headers.authorization!, payload);
    ok(res, { updated: true });
  });
  r.get("/notifications", async (req, res) =>
    ok(
      res,
      await repo.read(
        req.actor.id,
        "select id,kind,title,resource_id,read_at,created_at from public.notifications order by created_at desc limit 50",
      ),
    ),
  );
  r.post("/notifications/:id/read", async (req, res) =>
    ok(
      res,
      await repo.call(req.actor.id, "notificationRead", [
        uuid.parse(req.params.id),
      ]),
    ),
  );
  r.patch("/notifications/preferences", async (req, res) => {
    const p = z
      .object({
        push_enabled: z.boolean().optional(),
        email_enabled: z.boolean().optional(),
        likes_enabled: z.boolean().optional(),
        messages_enabled: z.boolean().optional(),
      })
      .strict()
      .parse(req.body);
    ok(res, await repo.call(req.actor.id, "notificationPreferences", [p]));
  });
  r.post("/notifications/devices", async (req, res) => {
    const p = z
      .object({
        token: z.string().max(200),
        platform: z.enum(["ios", "android"]),
      })
      .strict()
      .parse(req.body);
    ok(
      res,
      await repo.call(req.actor.id, "deviceToken", [p.token, p.platform]),
    );
  });
  return r;
}
