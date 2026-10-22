// Run approved cloud builds without exposing temporary signed upload URLs.
import { spawn } from "node:child_process";
import { readdir, access } from "node:fs/promises";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const [platform, profile, source] = process.argv.slice(2);
if (
  !(
    (platform === "android" &&
      ["production-apk", "production"].includes(profile)) ||
    (platform === "ios" && profile === "ios-simulator")
  ) ||
  !/^[a-f0-9]{7,40}$/.test(source || "")
)
  throw new Error(
    "Use android production-apk|production or ios ios-simulator, followed by the source commit.",
  );
let entry;
const cache = resolve(root, ".tool-cache/eas/_npx");
for (const folder of await readdir(cache)) {
  const candidate = resolve(cache, folder, "node_modules/eas-cli/bin/run");
  try {
    await access(candidate);
    entry = candidate;
    break;
  } catch {
    /* Other cache entry. */
  }
}
if (!entry) throw new Error("The approved EAS CLI is unavailable.");
const child = spawn(
  process.execPath,
  [
    entry,
    "build",
    "--platform",
    platform,
    "--profile",
    profile,
    "--non-interactive",
    "--no-wait",
    "--message",
    `Premium editorial redesign and Just One Date, source ${source}`,
  ],
  {
    cwd: resolve(root, "apps/mobile"),
    env: {
      ...process.env,
      NODE_OPTIONS: `${process.env.NODE_OPTIONS || ""} --use-system-ca`,
      EAS_NO_VCS: "1",
      EAS_PROJECT_ROOT: root,
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
const sanitize = (line) =>
  line.replace(/https?:\/\/[^\s<>"']+/g, (url) => {
    if (
      url.includes("storage.googleapis.com") ||
      url.includes("Signature=") ||
      url.includes("Credential=")
    )
      return "[temporary upload URL omitted]";
    return url;
  });
for (const stream of [child.stdout, child.stderr]) {
  let pending = "";
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    const lines = (pending + chunk).split(/[\r\n]+/);
    pending = lines.pop() || "";
    for (const line of lines)
      if (line) process.stdout.write(sanitize(line) + "\n");
  });
  stream.on("end", () => {
    if (pending) process.stdout.write(sanitize(pending) + "\n");
  });
}
child.on("error", () => {
  console.error("Unable to start EAS CLI.");
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
