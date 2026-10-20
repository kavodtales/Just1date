/* global fetch */
// Uses the existing Git credential helper; never writes credentials to disk.
import { execFileSync } from "node:child_process";
import { Buffer } from "node:buffer";
import { readFile, stat, writeFile, mkdir } from "node:fs/promises";
const repository =
  process.env.GITHUB_RELEASE_REPOSITORY ?? "Bluechipwhale/Just1date";
if (!["Bluechipwhale/Just1date", "kavodtales/Just1date"].includes(repository))
  throw new Error("Choose an explicitly authorized Just1date repository.");
const credential = execFileSync("git", ["credential", "fill"], {
  input: `protocol=https\nhost=github.com\npath=${repository}.git\nusername=Bluechipwhale\n\n`,
  encoding: "utf8",
  env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "Never" },
});
const token = credential
  .split(/\r?\n/)
  .find((line) => line.startsWith("password="))
  ?.slice(9);
if (!token) throw new Error("GitHub authentication is unavailable.");
async function request(path, method = "GET", body, binary = false) {
  const url = path.startsWith("https://uploads.github.com/")
    ? path
    : `https://api.github.com/repos/${repository}${path}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(body
        ? {
            "Content-Type": binary
              ? "application/octet-stream"
              : "application/json",
          }
        : {}),
    },
    body: body ? (binary ? body : JSON.stringify(body)) : undefined,
  });
  if (!response.ok)
    throw new Error(`GitHub ${method} failed (${response.status}).`);
  return response.status === 204 ? {} : response.json();
}
const [command, arg, extra] = process.argv.slice(2);
if (command === "release") {
  if (!/^v[0-9]+\.[0-9]+\.[0-9]+(?:-[a-zA-Z0-9.-]+)?$/.test(arg || ""))
    throw new Error("Provide a release tag.");
  const release = await request(`/releases/tags/${arg}`);
  console.log(
    JSON.stringify({
      url: release.html_url,
      prerelease: release.prerelease,
      assets: release.assets.map((a) => ({
        name: a.name,
        bytes: a.size,
        sha256: a.digest,
        url: a.browser_download_url,
      })),
    }),
  );
} else if (command === "status") {
  const repo = await request("");
  const runs = await request("/actions/runs?per_page=8");
  console.log(
    JSON.stringify({
      repository: repo.html_url,
      permissions: repo.permissions,
      runs: runs.workflow_runs.map((r) => ({
        id: r.id,
        name: r.name,
        status: r.status,
        conclusion: r.conclusion,
        sha: r.head_sha,
        url: r.html_url,
      })),
    }),
  );
} else if (command === "dispatch") {
  await request("/actions/workflows/android-artifact.yml/dispatches", "POST", {
    ref: "main",
    inputs: { artifact_url: arg, sha256: extra },
  });
  console.log("Android artifact verification requested.");
} else if (command === "dispatch-bundle") {
  await request("/actions/workflows/android-bundle.yml/dispatches", "POST", {
    ref: "main",
    inputs: { artifact_url: arg, sha256: extra },
  });
  console.log("Google Play bundle verification requested.");
} else if (command === "dispatch-digests") {
  await request("/actions/workflows/native-digests.yml/dispatches", "POST", {
    ref: "main",
    inputs: { apk_url: arg, aab_url: extra },
  });
  console.log("Independent native artifact measurement requested.");
} else if (command === "publish-candidate") {
  if (!/^\d+$/.test(arg || "") || !/^\d+$/.test(extra || ""))
    throw new Error("Provide successful APK and AAB verification run IDs.");
  await request(
    "/actions/workflows/publish-mobile-candidate.yml/dispatches",
    "POST",
    {
      ref: "main",
      inputs: { apk_verification_run: arg, aab_verification_run: extra },
    },
  );
  console.log("Verified mobile candidate publication requested.");
} else if (command === "run") {
  const run = await request(`/actions/runs/${arg}`),
    jobs = await request(`/actions/runs/${arg}/jobs`);
  console.log(
    JSON.stringify({
      status: run.status,
      conclusion: run.conclusion,
      url: run.html_url,
      jobs: jobs.jobs.map((j) => ({
        name: j.name,
        conclusion: j.conclusion,
        steps: j.steps?.map((s) => ({
          name: s.name,
          conclusion: s.conclusion,
        })),
      })),
    }),
  );
} else if (command === "checks") {
  const checks = await request(`/commits/${arg}/check-runs`),
    statuses = await request(`/commits/${arg}/status`);
  console.log(
    JSON.stringify({
      checks: checks.check_runs.map((r) => ({
        name: r.name,
        status: r.status,
        conclusion: r.conclusion,
        url: r.details_url,
      })),
      deployments: statuses.statuses.map((r) => ({
        context: r.context,
        state: r.state,
        description: r.description,
        url: r.target_url,
      })),
    }),
  );
} else if (
  ["artifacts", "bundle-artifacts", "digest-artifacts"].includes(command)
) {
  const name =
    command === "artifacts"
      ? "android-verification"
      : command === "bundle-artifacts"
        ? "google-play-bundle-verification"
        : "native-digests";
  const result = await request(`/actions/runs/${arg}/artifacts`);
  const artifact = result.artifacts.find((a) => a.name === name && !a.expired);
  if (!artifact) throw new Error("Android verification artifact is not ready.");
  const response = await fetch(
    `https://api.github.com/repos/${repository}/actions/artifacts/${artifact.id}/zip`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    },
  );
  if (!response.ok)
    throw new Error(`Artifact download failed (${response.status}).`);
  await mkdir("releases/evidence", { recursive: true });
  await writeFile(
    `releases/evidence/${name}.zip`,
    Buffer.from(await response.arrayBuffer()),
  );
  console.log(
    JSON.stringify({
      artifact: artifact.name,
      file: `releases/evidence/${name}.zip`,
    }),
  );
} else if (command === "publish") {
  const tag = "v0.1.0-preview";
  let release;
  const releases = await request("/releases?per_page=20");
  release = releases.find((r) => r.tag_name === tag);
  if (!release)
    release = await request("/releases", "POST", {
      tag_name: tag,
      target_commitish: "main",
      name: "Just1date Android preview 0.1.0",
      prerelease: true,
      body: await readFile("releases/NOTES.md", "utf8"),
    });
  for (const filename of ["just1date-0.1.0-preview.apk", "SHA256SUMS.txt"]) {
    if (release.assets.some((a) => a.name === filename)) continue;
    const path = `releases/${filename}`;
    const size = (await stat(path)).size;
    if (size > 200_000_000)
      throw new Error("Artifact exceeds expected release size.");
    const asset = await request(
      `${release.upload_url.split("{")[0]}?name=${encodeURIComponent(filename)}`,
      "POST",
      await readFile(path),
      true,
    );
    console.log(
      JSON.stringify({
        artifact: asset.name,
        url: asset.browser_download_url,
        bytes: asset.size,
      }),
    );
  }
  console.log(JSON.stringify({ release: release.html_url }));
} else throw new Error("Use status, dispatch, run, checks or publish.");
