/* global fetch, AbortSignal */
// Read-only availability evidence. No account creation, emails or member data.
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { parse } from "dotenv";
import { URL } from "node:url";
const date = process.argv[2];
if (!/^\d{4}-\d{2}-\d{2}$/.test(date || ""))
  throw new Error("Provide the client assessment date, YYYY-MM-DD.");
const env = parse(await readFile(".env.local", "utf8"));
const member = "https://just1date.vercel.app",
  api = "https://just1date-api-whaleswealth.vercel.app",
  staff = "https://just1date-admin-whaleswealth.vercel.app";
const checks = [
  ...[
    "/",
    "/welcome",
    "/auth/register",
    "/demo",
    "/download",
    "/manifest.webmanifest",
    "/sw.js",
    "/icons/icon-192.png",
    "/images/editorial/hero.webp",
    "/images/editorial/amara.webp",
    "/images/editorial/tomi.webp",
    "/images/editorial/zara.webp",
    "/images/editorial/daniel.webp",
    "/images/editorial/venue.webp",
  ].map((path) => ({ service: "web", url: member + path, expected: 200 })),
  {
    service: "member_identity_boundary",
    url: member + "/api/service/profiles/me",
    expected: 401,
  },
  { service: "staff_login", url: staff + "/auth/login", expected: 200 },
  {
    service: "staff_identity_boundary",
    url: staff + "/api/service/admin/me",
    expected: 401,
  },
  { service: "api_liveness", url: api + "/health", expected: 200 },
  { service: "database_readiness", url: api + "/ready", expected: 200 },
  {
    service: "supabase_auth",
    url: env.SUPABASE_URL + "/auth/v1/health",
    expected: 200,
    headers: { apikey: env.SUPABASE_ANON_KEY },
  },
];
const results = [];
for (let index = 0; index < checks.length; index += 4) {
  results.push(
    ...(await Promise.all(
      checks
        .slice(index, index + 4)
        .map(async ({ service, url, expected, headers }) => {
          try {
            const response = await fetch(url, {
              headers,
              redirect: "follow",
              signal: AbortSignal.timeout(30000),
            });
            await response.arrayBuffer();
            return {
              service,
              url,
              status: response.status,
              expected,
              passed: response.status === expected,
            };
          } catch (error) {
            return {
              service,
              url,
              passed: false,
              error: error.cause?.code || error.name,
            };
          }
        }),
    )),
  );
}
const report = {
  assessed_date: date,
  member,
  api,
  staff,
  supabase_project: new URL(env.SUPABASE_URL).hostname.split(".")[0],
  checks: results,
};
await mkdir("docs/security", { recursive: true });
const file = `docs/security/audit-live-${date}.json`;
await writeFile(file, JSON.stringify(report, null, 2) + "\n");
console.log(
  JSON.stringify(
    {
      file,
      passed: results.filter((r) => r.passed).length,
      failed: results.filter((r) => !r.passed),
    },
    null,
    2,
  ),
);
if (results.some((r) => !r.passed)) process.exitCode = 1;
