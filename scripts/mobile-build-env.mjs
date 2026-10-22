// Copy only allowlisted PUBLIC runtime values into EAS build profiles.
// No server secret, database URL, or Auth service-role key may enter a native build.
import { readFile, writeFile } from "node:fs/promises";
import { parse } from "dotenv";
import { URL } from "node:url";
import { Buffer } from "node:buffer";
const root = parse(await readFile(".env.local", "utf8"));
const url = new URL(root.SUPABASE_URL);
if (url.protocol !== "https:")
  throw new Error("A production HTTPS Supabase URL is required.");
const key = root.SUPABASE_ANON_KEY;
if (!key) throw new Error("A public Supabase key is required.");
if (!key.startsWith("sb_publishable_")) {
  let role;
  try {
    role = JSON.parse(
      Buffer.from(key.split(".")[1], "base64url").toString(),
    ).role;
  } catch {
    throw new Error("Invalid publishable key.");
  }
  if (role !== "anon")
    throw new Error(
      "Refusing to copy a privileged key into mobile configuration.",
    );
}
const path = "apps/mobile/eas.json",
  config = JSON.parse(await readFile(path, "utf8"));
const values = {
  EXPO_PUBLIC_API_URL: "https://just1date-api-whaleswealth.vercel.app",
  EXPO_PUBLIC_WEB_URL: "https://just1date.vercel.app",
  EXPO_PUBLIC_SUPABASE_URL: url.origin,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: key,
};
for (const name of ["preview", "production-apk", "production", "ios-simulator"])
  config.build[name].env = { ...config.build[name].env, ...values };
await writeFile(path, JSON.stringify(config, null, 2) + "\n");
console.log(
  "EAS profiles contain only validated public runtime settings. No secret values printed.",
);
