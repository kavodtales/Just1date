import { Router } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  interactionSchema,
  messageSchema,
  reportSchema,
  uuid,
} from "@just1date/validation";
import { riskSignals } from "@just1date/utils";
import { Repository } from "../lib/repository";
import { ok } from "../lib/http";
import { signProfilePhotos } from "../lib/photos";
export function socialRoutes(repo: Repository, storage: SupabaseClient) {
  const r = Router();
  for (const [path, action] of [
    ["likes", "like"],
    ["passes", "pass"],
    ["super-likes", "super_like"],
  ] as const)
    r.post(`/${path}`, async (req, res) => {
      const p = interactionSchema.parse(req.body);
      ok(
        res,
        await repo.call(req.actor.id, "interact", [
          p.target_id,
          p.operation_id,
          action,
        ]),
      );
    });
  r.get("/likes", async (req, res) => {
    const rows = await repo.call<any[]>(req.actor.id, "incoming");
    ok(res, await Promise.all(rows.map((p) => signProfilePhotos(storage, p))));
  });
  for (const [path, key] of [
    ["/matches", "matches"],
    ["/conversations", "inbox"],
  ] as const) {
    r.get(path, async (req, res) => {
      const before = req.query.before
        ? z.iso.datetime({ offset: true }).parse(req.query.before)
        : null;
      const beforeId = req.query.before_id
        ? uuid.parse(req.query.before_id)
        : null;
      if (Boolean(before) !== Boolean(beforeId))
        throw new Error("INVALID_CURSOR");
      const rows = await repo.call<any[]>(req.actor.id, key, [
        before,
        beforeId,
      ]);
      ok(
        res,
        await Promise.all(
          rows.map(async (row) => ({
            ...row,
            profile: await signProfilePhotos(storage, row.profile),
          })),
        ),
      );
    });
  }
  r.delete("/matches/:id", async (req, res) =>
    ok(
      res,
      await repo.call(req.actor.id, "unmatch", [uuid.parse(req.params.id)]),
    ),
  );
  r.get("/conversations/:id/messages", async (req, res) => {
    const cid = uuid.parse(req.params.id);
    const before = req.query.before
      ? z.iso.datetime({ offset: true }).parse(req.query.before)
      : null;
    const beforeId = req.query.before_id
      ? uuid.parse(req.query.before_id)
      : null;
    if (Boolean(before) !== Boolean(beforeId))
      throw new Error("INVALID_CURSOR");
    ok(res, await repo.call(req.actor.id, "messages", [cid, before, beforeId]));
  });
  r.post("/conversations/:id/messages", async (req, res) => {
    const p = messageSchema.parse(req.body),
      risk = riskSignals(p.body);
    ok(
      res,
      await repo.call(req.actor.id, "send", [
        uuid.parse(req.params.id),
        p,
        risk.risk_score,
        risk.signals,
      ]),
      201,
    );
  });
  r.post("/conversations/:id/read", async (req, res) =>
    ok(res, await repo.call(req.actor.id, "read", [uuid.parse(req.params.id)])),
  );
  r.delete("/messages/:id", async (req, res) =>
    ok(
      res,
      await repo.call(req.actor.id, "messageAction", [
        uuid.parse(req.params.id),
        "delete",
        null,
      ]),
    ),
  );
  r.post("/messages/:id/reactions", async (req, res) => {
    const { emoji } = z
      .object({ emoji: z.enum(["❤️", "👍", "😊", "😂", "🎉"]) })
      .strict()
      .parse(req.body);
    ok(
      res,
      await repo.call(req.actor.id, "messageAction", [
        uuid.parse(req.params.id),
        "react",
        emoji,
      ]),
    );
  });
  r.post("/reports", async (req, res) =>
    ok(
      res,
      await repo.call(req.actor.id, "report", [reportSchema.parse(req.body)]),
      201,
    ),
  );
  r.post("/blocks", async (req, res) => {
    const { target_id } = z
      .object({ target_id: uuid })
      .strict()
      .parse(req.body);
    ok(res, await repo.call(req.actor.id, "block", [target_id]));
  });
  r.get("/blocks", async (req, res) =>
    ok(
      res,
      await repo.read(
        req.actor.id,
        "select id,target_id,created_at from public.blocks order by created_at desc limit 100",
      ),
    ),
  );
  return r;
}
