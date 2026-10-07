import { createClient } from "@supabase/supabase-js";
import { createHmac, randomUUID, randomBytes } from "node:crypto";
import request from "supertest";
import { createRuntime } from "../apps/api/src/runtime";

try {
  process.loadEnvFile(".env.local");
} catch {
  /* Deployment env is supported. */
}
process.env.NODE_ENV = "production";
const publicKey = process.env.SUPABASE_ANON_KEY!;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(process.env.SUPABASE_URL!, secret, options);
const member = createClient(process.env.SUPABASE_URL!, publicKey, options);
const report = { checks: [] as { name: string; passed: boolean }[] };
const add = (name: string, passed: boolean) =>
  report.checks.push({ name, passed });
const ip = `198.18.${randomBytes(1)[0]}.${randomBytes(1)[0]}`;
const key = createHmac("sha256", secret).update(`api:${ip}`).digest("hex");
let userId: string | undefined;
const runtimes: Awaited<ReturnType<typeof createRuntime>>[] = [];
try {
  runtimes.push(await createRuntime(), await createRuntime());
  const [first, second] = runtimes;
  const health = await request(first.app).get("/health");
  add("production_runtime_health", health.status === 200);
  const ready = await request(first.app).get("/ready");
  add("production_database_readiness", ready.status === 200);
  const catalog = await request(first.app)
    .get("/v1/catalog/interests")
    .set("X-Forwarded-For", ip);
  add(
    "real_catalog_api",
    catalog.status === 200 && catalog.body.data?.length > 0,
  );
  const unauthorized = await request(first.app)
    .get("/v1/profiles/me")
    .set("X-Forwarded-For", ip);
  add("missing_token_denied", unauthorized.status === 401);
  const email = `api-probe-${randomUUID()}@example.com`;
  const password = `Aa1!${randomBytes(24).toString("base64url")}`;
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { date_of_birth: "1990-01-01", deployment_probe: true },
  });
  if (created.error || !created.data.user)
    throw new Error("TEST_ACCOUNT_CREATE_FAILED");
  userId = created.data.user.id;
  const marked = await admin
    .from("users")
    .update({ is_test: true })
    .eq("id", userId);
  const hidden = await admin
    .from("profiles")
    .update({ visible: false, paused: true })
    .eq("user_id", userId);
  if (marked.error || hidden.error) throw new Error("TEST_ISOLATION_FAILED");
  const session = await member.auth.signInWithPassword({ email, password });
  if (session.error || !session.data.session)
    throw new Error("TEST_LOGIN_FAILED");
  const token = session.data.session.access_token;
  const me = await request(first.app)
    .get("/v1/profiles/me")
    .set("X-Forwarded-For", ip)
    .auth(token, { type: "bearer" });
  add(
    "real_auth_token_and_profile_api",
    me.status === 200 && me.body.data?.user_id === userId,
  );
  const onboarding = await request(first.app)
    .get("/v1/profiles/discover")
    .set("X-Forwarded-For", ip)
    .auth(token, { type: "bearer" });
  add(
    "incomplete_profile_cannot_discover",
    onboarding.status === 409 &&
      onboarding.body.error?.code === "ONBOARDING_REQUIRED",
  );
  const staff = await request(first.app)
    .get("/v1/admin/me")
    .set("X-Forwarded-For", ip)
    .auth(token, { type: "bearer" });
  add("member_cannot_access_staff_api", [401, 403].includes(staff.status));
  const cors = await request(first.app)
    .get("/health")
    .set("Origin", "https://untrusted.example.test");
  add("untrusted_browser_origin_denied", cors.status === 403);
  const prepared = await admin
    .from("request_rate_limits")
    .update({ total_hits: 119 })
    .eq("namespace", "api")
    .eq("key", key)
    .select("key");
  if (prepared.error || prepared.data.length !== 1)
    throw new Error("TEST_COUNTER_NOT_FOUND");
  const burst = await Promise.all(
    [first, second].map((runtime) =>
      request(runtime.app)
        .get("/v1/catalog/interests")
        .set("X-Forwarded-For", ip),
    ),
  );
  add(
    "shared_limits_across_production_instances",
    burst
      .map((result) => result.status)
      .sort()
      .join(",") === "200,429",
  );
  const behindProxy = await request(first.app)
    .get("/v1/profiles/me")
    .set("X-Forwarded-For", ip)
    .auth(token, { type: "bearer" });
  add(
    "validated_member_is_not_limited_by_shared_proxy_ip",
    behindProxy.status === 200,
  );
  const memberKey = createHmac("sha256", secret)
    .update(`api:user:${userId}`)
    .digest("hex");
  const counter = await admin
    .from("request_rate_limits")
    .update({ total_hits: 119 })
    .eq("namespace", "api")
    .eq("key", memberKey)
    .select("key");
  if (counter.error || counter.data.length !== 1)
    throw new Error("TEST_MEMBER_COUNTER_NOT_FOUND");
  const memberBurst = await Promise.all(
    [first, second].map((runtime) =>
      request(runtime.app)
        .get("/v1/profiles/me")
        .set("X-Forwarded-For", ip)
        .auth(token, { type: "bearer" }),
    ),
  );
  add(
    "member_limit_shared_across_production_instances",
    memberBurst
      .map((x) => x.status)
      .sort()
      .join(",") === "200,429",
  );
} catch (error) {
  // Only locally assigned codes are reported; provider errors stay private.
  add("api_journey_completed", false);
  console.log(
    JSON.stringify({
      stage:
        error instanceof Error && error.message.startsWith("TEST_")
          ? error.message
          : "RUNTIME_OR_PROVIDER_FAILURE",
    }),
  );
} finally {
  await member.auth.signOut({ scope: "global" });
  const counters = await admin
    .from("request_rate_limits")
    .delete()
    .eq("namespace", "api")
    .in("key", [
      key,
      ...(userId
        ? [
            createHmac("sha256", secret)
              .update(`api:user:${userId}`)
              .digest("hex"),
          ]
        : []),
    ]);
  let clean = !counters.error;
  if (userId) {
    const removed = await admin.auth.admin.deleteUser(userId);
    const remaining = await admin.from("users").select("id").eq("id", userId);
    clean =
      clean &&
      !removed.error &&
      !remaining.error &&
      remaining.data.length === 0;
  }
  for (const runtime of runtimes) await runtime.close();
  add("temporary_api_test_records_removed", clean);
}
console.log(JSON.stringify(report, null, 2));
if (report.checks.some((check) => !check.passed)) process.exitCode = 1;
