import { Router } from "express";
import { z } from "zod";
import type { Repository } from "../lib/repository";
import { ok } from "../lib/http";
export const dateProposalSchema = z
  .object({
    match_id: z.uuid(),
    operation_id: z.uuid(),
    activity: z.enum(["coffee", "dinner", "gallery", "walk"]),
    venue: z.string().trim().min(3).max(160),
    starts_at: z.iso.datetime({ offset: true }),
    note: z.string().trim().max(500).default(""),
  })
  .strict();
export function dateRoutes(repo: Repository) {
  const r = Router();
  r.get("/", async (req, res) =>
    ok(res, await repo.call(req.actor.id, "datePlans")),
  );
  r.post("/", async (req, res) =>
    ok(
      res,
      await repo.call(req.actor.id, "datePropose", [
        dateProposalSchema.parse(req.body),
      ]),
      201,
    ),
  );
  r.post("/:id/actions", async (req, res) => {
    const p = z
      .object({
        action: z.enum(["accept", "decline", "cancel"]),
        revision: z.number().int().nonnegative(),
      })
      .strict()
      .parse(req.body);
    ok(
      res,
      await repo.call(req.actor.id, "dateAction", [
        z.uuid().parse(req.params.id),
        p.action,
        p.revision,
      ]),
    );
  });
  return r;
}
