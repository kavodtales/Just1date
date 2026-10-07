import "dotenv/config";
import { config } from "dotenv";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import pg from "pg";
config({ path: ".env.local" });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_SSL === "false"
      ? false
      : {
          rejectUnauthorized: true,
          ...(process.env.DATABASE_SSL_CA
            ? { ca: process.env.DATABASE_SSL_CA.replace(/\\n/g, "\n") }
            : {}),
        },
  connectionTimeoutMillis: 15000,
});
await c.connect();
try {
  await c.query("select pg_advisory_lock(871920)");
  await c.query(
    "create table if not exists public.schema_migrations(name text primary key,checksum text not null,applied_at timestamptz not null default now())",
  );
  for (const name of (await readdir("supabase/migrations"))
    .filter((n) => n.endsWith(".sql"))
    .sort()) {
    const sql = (await readFile(`supabase/migrations/${name}`, "utf8")).replace(
        /\r\n/g,
        "\n",
      ),
      hash = createHash("sha256").update(sql).digest("hex");
    const old = await c.query(
      "select checksum from public.schema_migrations where name=$1",
      [name],
    );
    if (old.rows.length) {
      if (old.rows[0].checksum !== hash)
        throw new Error(`Applied migration changed: ${name}`);
      continue;
    }
    await c.query("begin");
    try {
      await c.query(sql);
      await c.query(
        "insert into public.schema_migrations(name,checksum) values($1,$2)",
        [name, hash],
      );
      await c.query("commit");
      console.log(`Applied ${name}`);
    } catch (e) {
      await c.query("rollback");
      throw e;
    }
  }
} finally {
  await c.query("select pg_advisory_unlock(871920)");
  await c.end();
}
