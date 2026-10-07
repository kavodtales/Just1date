import { afterAll, beforeAll, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import type { Database } from "@just1date/database";
import type { Options } from "express-rate-limit";
import { PostgresRateStore } from "../../apps/api/src/lib/postgres-rate-store";
let sql: PGlite;
let first: PostgresRateStore;
let second: PostgresRateStore;
let auth: PostgresRateStore;
beforeAll(async () => {
  sql = new PGlite();
  await sql.exec(
    "create role anon;create role authenticated;create role service_role bypassrls;",
  );
  await sql.exec(
    await readFile("supabase/migrations/202610070009_rate_limits.sql", "utf8"),
  );
  const db = {
    query: (query: string, params?: unknown[]) => sql.query(query, params),
  } as Database;
  first = new PostgresRateStore(db, "api", "test-only-hmac-key");
  second = new PostgresRateStore(db, "api", "test-only-hmac-key");
  auth = new PostgresRateStore(db, "auth", "test-only-hmac-key");
  for (const store of [first, second, auth])
    store.init({ windowMs: 60000 } as Options);
});
afterAll(async () => sql?.close());
it("shares atomic limits between instances and separates authentication counters", async () => {
  const hits = await Promise.all(
    Array.from({ length: 40 }, (_, i) =>
      (i % 2 ? first : second).increment("203.0.113.42"),
    ),
  );
  expect(hits.map((hit) => hit.totalHits).sort((a, b) => a - b)).toEqual(
    Array.from({ length: 40 }, (_, i) => i + 1),
  );
  expect(new Set(hits.map((hit) => hit.resetTime!.getTime())).size).toBe(1);
  expect((await auth.increment("203.0.113.42")).totalHits).toBe(1);
  const keys = await sql.query<{ key: string }>(
    "select key from public.request_rate_limits",
  );
  expect(keys.rows.every((row) => /^[a-f0-9]{64}$/.test(row.key))).toBe(true);
  expect(JSON.stringify(keys.rows)).not.toContain("203.0.113.42");
});
it("starts a new window after expiry and bounds expired counter cleanup", async () => {
  await sql.query(
    "update public.request_rate_limits set reset_at=now()-interval '2 hours'",
  );
  const hit = await first.increment("203.0.113.42");
  expect(hit.totalHits).toBe(1);
  expect(hit.resetTime!.getTime()).toBeGreaterThan(Date.now());
  expect(
    (await sql.query("select * from public.request_rate_limits")).rows.length,
  ).toBe(1);
  await first.decrement("203.0.113.42");
  await first.decrement("203.0.113.42");
  expect((await first.increment("203.0.113.42")).totalHits).toBe(1);
  await second.resetKey("203.0.113.42");
  expect((await first.increment("203.0.113.42")).totalHits).toBe(1);
});
it("denies counter access to browser roles", async () => {
  for (const role of ["anon", "authenticated"]) {
    await sql.exec(`set role ${role}`);
    await expect(
      sql.query("select * from public.request_rate_limits"),
    ).rejects.toThrow(/permission denied/);
    await expect(
      sql.query("delete from public.request_rate_limits"),
    ).rejects.toThrow(/permission denied/);
    await sql.exec("reset role");
  }
});
