import { execFileSync } from "node:child_process";
import { Buffer } from "node:buffer";
import { URL } from "node:url";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

// Read local secrets for comparison, never print their values.
process.loadEnvFile(".env.local");
const secrets = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SECRET_KEY",
  "DATABASE_URL",
  "PAYSTACK_SECRET_KEY",
  "OPENAI_API_KEY",
]
  .map((name) => process.env[name])
  .filter((value) => value?.length >= 12);
if (process.env.DATABASE_URL) {
  const password = decodeURIComponent(
    new URL(process.env.DATABASE_URL).password,
  );
  if (password.length >= 12) secrets.push(password);
}
if (!secrets.length)
  throw new Error("No local server secrets available to check.");
const paths = execFileSync("git", [
  "ls-files",
  "--cached",
  "--others",
  "--exclude-standard",
  "-z",
])
  .toString()
  .split("\0")
  .filter(Boolean);
async function collect(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await collect(path);
    else paths.push(path);
  }
}
await collect("apps/web/.next/static");
await collect("apps/admin/.next/static");
const leaks = [];
for (const path of new Set(paths)) {
  let contents;
  try {
    contents = await readFile(path);
  } catch (error) {
    if (error.code === "ENOENT") continue;
    throw error;
  }
  if (secrets.some((value) => contents.includes(Buffer.from(value))))
    leaks.push(path);
}
if (leaks.length) {
  console.error("Server secrets found in these files:", leaks.join(", "));
  process.exitCode = 1;
} else
  console.log(
    `PASS: no local server secrets in ${new Set(paths).size} source/asset/browser files.`,
  );
