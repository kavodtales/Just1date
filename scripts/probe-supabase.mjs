/* global fetch, Buffer, setTimeout, clearTimeout */
import { createClient } from "@supabase/supabase-js";
import { randomUUID, randomBytes, createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import { URL } from "node:url";

try {
  process.loadEnvFile(".env.local");
} catch {
  /* Injected environment is also supported. */
}
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || !secret)
  throw new Error("Missing ignored Supabase configuration.");
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, secret, options);
const accounts = [];
const objects = [];
const clients = [];
const report = { project: new URL(url).hostname.split(".")[0], checks: [] };
const add = (name, passed) => report.checks.push({ name, passed });
const requireSuccess = (result) => {
  if (result.error) throw new Error("PROVIDER_CHECK_FAILED");
  return result.data;
};
function totp(secret) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bits = [...secret.toUpperCase().replace(/=+$/, "")]
    .map((char) => {
      const value = alphabet.indexOf(char);
      if (value < 0) throw new Error("INVALID_FACTOR_SECRET");
      return value.toString(2).padStart(5, "0");
    })
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
function subscribe(channel) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve("TIMED_OUT"), 15000);
    channel.subscribe((status) => {
      if (["SUBSCRIBED", "CHANNEL_ERROR", "TIMED_OUT"].includes(status)) {
        clearTimeout(timeout);
        resolve(status);
      }
    });
  });
}
async function createAccount(confirmed) {
  const email = `deployment-probe-${randomUUID()}@example.com`;
  const password = `Aa1!${randomBytes(24).toString("base64url")}`;
  const { user } = requireSuccess(
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: confirmed,
      user_metadata: { date_of_birth: "1990-01-01", deployment_probe: true },
    }),
  );
  accounts.push(user.id);
  requireSuccess(
    await admin.from("users").update({ is_test: true }).eq("id", user.id),
  );
  requireSuccess(
    await admin
      .from("profiles")
      .update({ visible: false, paused: true })
      .eq("user_id", user.id),
  );
  const client = createClient(url, key, options);
  clients.push(client);
  return { client, email, password, id: user.id };
}
try {
  const minor = await admin.auth.admin.createUser({
    email: `deployment-minor-${randomUUID()}@example.com`,
    password: `Aa1!${randomBytes(24).toString("base64url")}`,
    email_confirm: true,
    user_metadata: { date_of_birth: "2015-01-01", deployment_probe: true },
  });
  if (minor.data.user) accounts.push(minor.data.user.id);
  add("database_rejects_underage_account", !!minor.error && !minor.data.user);
  const first = await createAccount(true);
  const second = await createAccount(true);
  const unconfirmed = await createAccount(false);
  const rejected =
    await unconfirmed.client.auth.signInWithPassword(unconfirmed);
  add(
    "unconfirmed_email_cannot_sign_in",
    !!rejected.error && !rejected.data.session,
  );
  requireSuccess(await first.client.auth.signInWithPassword(first));
  requireSuccess(await second.client.auth.signInWithPassword(second));
  const validated = await first.client.auth.getUser();
  add(
    "hosted_password_sign_in_and_token_validation",
    !validated.error && validated.data.user?.id === first.id,
  );
  const own = await first.client.from("users").select("id,status");
  add(
    "authenticated_user_reads_only_self",
    !own.error &&
      own.data.length === 1 &&
      own.data[0].id === first.id &&
      own.data[0].status === "EMAIL_VERIFIED",
  );
  const stranger = await first.client
    .from("profiles")
    .select("user_id")
    .eq("user_id", second.id);
  add(
    "stranger_profile_isolation",
    !stranger.error && stranger.data.length === 0,
  );
  const write = await first.client
    .from("profiles")
    .update({ display_name: "Forbidden probe" })
    .eq("user_id", first.id);
  add("direct_client_profile_writes_denied", !!write.error);
  const rpc = await first.client.rpc("rpc_me");
  add("business_rpc_denied_to_client", !!rpc.error);
  let ownEvent = false;
  let strangerEvent = false;
  const notificationId = randomUUID();
  const ownChannel = first.client
    .channel(`probe-own-${randomUUID()}`, {
      config: { postgres_changes_options: { wait: true } },
    })
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${first.id}`,
      },
      (event) => {
        if (event.new.id === notificationId) ownEvent = true;
      },
    );
  const strangerChannel = second.client
    .channel(`probe-stranger-${randomUUID()}`, {
      config: { postgres_changes_options: { wait: true } },
    })
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${first.id}`,
      },
      (event) => {
        if (event.new.id === notificationId) strangerEvent = true;
      },
    );
  const subscriptions = await Promise.all([
    subscribe(ownChannel),
    subscribe(strangerChannel),
  ]);
  add(
    "hosted_realtime_subscriptions",
    subscriptions.every((status) => status === "SUBSCRIBED"),
  );
  requireSuccess(
    await admin.from("notifications").insert({
      id: notificationId,
      user_id: first.id,
      kind: "deployment_probe",
      title: "Disposable private deployment check",
    }),
  );
  const readableNotification = await first.client
    .from("notifications")
    .select("id")
    .eq("id", notificationId);
  add(
    "notification_row_visible_to_owner",
    !readableNotification.error && readableNotification.data.length === 1,
  );
  // Observe delivery and isolation within a bounded provider window.
  for (let attempt = 0; attempt < 15 && !ownEvent; attempt++)
    await new Promise((resolve) => setTimeout(resolve, 1000));
  await new Promise((resolve) => setTimeout(resolve, 3000));
  add("hosted_realtime_own_notification_delivered", ownEvent);
  add(
    "hosted_realtime_stranger_notification_denied",
    ownEvent && !strangerEvent,
  );
  const forbiddenChannel = first.client.channel(
    `conversation:${randomUUID()}`,
    { config: { private: true } },
  );
  add(
    "private_typing_channel_rejects_nonmember",
    (await subscribe(forbiddenChannel)) === "CHANNEL_ERROR",
  );
  await first.client.removeAllChannels();
  await second.client.removeAllChannels();
  const photo = await readFile("tests/fixtures/reference-photo.jpg");
  const path = `${first.id}/deployment-probe-${randomUUID()}.jpg`;
  const upload = await first.client.storage
    .from("profile-photos")
    .upload(path, photo, { contentType: "image/jpeg" });
  if (!upload.error) objects.push(path);
  add("direct_client_photo_upload_denied", !!upload.error);
  requireSuccess(
    await admin.storage
      .from("profile-photos")
      .upload(path, photo, { contentType: "image/jpeg" }),
  );
  objects.push(path);
  const anonymous = createClient(url, key, options);
  clients.push(anonymous);
  add(
    "anonymous_private_photo_download_denied",
    !!(await anonymous.storage.from("profile-photos").download(path)).error,
  );
  add(
    "member_private_photo_download_denied",
    !!(await first.client.storage.from("profile-photos").download(path)).error,
  );
  const signed = requireSuccess(
    await admin.storage.from("profile-photos").createSignedUrl(path, 60),
  );
  const download = await fetch(signed.signedUrl);
  add(
    "server_signed_photo_download",
    download.ok &&
      download.headers.get("content-type")?.includes("image/jpeg") &&
      (await download.arrayBuffer()).byteLength === photo.length,
  );
  const factor = requireSuccess(
    await first.client.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Disposable deployment probe",
    }),
  );
  const challenge = requireSuccess(
    await first.client.auth.mfa.challenge({ factorId: factor.id }),
  );
  requireSuccess(
    await first.client.auth.mfa.verify({
      factorId: factor.id,
      challengeId: challenge.id,
      code: totp(factor.totp.secret),
    }),
  );
  const assurance = requireSuccess(
    await first.client.auth.mfa.getAuthenticatorAssuranceLevel(),
  );
  add(
    "hosted_totp_enrollment_challenge_aal2",
    assurance.currentLevel === "aal2",
  );
  requireSuccess(await first.client.auth.signOut({ scope: "global" }));
  add(
    "global_logout_clears_session",
    !(await first.client.auth.getSession()).data.session,
  );
} catch {
  add("provider_journey_completed", false);
} finally {
  for (const client of clients) await client.removeAllChannels();
  let cleaned = true;
  if (objects.length)
    cleaned = !(
      await admin.storage.from("profile-photos").remove([...new Set(objects)])
    ).error;
  for (const id of accounts) {
    const deleted = await admin.auth.admin.deleteUser(id);
    if (deleted.error) cleaned = false;
    const row = await admin.from("users").select("id").eq("id", id);
    if (row.error || row.data.length) cleaned = false;
  }
  add("temporary_accounts_and_objects_removed", cleaned);
}
console.log(JSON.stringify(report, null, 2));
if (report.checks.some((check) => !check.passed)) process.exitCode = 1;
