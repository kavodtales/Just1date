import { access, cp } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const app = process.argv[2];
if (!["web", "admin"].includes(app)) throw new Error("Choose web or admin.");
const root = resolve(import.meta.dirname, "..");
const source = resolve(root, "apps", app);
const target = resolve(source, ".next", "standalone", "apps", app);
await access(resolve(target, "server.js"));
// Next standalone tracing intentionally omits these assets. Keep secrets outside the bundle.
await cp(
  resolve(source, ".next", "static"),
  resolve(target, ".next", "static"),
  { recursive: true },
);
try {
  await access(resolve(source, "public"));
  await cp(resolve(source, "public"), resolve(target, "public"), {
    recursive: true,
  });
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
try {
  process.loadEnvFile(resolve(source, ".env.local"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
process.env.PORT ??= app === "web" ? "3000" : "3001";
process.env.HOSTNAME ??= "127.0.0.1";
await import(pathToFileURL(resolve(target, "server.js")).href);
