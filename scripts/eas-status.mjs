import { readdir, access } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
const root = resolve(import.meta.dirname, "..");
const cache = resolve(root, ".tool-cache/eas/_npx");
let entry = process.env.EAS_CLI_PATH;
if (!entry) {
  for (const folder of await readdir(cache)) {
    const candidate = resolve(cache, folder, "node_modules/eas-cli/bin/run");
    try {
      await access(candidate);
      entry = candidate;
      break;
    } catch {
      /* Not this cached tool. */
    }
  }
}
if (!entry)
  throw new Error("Set EAS_CLI_PATH to the official EAS CLI entry point.");
const { stdout } = await promisify(execFile)(
  process.execPath,
  [
    entry,
    ...(process.argv[2]
      ? ["build:view", process.argv[2]]
      : ["build:list", "--limit", "5"]),
    "--json",
    "--non-interactive",
  ],
  {
    cwd: resolve(root, "apps/mobile"),
    env: {
      ...process.env,
      NODE_OPTIONS: `${process.env.NODE_OPTIONS || ""} --use-system-ca`,
    },
    maxBuffer: 4 * 1024 * 1024,
  },
);
const result = JSON.parse(stdout),
  builds = Array.isArray(result) ? result : [result];
console.log(
  JSON.stringify(
    builds.map((build) => ({
      id: build.id,
      status: build.status,
      platform: build.platform,
      profile: build.buildProfile,
      version: build.appVersion,
      buildNumber: build.appBuildVersion,
      artifact: build.artifacts?.applicationArchiveUrl,
      createdAt: build.createdAt,
      completedAt: build.completedAt,
      error: build.error,
    })),
    null,
    2,
  ),
);
