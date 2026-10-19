import { Router, text } from "express";
import { uuid, startCallSchema, callActionSchema } from "@just1date/validation";
import { AppError, ok } from "../../lib/http";
import type { Repository } from "../../lib/repository";
import type { CallService } from "./service";
export function callRoutes(repo: Repository, service: CallService) {
  const r = Router();
  r.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  r.get("/calls/config", async (_req, res) =>
    ok(res, { enabled: await service.available() }),
  );
  r.get("/calls/incoming", async (req, res) =>
    ok(
      res,
      service.provider ? await repo.call(req.actor.id, "callIncoming") : [],
    ),
  );
  r.post("/conversations/:id/calls", async (req, res) => {
    const p = startCallSchema.parse(req.body),
      id = uuid.parse(req.params.id);
    await service.requireAvailable();
    ok(
      res,
      await repo.call(req.actor.id, "callStart", [id, p.operation_id]),
      201,
    );
  });
  r.get("/calls/:id", async (req, res) =>
    ok(
      res,
      await repo.call(req.actor.id, "callGet", [uuid.parse(req.params.id)]),
    ),
  );
  r.post("/calls/:id/actions", async (req, res) => {
    const p = callActionSchema.parse(req.body);
    const call = await repo.call(req.actor.id, "callAction", [
      uuid.parse(req.params.id),
      p.action,
    ]);
    if (p.action !== "accept") await service.cleanup();
    ok(res, call);
  });
  r.post("/calls/:id/token", async (req, res) =>
    ok(res, await service.token(req.actor.id, uuid.parse(req.params.id))),
  );
  return r;
}
export function callWebhookRoutes(repo: Repository, service: CallService) {
  const r = Router();
  r.post(
    "/calls/webhook",
    text({
      type: ["application/webhook+json", "application/json"],
      limit: "64kb",
    }),
    async (req, res) => {
      if (!service.provider)
        throw new AppError(
          "FEATURE_UNAVAILABLE",
          503,
          "Media service is not configured.",
        );
      let event;
      try {
        event = await service.provider.webhook(
          req.body,
          req.get("Authorization"),
        );
      } catch {
        throw new AppError(
          "INVALID_WEBHOOK",
          401,
          "Webhook authentication failed.",
        );
      }
      if (event.event === "room_finished" && event.room?.name) {
        await repo.db.transaction(null, (tx) =>
          tx.query(
            "update public.call_sessions set status='ended',ended_at=now() where room_name=$1 and status='accepted'",
            [event.room!.name],
          ),
        );
        await service.cleanup();
      }
      res.sendStatus(204);
    },
  );
  return r;
}
