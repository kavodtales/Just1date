import { beforeAll, afterAll, it, expect } from "vitest";
import request from "supertest";
import sharp from "sharp";
import { PGlite } from "@electric-sql/pglite";
import { readdir, readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import type { Database } from "@just1date/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createApp } from "../../apps/api/src/application";
import { envSchema } from "../../apps/api/src/config";

let sql: PGlite, app: ReturnType<typeof createApp>, photo: Buffer;
const admin = randomUUID(),
  member = randomUUID(),
  moderator = randomUUID();
const objects = new Map<string, Buffer>();
let uploads = 0,
  failStorage = false;
beforeAll(async () => {
  sql = new PGlite();
  await sql.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;grant usage on schema auth to authenticated,service_role;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb);create function auth.uid() returns uuid language sql stable as $$select (current_setting('request.jwt.claims',true)::jsonb->>'sub')::uuid$$;grant execute on function auth.uid() to public;`,
  );
  for (const f of (await readdir("supabase/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await sql.exec(await readFile(`supabase/migrations/${f}`, "utf8"));
  for (const id of [admin, member, moderator])
    await sql.query("insert into auth.users values($1,$2,now(),$3)", [
      id,
      `${id}@example.test`,
      JSON.stringify({ date_of_birth: "1995-01-01" }),
    ]);
  await sql.query(
    "insert into public.admin_users(user_id,role) values($1,'ADMIN'),($2,'MODERATOR')",
    [admin, moderator],
  );
  const wrap = (tx: any): Database => ({
    query: async <T>(q: string, args?: unknown[]) =>
      (await tx.query(q, args)) as { rows: T[] },
    transaction: async <T>(
      actor: string | null,
      work: (db: Database) => Promise<T>,
    ) =>
      sql.transaction(async (t) => {
        await t.query("select set_config('request.jwt.claims',$1,true)", [
          JSON.stringify({ sub: actor }),
        ]);
        await t.exec("set local role service_role");
        return work(wrap(t));
      }),
  });
  const storage = {
    storage: {
      from: (bucket: string) => {
        expect(bucket).toBe("app-images");
        return {
          upload: async (key: string, body: Buffer) => {
            uploads++;
            if (failStorage) return { error: new Error("storage down") };
            objects.set(key, body);
            return { error: null };
          },
          remove: async (keys: string[]) => {
            keys.forEach((k) => objects.delete(k));
            return { error: null };
          },
          createSignedUrl: async (key: string) => ({
            data: { signedUrl: `https://media.example.test/${key}` },
            error: null,
          }),
        };
      },
    },
  } as unknown as SupabaseClient;
  const config = envSchema.parse({
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://unused",
    SUPABASE_URL: "http://localhost:54321",
    SUPABASE_ANON_KEY: "test-public-key",
    SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
    APP_URL: "http://localhost:3000",
    ADMIN_URL: "http://localhost:3001",
    CORS_ORIGINS: "http://localhost:3000",
  });
  app = createApp({
    db: wrap(sql),
    auth: storage,
    config: { ...config, NODE_ENV: "production" },
    authenticate: (req, res, next) => {
      const id = req.header("x-test-user");
      if (!id) {
        res.status(401).json({ error: { code: "UNAUTHENTICATED" } });
        return;
      }
      req.actor = {
        id,
        email: "staff@example.test",
        aal: req.header("x-test-aal") ?? "aal2",
      };
      next();
    },
  });
  photo = await sharp({
    create: { width: 500, height: 600, channels: 3, background: "#df3594" },
  })
    .png()
    .toBuffer();
});
afterAll(async () => sql?.close());
it("exposes only published image projections without member authentication", async () => {
  const r = await request(app).get("/v1/app-media");
  expect(r.status).toBe(200);
  expect(r.body.data).toHaveLength(3);
  expect(
    r.body.data.every(
      (x: any) =>
        x.url === null && !("storage_key" in x) && !("updated_by" in x),
    ),
  ).toBe(true);
});
it("denies unauthenticated, non-settings staff and AAL1 uploads before storage writes", async () => {
  const before = uploads;
  for (const actor of [undefined, member, moderator]) {
    let r = request(app)
      .post("/v1/admin/app-media/welcome_matches?revision=0&alt=Test%20photo")
      .set("Content-Type", "image/png");
    if (actor) r = r.set("x-test-user", actor);
    expect((await r.send(photo)).status).toBe(actor ? 403 : 401);
  }
  expect(
    (
      await request(app)
        .get("/v1/admin/app-media")
        .set("x-test-user", admin)
        .set("x-test-aal", "aal1")
    ).body.error.code,
  ).toBe("MFA_REQUIRED");
  expect(uploads).toBe(before);
});
it("validates real image bytes, converts PNG to metadata-free JPEG and audits publication", async () => {
  const bad = await request(app)
    .post("/v1/admin/app-media/welcome_matches?revision=0&alt=New%20portrait")
    .set("x-test-user", admin)
    .set("Content-Type", "image/png")
    .send(Buffer.from("not an image"));
  expect(bad.status).toBe(400);
  const r = await request(app)
    .post("/v1/admin/app-media/welcome_matches?revision=0&alt=New%20portrait")
    .set("x-test-user", admin)
    .set("Content-Type", "image/png")
    .send(photo);
  expect(r.status).toBe(201);
  expect(r.body.data.revision).toBe(1);
  expect(objects.size).toBe(1);
  const meta = await sharp([...objects.values()][0]).metadata();
  expect(meta.format).toBe("jpeg");
  expect(meta.exif).toBeUndefined();
  const publicRows = (await request(app).get("/v1/app-media")).body.data;
  expect(
    publicRows.find((r: any) => r.slot === "welcome_matches").alt_text,
  ).toBe("New portrait");
  expect(JSON.stringify(publicRows)).not.toContain("storage_key");
  expect(
    (
      await sql.query(
        "select action from public.audit_logs where action='app_image_published'",
      )
    ).rows,
  ).toHaveLength(1);
});
it("rejects stale publication, removes its unused upload and preserves the live image", async () => {
  const key = [...objects.keys()][0];
  const r = await request(app)
    .post("/v1/admin/app-media/welcome_matches?revision=0&alt=Stale%20portrait")
    .set("x-test-user", admin)
    .set("Content-Type", "image/png")
    .send(photo);
  expect(r.status).toBe(409);
  expect(r.body.error.code).toBe("MEDIA_CONFLICT");
  expect([...objects.keys()]).toEqual([key]);
});
it("leaves the current revision unchanged when storage is unavailable", async () => {
  failStorage = true;
  try {
    const r = await request(app)
      .post("/v1/admin/app-media/welcome_matches?revision=1&alt=New%20portrait")
      .set("x-test-user", admin)
      .set("Content-Type", "image/png")
      .send(photo);
    expect(r.status).toBe(503);
  } finally {
    failStorage = false;
  }
  expect(
    (
      await sql.query<{ revision: number }>(
        "select revision from public.app_media_slots where slot='welcome_matches'",
      )
    ).rows[0].revision,
  ).toBe(1);
});
it("restores the original photo with an audit record and denies direct client RPC/table access", async () => {
  const r = await request(app)
    .post("/v1/admin/app-media/welcome_matches/reset")
    .set("x-test-user", admin)
    .send({ revision: 1 });
  expect(r.status).toBe(200);
  expect(r.body.data.url).toBeNull();
  expect(r.body.data.revision).toBe(2);
  expect(objects.size).toBe(0);
  for (const role of ["anon", "authenticated"]) {
    expect(
      (
        await sql.query<{ allowed: boolean }>(
          "select has_table_privilege($1,'public.app_media_slots','select') allowed",
          [role],
        )
      ).rows[0].allowed,
    ).toBe(false);
    expect(
      (
        await sql.query<{ allowed: boolean }>(
          "select has_function_privilege($1,'public.rpc_admin_publish_media(text,integer,text,text)','execute') allowed",
          [role],
        )
      ).rows[0].allowed,
    ).toBe(false);
  }
  expect(
    (
      await sql.query(
        "select action from public.audit_logs where action='app_image_reset'",
      )
    ).rows,
  ).toHaveLength(1);
});
