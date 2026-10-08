import { Router } from "express";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { moderationSchema, uuid } from "@just1date/validation";
import { Repository } from "../lib/repository";
import { AppError, ok } from "../lib/http";
import { DemoService } from "./demo";
export function adminRoutes(
  repo: Repository,
  storage: SupabaseClient,
  production: boolean,
  demo?: DemoService,
) {
  const r = Router();
  r.use((req, _res, next) => {
    if (production && req.actor.aal !== "aal2")
      return next(
        new AppError(
          "MFA_REQUIRED",
          403,
          "Staff must sign in with multi-factor authentication.",
        ),
      );
    next();
  });
  r.get("/demo", async (req, res) => ok(res, await demo!.admin(req.actor.id)));
  r.post("/demo", async (req, res) => {
    const { action } = z
      .object({ action: z.enum(["remove", "restore"]) })
      .strict()
      .parse(req.body);
    ok(res, await demo!.admin(req.actor.id, action));
  });
  r.get("/me", async (req, res) => {
    const result = await repo.call(req.actor.id, "adminIdentity");
    if (!result)
      throw new AppError(
        "ADMIN_FORBIDDEN",
        403,
        "You do not have staff access.",
      );
    ok(res, result);
  });
  r.get("/metrics", async (req, res) =>
    ok(res, await repo.call(req.actor.id, "adminMetrics")),
  );
  r.get("/moderation", async (req, res) =>
    ok(res, await repo.call(req.actor.id, "adminQueue")),
  );
  r.post("/moderation", async (req, res) =>
    ok(
      res,
      await repo.call(req.actor.id, "adminModerate", [
        moderationSchema.parse(req.body),
      ]),
    ),
  );
  r.get("/photos", async (req, res) => {
    const rows = await repo.call<any[]>(req.actor.id, "adminPhotos");
    const output = await Promise.all(
      rows.map(async (p) => {
        const { data, error } = await storage.storage
          .from("profile-photos")
          .createSignedUrl(p.storage_key, 60);
        if (error)
          throw new AppError(
            "PHOTO_LOAD_FAILED",
            503,
            "Review photos are temporarily unavailable.",
          );
        const { storage_key: _key, ...rest } = p;
        return { ...rest, url: data.signedUrl };
      }),
    );
    ok(res, output);
  });
  r.post("/photos/:id/review", async (req, res) => {
    const p = z
      .object({ approved: z.boolean(), reason: z.string().min(10).max(1000) })
      .strict()
      .parse(req.body);
    ok(
      res,
      await repo.call(req.actor.id, "photoReview", [
        uuid.parse(req.params.id),
        p.approved,
        p.reason,
      ]),
    );
  });
  return r;
}
