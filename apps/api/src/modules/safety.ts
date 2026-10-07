import { Router } from "express";
import { z } from "zod";
import { safetySchema, uuid } from "@just1date/validation";
import { Repository } from "../lib/repository";
import { AppError, ok } from "../lib/http";
export function safetyRoutes(repo: Repository) {
  const r = Router();
  r.get("/sessions", async (req, res) =>
    ok(
      res,
      await repo.read(
        req.actor.id,
        "select * from public.date_safety_sessions order by created_at desc limit 50",
      ),
    ),
  );
  r.post("/sessions", async (req, res) =>
    ok(
      res,
      await repo.call(req.actor.id, "safetyCreate", [
        safetySchema.parse(req.body),
      ]),
      201,
    ),
  );
  r.post("/sessions/:id/:action", async (req, res) =>
    ok(
      res,
      await repo.call(req.actor.id, "safetyAction", [
        uuid.parse(req.params.id),
        z.enum(["check_in", "end", "alert"]).parse(req.params.action),
      ]),
    ),
  );
  r.get("/contacts", async (req, res) =>
    ok(
      res,
      await repo.read(
        req.actor.id,
        "select id,name,phone,consent_confirmed from public.emergency_contacts order by created_at desc limit 20",
      ),
    ),
  );
  r.post("/contacts", async (req, res) => {
    const p = z
      .object({
        name: z.string().min(2).max(100),
        phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
        consent_confirmed: z.literal(true),
      })
      .strict()
      .parse(req.body);
    ok(res, await repo.call(req.actor.id, "contact", [p]), 201);
  });
  r.get("/verification", async (req, res) =>
    ok(
      res,
      await repo.read(
        req.actor.id,
        "select method,verified_at,revoked_at from public.profile_verifications",
      ),
    ),
  );
  r.post("/verification", async () => {
    throw new AppError(
      "VERIFICATION_UNAVAILABLE",
      503,
      "Identity verification is not connected yet. Email confirmation and photo moderation remain available.",
    );
  });
  return r;
}
