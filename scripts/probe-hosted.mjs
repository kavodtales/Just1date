/* global fetch, AbortSignal, Buffer */
import { createClient } from "@supabase/supabase-js";
import { randomUUID, randomBytes, createHmac } from "node:crypto";
process.loadEnvFile(".env.local");
const sites = {
  member: "https://just1date-vert.vercel.app",
  staff: "https://just1date-admin.vercel.app",
  api: "https://just1date-api.vercel.app",
};
const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const checks = [];
const add = (name, passed) => checks.push({ name, passed });
const jars = { member: new Map(), staff: new Map() };
async function call(site, path, body, origin = sites[site]) {
  const jar = jars[site];
  const result = await fetch(`${sites[site]}${path}`, {
    method: body ? "POST" : "GET",
    redirect: "manual",
    headers: {
      ...(body ? { "Content-Type": "application/json", Origin: origin } : {}),
      ...(jar?.size
        ? { Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; ") }
        : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(45000),
  });
  const cookies = result.headers.getSetCookie();
  for (const cookie of cookies) {
    const pair = cookie.split(";")[0],
      index = pair.indexOf("=");
    if (jar) jar.set(pair.slice(0, index), pair.slice(index + 1));
  }
  let data;
  try {
    data = await result.json();
  } catch {
    data = {};
  }
  return { status: result.status, data, cookies, headers: result.headers };
}
function totp(secret) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bits = [...secret.toUpperCase().replace(/=+$/, "")]
    .map((char) => alphabet.indexOf(char).toString(2).padStart(5, "0"))
    .join("");
  const bytes = Buffer.from(
    bits.match(/.{8}/g).map((byte) => parseInt(byte, 2)),
  );
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const digest = createHmac("sha1", bytes).update(counter).digest();
  return ((digest.readUInt32BE(digest[19] & 15) & 0x7fffffff) % 1000000)
    .toString()
    .padStart(6, "0");
}
let userId;
try {
  const health = await call("api", "/health");
  add(
    "hosted_api_health",
    health.status === 200 && health.data.data?.status === "ok",
  );
  const ready = await call("api", "/ready");
  add("hosted_database_readiness", ready.status === 200);
  const catalog = await call("api", "/v1/catalog/interests");
  add(
    "hosted_catalog",
    catalog.status === 200 && catalog.data.data?.length > 0,
  );
  const denied = await call("api", "/v1/profiles/me");
  add("hosted_api_requires_identity", denied.status === 401);
  for (const site of ["member", "staff"]) {
    const unauth = await call(site, "/api/service/profiles/me");
    add(`${site}_proxy_requires_session`, unauth.status === 401);
    const csrf = await call(
      site,
      "/api/auth",
      { mode: "login", email: "probe@example.com", password: "unused" },
      "https://untrusted.example.test",
    );
    add(`${site}_login_csrf_rejected`, csrf.status === 403);
  }
  const email = `hosted-probe-${randomUUID()}@example.com`,
    password = `Aa1!${randomBytes(24).toString("base64url")}`;
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { date_of_birth: "1990-01-01", deployment_probe: true },
  });
  if (created.error || !created.data.user)
    throw new Error("TEST_CREATE_FAILED");
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
  const passwordProbe = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const passwordLogin = await passwordProbe.auth.signInWithPassword({
    email,
    password,
  });
  if (passwordLogin.error) throw new Error("TEST_PASSWORD_LOGIN_FAILED");
  const weakPassword = await passwordProbe.auth.updateUser({
    password: "Aa1!weak",
  });
  add(
    "hosted_auth_rejects_short_password",
    weakPassword.error?.code === "weak_password",
  );
  await passwordProbe.auth.signOut({ scope: "local" });
  for (const site of ["member", "staff"]) {
    const login = await call(site, "/api/auth", {
      mode: "login",
      email,
      password,
    });
    add(
      `${site}_real_cookie_sign_in`,
      login.status === 200 && login.data.verified === true,
    );
    add(
      `${site}_secure_http_only_session`,
      login.cookies.length > 0 &&
        login.cookies.every(
          (x) =>
            /HttpOnly/i.test(x) && /Secure/i.test(x) && /SameSite=lax/i.test(x),
        ),
    );
    add(
      `${site}_login_does_not_return_tokens`,
      !/access_token|refresh_token/.test(JSON.stringify(login.data)),
    );
    const me = await call(site, "/api/service/profiles/me");
    add(
      `${site}_real_proxy_profile`,
      me.status === 200 && me.data.data?.user_id === userId,
    );
  }
  const initial = await call("staff", "/api/service/admin/me");
  add(
    "staff_requires_second_factor",
    initial.status === 403 && initial.data.error?.code === "MFA_REQUIRED",
  );
  const enroll = await call("staff", "/api/mfa", { action: "enroll" });
  add(
    "hosted_staff_factor_enrollment",
    enroll.status === 200 && !!enroll.data.secret,
  );
  if (enroll.status !== 200 || !enroll.data.secret)
    throw new Error("TEST_FACTOR_FAILED");
  const verify = await call("staff", "/api/mfa", {
    action: "verify",
    factor_id: enroll.data.factor_id,
    code: totp(enroll.data.secret),
  });
  add(
    "hosted_staff_factor_verification",
    verify.status === 200 && verify.data.verified === true,
  );
  add(
    "hosted_staff_upgraded_cookie",
    verify.cookies.length > 0 &&
      verify.cookies.every((x) => /HttpOnly/i.test(x) && /Secure/i.test(x)),
  );
  const role = await call("staff", "/api/service/admin/me");
  add(
    "verified_nonstaff_still_denied",
    role.status === 403 && role.data.error?.code !== "MFA_REQUIRED",
  );
  for (const site of ["member", "staff"]) {
    await call(site, "/api/auth", { mode: "logout" });
    const ended = await call(site, "/api/service/profiles/me");
    add(`${site}_logout_revokes_cookie_session`, ended.status === 401);
  }
} catch {
  add("hosted_journey_completed", false);
} finally {
  let clean = true;
  if (userId) {
    const removed = await admin.auth.admin.deleteUser(userId);
    const remaining = await admin.from("users").select("id").eq("id", userId);
    clean = !removed.error && !remaining.error && remaining.data.length === 0;
    const key = createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY)
      .update(`api:user:${userId}`)
      .digest("hex");
    const deleted = await admin
      .from("request_rate_limits")
      .delete()
      .eq("namespace", "api")
      .eq("key", key);
    clean = clean && !deleted.error;
  }
  add("temporary_hosted_account_removed", clean);
}
console.log(JSON.stringify({ sites, checks }, null, 2));
if (checks.some((x) => !x.passed)) process.exitCode = 1;
