import { config as load } from "dotenv";
import { createDatabase } from "@just1date/database";
import { log } from "./lib/http";
import { envSchema } from "./config";
import { Repository } from "./lib/repository";
import { CallService } from "./modules/calls/service";
import { LiveKitProvider } from "./modules/calls/provider";
import { startPollingWorker } from "./lib/polling-worker";
load({ path: "../../.env.local" });
load({ path: ".env.local" });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
const config = envSchema.parse(process.env);
const db = createDatabase(
  process.env.DATABASE_URL,
  process.env.DATABASE_SSL !== "false",
  config.DATABASE_POOL_MAX,
);
const calls = new CallService(
  new Repository(db),
  config.LIVEKIT_URL && config.LIVEKIT_API_KEY && config.LIVEKIT_API_SECRET
    ? new LiveKitProvider(
        config.LIVEKIT_URL!,
        config.LIVEKIT_API_KEY!,
        config.LIVEKIT_API_SECRET!,
      )
    : undefined,
  config.VIDEO_CALLS_ENABLED === "true",
);
// Durable outbox. Push is at-least-once; provider tickets/receipts must be reconciled before launch.
let stopping = false;
async function tick() {
  const rows = await db.transaction(
    null,
    async (tx) =>
      (
        await tx.query<any>(
          `with claimed as (select o.id from public.notification_outbox o where delivered_at is null and attempts<8 and available_at<=now() and (locked_at is null or locked_at<now()-interval '2 minutes') order by available_at for update skip locked limit 50) update public.notification_outbox o set locked_at=now(),attempts=attempts+1 from claimed where o.id=claimed.id returning o.id,o.notification_id,o.attempts`,
        )
      ).rows,
  );
  for (const item of rows) {
    if (stopping) break;
    try {
      const payload = await db.transaction(
        null,
        async (tx) =>
          (
            await tx.query<any>(
              `select n.title,n.kind,n.resource_id,d.token from public.notifications n join public.notification_preferences p on p.user_id=n.user_id join public.device_tokens d on d.user_id=n.user_id join public.users u on u.id=n.user_id where n.id=$1 and p.push_enabled and u.status='ACTIVE' and (n.kind not in('message','call') or p.messages_enabled) and (n.kind<>'like' or p.likes_enabled) and (n.kind<>'call' or exists(select 1 from public.call_sessions c where c.id=n.resource_id and c.status='ringing' and c.expires_at>now() and public.can_chat(c.conversation_id,n.user_id)))`,
              [item.notification_id],
            )
          ).rows,
      );
      if (payload.length) {
        const response = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(process.env.EXPO_ACCESS_TOKEN
              ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` }
              : {}),
          },
          body: JSON.stringify(
            payload.map((p) => ({
              to: p.token,
              title: "JUST1DATE",
              body: p.title,
              data: { kind: p.kind, resource_id: p.resource_id },
            })),
          ),
          signal: AbortSignal.timeout(12000),
        });
        if (!response.ok) throw new Error("PUSH_PROVIDER_FAILED");
        const receipt: any = await response.json();
        if (
          !Array.isArray(receipt.data) ||
          receipt.data.some((x: any) => x.status !== "ok")
        )
          throw new Error("PUSH_REJECTED");
      }
      await db.transaction(null, (tx) =>
        tx.query(
          "update public.notification_outbox set delivered_at=now(),locked_at=null where id=$1",
          [item.id],
        ),
      );
    } catch {
      await db.transaction(null, (tx) =>
        tx.query(
          "update public.notification_outbox set locked_at=null,last_error_code='DELIVERY_FAILED',available_at=now()+make_interval(secs=>$2) where id=$1",
          [item.id, Math.min(3600, 2 ** item.attempts * 10)],
        ),
      );
      log.error(
        { outbox_id: item.id, code: "DELIVERY_FAILED" },
        "notification_retry",
      );
    }
  }
}
const stopCalls = startPollingWorker(
  () => calls.tick(),
  () => {
    log.error({ code: "CALL_WORKER_FAILED" }, "call_worker_tick_failed");
  },
);
const stopOutbox = startPollingWorker(tick, () => {
  log.error({ code: "WORKER_FAILED" }, "outbox_tick_failed");
});
for (const signal of ["SIGTERM", "SIGINT"])
  process.once(signal, async () => {
    if (stopping) return;
    stopping = true;
    try {
      await Promise.all([stopCalls(), stopOutbox()]);
      await db.close?.();
      process.exit(0);
    } catch {
      log.error({ code: "WORKER_SHUTDOWN_FAILED" }, "worker_shutdown_failed");
      process.exit(1);
    }
  });
