/* global fetch, AbortSignal */
import { createClient } from "@supabase/supabase-js";
import { URL } from "node:url";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";

try {
  process.loadEnvFile(".env.local");
} catch {
  /* Host environment can supply credentials. */
}
const url = process.env.SUPABASE_URL;
const publicKey = process.env.SUPABASE_ANON_KEY;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !publicKey || !secret)
  throw new Error(
    "Configure Supabase URL/public/server keys in ignored .env.local.",
  );
const report = { project: new URL(url).hostname.split(".")[0], checks: [] };
const add = (name, passed, details) =>
  report.checks.push({ name, passed, ...details });
async function get(path, key, bearer = key) {
  const response = await fetch(`${url}${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${bearer}` },
    signal: AbortSignal.timeout(15000),
  });
  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  return { status: response.status, ok: response.ok, data };
}
try {
  const settings = await get("/auth/v1/settings", publicKey);
  add("public_key_auth", settings.ok, { status: settings.status });
  if (settings.ok)
    add("email_confirmation", settings.data.mailer_autoconfirm === false, {
      confirmation_required: settings.data.mailer_autoconfirm === false,
      email_signup_enabled: settings.data.external?.email === true,
    });
  const auth = createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const users = await auth.auth.admin.listUsers({ page: 1, perPage: 1 });
  add("server_key_auth_admin", !users.error, {
    status: users.error?.status ?? 200,
  });
  const ledger = await get(
    "/rest/v1/schema_migrations?select=name,checksum&order=name",
    secret,
  );
  let matches = ledger.ok && Array.isArray(ledger.data);
  const names = (await readdir("supabase/migrations"))
    .filter((n) => n.endsWith(".sql"))
    .sort();
  if (matches) {
    matches = ledger.data.length === names.length;
    for (const name of names) {
      const source = (
        await readFile(`supabase/migrations/${name}`, "utf8")
      ).replace(/\r\n/g, "\n");
      const hash = createHash("sha256").update(source).digest("hex");
      if (
        !ledger.data.some((row) => row.name === name && row.checksum === hash)
      )
        matches = false;
    }
  }
  add("installed_migration_checksums", matches, {
    status: ledger.status,
    expected_migrations: names.length,
    installed_migrations: Array.isArray(ledger.data) ? ledger.data.length : 0,
  });
  const catalog = await get(
    "/rest/v1/interests?select=code&limit=1",
    publicKey,
  );
  add(
    "public_catalog",
    catalog.ok && Array.isArray(catalog.data) && catalog.data.length === 1,
    { status: catalog.status },
  );
  const privateUsers = await get("/rest/v1/users?select=id&limit=1", publicKey);
  add(
    "anonymous_users_isolation",
    [401, 403].includes(privateUsers.status) ||
      (privateUsers.ok &&
        Array.isArray(privateUsers.data) &&
        privateUsers.data.length === 0),
    { status: privateUsers.status },
  );
  const privateLedger = await get(
    "/rest/v1/schema_migrations?select=name&limit=1",
    publicKey,
  );
  add("anonymous_ledger_isolation", [401, 403].includes(privateLedger.status), {
    status: privateLedger.status,
  });
  const buckets = await auth.storage.listBuckets();
  const required = ["profile-photos", "verification-evidence"];
  add(
    "private_storage_buckets",
    !buckets.error &&
      required.every((id) =>
        buckets.data.some(
          (b) =>
            b.id === id &&
            !b.public &&
            Number(b.file_size_limit) === 5242880 &&
            b.allowed_mime_types?.length === 1 &&
            b.allowed_mime_types[0] === "image/jpeg",
        ),
      ),
    {
      buckets: (buckets.data ?? [])
        .filter((b) => required.includes(b.id))
        .map((b) => ({
          id: b.id,
          public: b.public,
          file_size_limit: b.file_size_limit,
        })),
    },
  );
} catch (error) {
  add("network_or_provider_access", false, {
    detail: "Connection failed; no provider payload or credential logged.",
    code: error.cause?.code ?? error.name,
  });
}
console.log(JSON.stringify(report, null, 2));
if (report.checks.some((check) => !check.passed)) process.exitCode = 1;
