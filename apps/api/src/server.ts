import { config as load } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { createClient as createRedis } from "redis";
import { RedisStore } from "rate-limit-redis";
import { createDatabase } from "@just1date/database";
import { envSchema } from "./config";
import { createApp } from "./app";
import { log } from "./lib/http";
import { PaystackProvider } from "./modules/payments/provider";
load({ path: "../../.env.local" });
load({ path: ".env.local" });
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error(
    "Missing or invalid API configuration:",
    parsed.error.issues.map((x) => x.path.join(".")).join(", "),
  );
  process.exit(1);
}
const config = parsed.data;
if (config.NODE_ENV === "production" && !config.REDIS_URL)
  throw new Error(
    "Production requires REDIS_URL for distributed rate limiting.",
  );
const db = createDatabase(config.DATABASE_URL, config.DATABASE_SSL !== "false");
const minimum = await db.transaction(
  null,
  async (tx) =>
    (
      await tx.query<{ value: number }>(
        "select value from public.app_settings where key='minimum_age'",
      )
    ).rows[0]?.value,
);
if (Number(minimum) !== config.MINIMUM_AGE)
  throw new Error(
    "MINIMUM_AGE must match the database minimum_age setting before startup.",
  );
const auth = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
let rateStore: RedisStore | undefined;
let authRateStore: RedisStore | undefined;
let redis: ReturnType<typeof createRedis> | undefined;
if (config.REDIS_URL) {
  redis = createRedis({ url: config.REDIS_URL });
  redis.on("error", () =>
    log.error({ code: "REDIS_UNAVAILABLE" }, "rate_limit_backend_failed"),
  );
  await redis.connect();
  rateStore = new RedisStore({
    prefix: "j1d:api:",
    sendCommand: (...args: string[]) => redis!.sendCommand(args),
  });
  authRateStore = new RedisStore({
    prefix: "j1d:auth:",
    sendCommand: (...args: string[]) => redis!.sendCommand(args),
  });
}
const app = createApp({
  db,
  auth,
  config,
  rateStore,
  authRateStore,
  payments: config.PAYSTACK_SECRET_KEY
    ? new PaystackProvider(config.PAYSTACK_SECRET_KEY)
    : undefined,
});
const server = app.listen(config.PORT, () =>
  log.info({ port: config.PORT }, "api_started"),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => {
    server.close(async () => {
      await redis?.quit();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  });
