/* global fetch */
import { createHash } from "node:crypto";
import { URL } from "node:url";
import { createWriteStream, createReadStream } from "node:fs";
import { mkdir, rename, writeFile, stat } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { Readable, Transform, Writable } from "node:stream";
const [source, filename, mode] = process.argv.slice(2);
if (mode && mode !== "--hash-only")
  throw new Error("Unsupported download mode.");
const hashOnly = mode === "--hash-only";
const url = new URL(source);
if (
  url.protocol !== "https:" ||
  url.hostname !== "expo.dev" ||
  !url.pathname.startsWith("/artifacts/eas/") ||
  !/^just1date-[a-zA-Z0-9.-]+\.(apk|aab|tar\.gz)$/.test(filename || "")
)
  throw new Error(
    "Provide the finished Expo artifact and a Just1date release filename.",
  );
await mkdir("releases", { recursive: true });
try {
  const partial = `releases/${filename}.partial`;
  const offset = hashOnly
    ? 0
    : await stat(partial)
        .then((file) => file.size)
        .catch(() => 0);
  const response = await fetch(url, {
    headers: offset ? { Range: `bytes=${offset}-` } : {},
  });
  if (!response.ok || !response.body) throw new Error("Download unavailable.");
  const resume = offset > 0 && response.status === 206;
  if (
    resume &&
    !response.headers.get("content-range")?.startsWith(`bytes ${offset}-`)
  )
    throw new Error("Invalid download range.");
  const hash = createHash("sha256");
  let bytes = resume ? offset : 0;
  if (resume)
    for await (const chunk of createReadStream(partial)) hash.update(chunk);
  const check = new Transform({
    transform(chunk, _encoding, callback) {
      bytes += chunk.length;
      if (bytes > 268435456) {
        callback(new Error("Artifact exceeds expected size."));
        return;
      }
      hash.update(chunk);
      callback(null, chunk);
    },
  });
  await pipeline(
    Readable.fromWeb(response.body),
    check,
    hashOnly
      ? new Writable({
          write(_chunk, _encoding, callback) {
            callback();
          },
        })
      : createWriteStream(partial, { flags: resume ? "a" : "w" }),
  );
  const result = {
    artifact: url.href,
    filename,
    sha256: hash.digest("hex"),
    bytes,
  };
  if (!hashOnly) await rename(partial, `releases/${filename}`);
  await mkdir("releases/evidence", { recursive: true });
  await writeFile(
    `releases/evidence/${filename}.json`,
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(JSON.stringify(result));
} catch {
  console.error(
    "Native artifact download failed; retry the same finished artifact.",
  );
  process.exitCode = 1;
}
