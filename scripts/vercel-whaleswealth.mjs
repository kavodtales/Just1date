/* global fetch, AbortSignal */
// Deploy only the three explicitly authorized Just1date projects. Secrets travel
// to Vercel over TLS, never shell arguments or logs. Reuse the CLI's existing
// authenticated session in memory; never export or print its credential.
import { spawn, execFileSync } from "node:child_process";
import { readFile, mkdir, writeFile, copyFile, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import { parse } from "dotenv";
import { URL } from "node:url";

const root = resolve(import.meta.dirname, "..");
const cli = join(process.env.APPDATA, "npm/node_modules/vercel/dist/vc.js");
const team = "team_87t2AR1GzKgpTiTKLJgqZwDt";
const projects = {
  web: {
    name: "just1date",
    id: "prj_MhBYQ0rHTfyGAaHiFTUfqNO7ZUST",
    directory: "apps/web",
    framework: "nextjs",
  },
  api: {
    name: "just1date-api-whaleswealth",
    directory: "apps/api",
    framework: "express",
  },
  admin: {
    name: "just1date-admin-whaleswealth",
    directory: "apps/admin",
    framework: "nextjs",
  },
};
const [mode, kind] = process.argv.slice(2);
if (
  ![
    "inspect",
    "configure",
    "environment",
    "deploy",
    "domains",
    "link",
  ].includes(mode) ||
  (kind && !projects[kind])
)
  throw new Error(
    "Use inspect|configure|environment|deploy|domains|link [web|api|admin].",
  );
async function run(args, input, live = false, env = {}, cwd = root) {
  return new Promise((accept, reject) => {
    const child = spawn(process.execPath, [cli, ...args], {
      cwd,
      env: { ...process.env, ...env },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let out = "",
      err = "";
    child.stdout.on("data", (chunk) => {
      out += chunk;
      if (live) process.stdout.write(chunk);
    });
    child.stderr.on("data", (chunk) => {
      err += chunk;
      if (live) process.stderr.write(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code) {
        // Environment responses can echo submitted fields: never print them.
        const error = new Error(`Vercel operation failed (${code}).`);
        error.detail = `${out}\n${err}`;
        reject(error);
      } else accept(out);
    });
    child.stdin.end(input === undefined ? undefined : JSON.stringify(input));
  });
}
async function api(path, method = "GET", body) {
  const separator = path.includes("?") ? "&" : "?";
  const auth = JSON.parse(
    await readFile(
      join(process.env.APPDATA, "com.vercel.cli/Data/auth.json"),
      "utf8",
    ),
  );
  if (!auth.token) throw new Error("Vercel CLI authentication is unavailable.");
  const response = await fetch(
    `https://api.vercel.com${path}${separator}teamId=${team}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${auth.token}`,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    },
  );
  const result = response.status === 204 ? {} : await response.json();
  if (!response.ok)
    throw new Error(
      `Vercel ${method} failed (${response.status}, ${result.error?.code || "unknown"}).`,
    );
  return result;
}
const all = await api("/v9/projects?limit=100");
for (const target of Object.values(projects)) {
  const existing = all.projects.find((p) => p.name === target.name);
  if (target.id && existing?.id !== target.id)
    throw new Error(
      "Existing web project identity does not match the authorized target.",
    );
  if (existing && existing.accountId !== team)
    throw new Error("Unexpected project owner.");
  target.id = existing?.id;
}
const chosen = kind ? [[kind, projects[kind]]] : Object.entries(projects);
try {
  for (const [key, target] of chosen) {
    if (mode === "configure") {
      const settings = {
        rootDirectory: target.directory,
        framework: target.framework,
        nodeVersion: "24.x",
        sourceFilesOutsideRootDirectory: true,
        buildCommand: "npm run build",
        installCommand: "cd ../.. && npm ci --include=dev",
        outputDirectory: null,
        serverlessFunctionRegion: "dub1",
        // Public production aliases, protected preview deployments.
        ssoProtection: { deploymentType: "preview" },
      };
      if (!target.id) {
        const created = await api("/v10/projects", "POST", {
          name: target.name,
          rootDirectory: target.directory,
          framework: target.framework,
        });
        target.id = created.id;
      }
      const result = await api(`/v9/projects/${target.id}`, "PATCH", settings);
      target.id = result.id;
      console.log(
        JSON.stringify({
          project: target.name,
          id: result.id,
          root: result.rootDirectory,
          framework: result.framework,
        }),
      );
    } else if (mode === "link") {
      if (!target.id) throw new Error("Configure project first.");
      const project = await api(`/v9/projects/${target.id}`);
      const repo = project.link
        ? `${project.link.org}/${project.link.repo}`
        : null;
      if (repo !== "Bluechipwhale/Just1date") {
        if (repo && !(key === "web" && repo === "Bluechipwhale/edgewforce"))
          throw new Error(
            "Unexpected existing repository link: refusing to change it.",
          );
        if (repo) await api(`/v9/projects/${target.id}/link`, "DELETE");
        await api(`/v9/projects/${target.id}/link`, "POST", {
          type: "github",
          repo: "Bluechipwhale/Just1date",
        });
      }
      console.log(
        JSON.stringify({
          project: target.name,
          repository: "Bluechipwhale/Just1date",
        }),
      );
    } else if (mode === "environment") {
      if (!target.id) throw new Error("Configure project first.");
      const saved = parse(
        await readFile(resolve(root, ".env.production"), "utf8"),
      );
      if (
        new URL(saved.SUPABASE_URL).hostname !==
        "kyfohngqetzsrqsyabey.supabase.co"
      )
        throw new Error("Unexpected Supabase project.");
      const web = "https://just1date.vercel.app";
      const admin = "https://just1date-admin-whaleswealth.vercel.app";
      const endpoint = "https://just1date-api-whaleswealth.vercel.app";
      const common = {
        NEXT_PUBLIC_SUPABASE_URL: saved.SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: saved.SUPABASE_ANON_KEY,
        NEXT_PUBLIC_APP_URL: key === "admin" ? admin : web,
        API_URL: endpoint,
      };
      const values =
        key === "api"
          ? {
              ...Object.fromEntries(
                [
                  "DATABASE_URL",
                  "DATABASE_SSL_CA",
                  "SUPABASE_URL",
                  "SUPABASE_ANON_KEY",
                  "SUPABASE_SERVICE_ROLE_KEY",
                ].map((name) => [name, saved[name]]),
              ),
              DATABASE_SSL: "true",
              DATABASE_POOL_MAX: "3",
              MINIMUM_AGE: "18",
              APP_URL: web,
              ADMIN_URL: admin,
              CORS_ORIGINS: [
                web,
                admin,
                "https://just1date-vert.vercel.app",
                "https://just1date-admin.vercel.app",
              ].join(","),
              AI_ENABLED: "false",
              VIDEO_CALLS_ENABLED: "false",
              PAYSTACK_CALLBACK_URL: `${web}/settings/subscription`,
            }
          : {
              ...common,
              ...(key === "web"
                ? {
                    ANDROID_SHA256_FINGERPRINTS:
                      "5E:BC:D9:24:F7:15:D6:2B:99:AB:96:B1:D0:F1:93:1F:04:91:94:6A:8D:C7:25:18:6A:A9:11:93:C0:ED:F7:A6",
                  }
                : {}),
            };
      if (Object.values(values).some((value) => !value))
        throw new Error("Required deployment configuration is missing.");
      const entries = Object.entries(values).map(([name, value]) => ({
        key: name,
        value,
        type: "encrypted",
        target: ["production", "preview"],
      }));
      await api(`/v10/projects/${target.id}/env?upsert=true`, "POST", entries);
      console.log(
        JSON.stringify({
          project: target.name,
          configuredKeys: Object.keys(values),
          existingUnrelatedSettingsPreserved: true,
          secretValuesPrinted: false,
        }),
      );
    } else if (mode === "deploy") {
      if (!target.id) throw new Error("Configure project first.");
      const project = await api(`/v9/projects/${target.id}`);
      if (
        project.rootDirectory !== target.directory ||
        project.framework !== target.framework
      )
        throw new Error("Project deployment settings mismatch.");
      // Upload a small, explicitly allowlisted source tree. Never traverse local
      // dependencies, Git history, credentials, test evidence or build caches.
      const stage = resolve(root, `.tool-cache/vercel-source-${key}`);
      if (
        !stage.startsWith(resolve(root, ".tool-cache") + "/") &&
        !stage.startsWith(resolve(root, ".tool-cache") + "\\")
      )
        throw new Error("Unsafe staging path.");
      await rm(stage, { recursive: true, force: true });
      const files = execFileSync("git", ["ls-files", "-z"], {
        cwd: root,
        encoding: "utf8",
      })
        .split("\0")
        .filter(Boolean);
      const rootFiles = new Set([
        "package.json",
        "package-lock.json",
        "turbo.json",
        "tsconfig.base.json",
        "eslint.config.mjs",
        ".vercelignore",
      ]);
      files.push(".vercelignore");
      let count = 0;
      for (const file of new Set(files)) {
        if (!(
          rootFiles.has(file) ||
          /^(apps\/(web|admin|api)|packages)\//.test(file)
        ))
          continue;
        if (
          /(^|\/)\.env[^/]*$|\.(apk|aab|ipa|jks|keystore|p8|p12|mobileprovision)$/.test(
            file,
          )
        )
          continue;
        const destination = resolve(stage, file);
        await mkdir(resolve(destination, ".."), { recursive: true });
        await copyFile(resolve(root, file), destination);
        count++;
      }
      console.log(
        JSON.stringify({ stagingFiles: count, privateFilesIncluded: false }),
      );
      await run(
        [
          "deploy",
          "--prod",
          "--yes",
          "--scope",
          "whaleswealth",
          "--archive=tgz",
        ],
        undefined,
        true,
        { VERCEL_ORG_ID: team, VERCEL_PROJECT_ID: target.id },
        stage,
      );
    } else if (mode === "domains") {
      if (target.id) {
        const result = await api(`/v9/projects/${target.id}/domains`);
        console.log(
          JSON.stringify({
            project: target.name,
            domains: result.domains.map((d) => ({
              name: d.name,
              verified: d.verified,
            })),
          }),
        );
      }
    } else {
      if (!target.id) {
        console.log(JSON.stringify({ project: target.name, exists: false }));
        continue;
      }
      const result = await api(`/v9/projects/${target.id}`);
      console.log(
        JSON.stringify({
          project: result.name,
          id: result.id,
          root: result.rootDirectory,
          framework: result.framework,
          repository: result.link
            ? `${result.link.org}/${result.link.repo}`
            : null,
          production: result.targets?.production?.url,
          protection: result.ssoProtection,
        }),
      );
    }
  }
} catch (error) {
  await mkdir(resolve(root, "releases/evidence"), { recursive: true });
  // Retain diagnostics privately, never upload with the source archive.
  await writeFile(
    resolve(root, "releases/evidence/vercel-operation-error.log"),
    error.detail || error.message,
  );
  console.error(
    error.message,
    "Private diagnostics: releases/evidence/vercel-operation-error.log",
  );
  process.exitCode = 1;
}
