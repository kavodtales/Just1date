import { afterAll, beforeAll, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";

let db: PGlite;
let setup: string;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; grant usage on schema auth to authenticated,service_role;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql stable as $$select (current_setting('request.jwt.claims',true)::jsonb->>'sub')::uuid$$;
    grant execute on function auth.uid() to public;
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create schema realtime;
    create table realtime.messages(id bigint,extension text);
    alter table realtime.messages enable row level security;
    create function realtime.topic() returns text language sql as $$select current_setting('realtime.topic',true)$$;
    create publication supabase_realtime;
  `);
  setup = await readFile("supabase/setup/production.sql", "utf8");
  await db.exec(setup);
});
afterAll(async () => db?.close());

it("installs the complete schema and matches authoritative migration checksums", async () => {
  const ledger = await db.query<{ name: string; checksum: string }>(
    "select name,checksum from public.schema_migrations order by name",
  );
  const names = (await readdir("supabase/migrations"))
    .filter((n) => n.endsWith(".sql"))
    .sort();
  expect(ledger.rows.map((r) => r.name)).toEqual(names);
  for (const row of ledger.rows) {
    const source = (
      await readFile(`supabase/migrations/${row.name}`, "utf8")
    ).replace(/\r\n/g, "\n");
    expect(row.checksum).toBe(
      createHash("sha256").update(source).digest("hex"),
    );
  }
  const tables = await db.query(
    "select tablename from pg_tables where schemaname='public'",
  );
  expect(tables.rows).toHaveLength(57);
  expect(
    (
      await db.query(
        "select tablename from pg_tables where schemaname='public' and not rowsecurity",
      )
    ).rows,
  ).toEqual([]);
});
it("is safe to run twice without duplicate seed rows or migrations", async () => {
  const before = await db.query("select count(*) from public.interests");
  await db.exec(setup);
  expect(
    (await db.query("select count(*) from public.interests")).rows,
  ).toEqual(before.rows);
  expect(
    (await db.query("select name from public.schema_migrations")).rows,
  ).toHaveLength(9);
});
it("configures private storage, realtime publication, and private broadcast policies", async () => {
  const buckets = await db.query<{
    public: boolean;
    allowed_mime_types: string[];
    file_size_limit: number;
  }>("select * from storage.buckets");
  expect(buckets.rows).toHaveLength(2);
  for (const bucket of buckets.rows) {
    expect(bucket.public).toBe(false);
    expect(Number(bucket.file_size_limit)).toBe(5242880);
    expect(bucket.allowed_mime_types).toEqual(["image/jpeg"]);
  }
  expect(
    (
      await db.query(
        "select tablename from pg_publication_tables where pubname='supabase_realtime'",
      )
    ).rows,
  ).toHaveLength(4);
  expect(
    (
      await db.query(
        "select policyname from pg_policies where schemaname='realtime'",
      )
    ).rows,
  ).toHaveLength(2);
});
it("denies public access to the migration ledger and rejects modified migrations", async () => {
  expect(
    (
      await db.query<{ allowed: boolean }>(
        "select has_table_privilege('anon','public.schema_migrations','select') allowed",
      )
    ).rows[0].allowed,
  ).toBe(false);
  expect(
    (
      await db.query<{ allowed: boolean }>(
        "select has_table_privilege('authenticated','public.schema_migrations','select') allowed",
      )
    ).rows[0].allowed,
  ).toBe(false);
  await db.exec(
    "update public.schema_migrations set checksum='tampered' where name='202610060001_core.sql'",
  );
  await expect(db.exec(setup)).rejects.toThrow("checksum mismatch");
  await db.exec("rollback");
});
