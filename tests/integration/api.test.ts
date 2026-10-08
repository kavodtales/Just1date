import { beforeAll, afterAll, it, expect } from "vitest";
import request from "supertest";
import { PGlite } from "@electric-sql/pglite";
import { createClient } from "@supabase/supabase-js";
import { readFile, readdir } from "node:fs/promises";
import { randomUUID, createHmac } from "node:crypto";
import { createApp } from "../../apps/api/src/app";
import type { Database } from "@just1date/database";
import { envSchema } from "../../apps/api/src/config";
import {
  validPaystackSignature,
  type PaymentProvider,
} from "../../apps/api/src/modules/payments/provider";
let sql: PGlite, app: ReturnType<typeof createApp>, cid: string;
const a = randomUUID(),
  b = randomUUID(),
  stranger = randomUUID(),
  secret = "test-webhook-key";
let payment: any;
beforeAll(async () => {
  sql = new PGlite();
  await sql.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;grant usage on schema auth to authenticated,service_role;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb);create function auth.uid() returns uuid language sql stable as $$select (current_setting('request.jwt.claims',true)::jsonb->>'sub')::uuid$$;grant execute on function auth.uid() to public;`,
  );
  for (const f of (await readdir("supabase/migrations"))
    .filter((x) => x.endsWith(".sql"))
    .sort())
    await sql.exec(await readFile(`supabase/migrations/${f}`, "utf8"));
  for (const id of [a, b, stranger]) {
    await sql.query("insert into auth.users values($1,$2,now(),$3)", [
      id,
      `${id}@example.test`,
      JSON.stringify({ date_of_birth: "1995-01-01" }),
    ]);
    await sql.query("update public.users set status='ACTIVE' where id=$1", [
      id,
    ]);
    await sql.query(
      "update public.profiles set display_name='Test member',gender='woman',city='Lagos',goal='serious' where user_id=$1",
      [id],
    );
  }
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
  const provider: PaymentProvider = {
    validSignature: (body, sig) => validPaystackSignature(body, sig, secret),
    initialize: async (input) =>
      `https://checkout.paystack.com/${input.reference}`,
    verify: async (reference) => ({
      reference,
      amount: Number(payment.amount_minor),
      currency: payment.currency,
      status: "success",
    }),
  };
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
    auth: createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY),
    config,
    payments: provider,
    authenticate: (req, res, next) => {
      const id = req.get("Authorization")?.slice(7);
      if (![a, b, stranger].includes(id ?? ""))
        return res.status(401).json({ error: { code: "UNAUTHENTICATED" } });
      req.actor = { id: id!, email: `${id}@example.test`, aal: "aal1" };
      next();
    },
  });
});
afterAll(async () => {
  await sql?.close();
});

it("provides exactly four fictional profiles and isolates persistent demo sessions from real members", async () => {
  const before = (await sql.query("select count(*) from public.users")).rows;
  const first = await request(app).post("/v1/demo/session");
  const second = await request(app).post("/v1/demo/session");
  expect(first.status).toBe(201);
  expect(first.body.data.profiles).toHaveLength(4);
  expect(new Set(first.body.data.profiles.map((p: any) => p.id)).size).toBe(4);
  const token = first.body.data.token,
    target = first.body.data.profiles[0].id;
  expect((await request(app).get("/v1/demo/state")).status).toBe(401);
  expect(
    (
      await request(app)
        .get("/v1/demo/state")
        .set("X-Demo-Session", token.slice(0, -1) + "!")
    ).status,
  ).toBe(401);
  expect(
    (await request(app).get("/v1/matches").auth(token, { type: "bearer" }))
      .status,
  ).toBe(401);
  expect(
    (
      await request(app)
        .post("/v1/demo/action")
        .set("X-Demo-Session", token)
        .send({
          action: "message",
          profile_id: target,
          client_id: randomUUID(),
          body: "Hello",
        })
    ).status,
  ).toBe(409);
  expect(
    (
      await request(app)
        .post("/v1/demo/action")
        .set("X-Demo-Session", token)
        .send({ action: "like", profile_id: a })
    ).status,
  ).toBe(404);
  const liked = await request(app)
    .post("/v1/demo/action")
    .set("X-Demo-Session", token)
    .send({ action: "like", profile_id: target });
  expect(liked.body.data.state.likes).toEqual([target]);
  const twice = await request(app)
    .post("/v1/demo/action")
    .set("X-Demo-Session", token)
    .send({ action: "like", profile_id: target });
  expect(twice.body.data.state.messages[target]).toHaveLength(1);
  const input = {
    action: "message",
    profile_id: target,
    client_id: randomUUID(),
    body: "A bookshop and coffee sounds great.",
  };
  const sent = await request(app)
    .post("/v1/demo/action")
    .set("X-Demo-Session", token)
    .send(input);
  expect(sent.body.data.state.messages[target]).toHaveLength(3);
  expect(sent.body.data.state.messages[target][1].body).toBe(input.body);
  expect(sent.body.data.state.messages[target][2].sender).toBe("sample");
  const retried = await request(app)
    .post("/v1/demo/action")
    .set("X-Demo-Session", token)
    .send(input);
  expect(retried.body.data.state.messages[target]).toHaveLength(3);
  expect(
    (
      await request(app)
        .post("/v1/demo/action")
        .set("X-Demo-Session", token)
        .send({ ...input, body: "Different text" })
    ).status,
  ).toBe(409);
  const isolated = await request(app)
    .get("/v1/demo/state")
    .set("X-Demo-Session", second.body.data.token);
  expect(isolated.body.data.state.likes).toEqual([]);
  expect(isolated.body.data.state.messages).toEqual({});
  const resumed = await request(app)
    .post("/v1/demo/session")
    .set("X-Demo-Session", token);
  expect(resumed.body.data.state.messages[target]).toHaveLength(3);
  expect(resumed.body.data.token).toBeUndefined();
  expect((await sql.query("select count(*) from public.users")).rows).toEqual(
    before,
  );
  await sql.query(
    "update public.demo_sessions set expires_at=now()-interval '1 second' where id=$1",
    [token.split(".")[0]],
  );
  expect(
    (await request(app).get("/v1/demo/state").set("X-Demo-Session", token))
      .status,
  ).toBe(401);
});

it("requires staff settings permission to remove only demo data, and restores the same four profiles", async () => {
  expect(
    (await request(app).get("/v1/admin/demo").auth(a, { type: "bearer" }))
      .status,
  ).toBe(403);
  await sql.query(
    "insert into public.admin_users(user_id,role) values($1,'MODERATOR')",
    [a],
  );
  expect(
    (
      await request(app)
        .post("/v1/admin/demo")
        .auth(a, { type: "bearer" })
        .send({ action: "remove" })
    ).status,
  ).toBe(403);
  await sql.query(
    "update public.admin_users set role='ADMIN' where user_id=$1",
    [a],
  );
  const before = (
    await sql.query("select id,status from public.users order by id")
  ).rows;
  const listed = await request(app)
    .get("/v1/admin/demo")
    .auth(a, { type: "bearer" });
  expect(listed.body.data.active).toBe(4);
  const ids = listed.body.data.profiles.map((p: any) => p.id);
  const removed = await request(app)
    .post("/v1/admin/demo")
    .auth(a, { type: "bearer" })
    .send({ action: "remove" });
  expect(removed.body.data.active).toBe(0);
  expect((await request(app).post("/v1/demo/session")).status).toBe(410);
  expect(
    (await sql.query("select id,status from public.users order by id")).rows,
  ).toEqual(before);
  const restored = await request(app)
    .post("/v1/admin/demo")
    .auth(a, { type: "bearer" })
    .send({ action: "restore" });
  expect(restored.body.data.active).toBe(4);
  expect(restored.body.data.profiles.map((p: any) => p.id)).toEqual(ids);
  expect(
    (
      await sql.query(
        "select action from public.audit_logs where action in ('demo_remove','demo_restore')",
      )
    ).rows,
  ).toHaveLength(2);
  await sql.query("delete from public.admin_users where user_id=$1", [a]);
});

it("rejects unauthenticated requests and produces valid OpenAPI without credentials", async () => {
  expect((await request(app).get("/v1/matches")).status).toBe(401);
  const doc = await request(app).get("/openapi.json");
  expect(doc.status).toBe(200);
  expect(
    doc.body.paths["/conversations/{id}/messages"].post.requestBody,
  ).toBeDefined();
  expect(JSON.stringify(doc.body)).not.toContain(secret);
});
it("returns private data only to its validated actor and validates profile fields", async () => {
  const me = await request(app)
    .get("/v1/profiles/me")
    .auth(a, { type: "bearer" });
  expect(me.body.data.user_id).toBe(a);
  const bad = await request(app)
    .patch("/v1/profiles/me")
    .auth(a, { type: "bearer" })
    .send({ user_id: b, status: "ACTIVE" });
  expect(bad.status).toBe(400);
  expect(bad.body.error.request_id).toBeDefined();
  expect(JSON.stringify(bad.body)).not.toContain("stack");
});
it("executes discovery → reciprocal likes → one match → chat through REST", async () => {
  const page = await request(app)
    .get("/v1/profiles/discover")
    .auth(a, { type: "bearer" });
  expect(page.status).toBe(200);
  expect(page.body.data.items.map((x: any) => x.user_id)).toContain(b);
  const op = randomUUID();
  expect(
    (
      await request(app)
        .post("/v1/likes")
        .auth(a, { type: "bearer" })
        .send({ target_id: b, operation_id: op })
    ).body.data.matched,
  ).toBe(false);
  const match = await request(app)
    .post("/v1/likes")
    .auth(b, { type: "bearer" })
    .send({ target_id: a, operation_id: randomUUID() });
  expect(match.body.data.matched).toBe(true);
  cid = match.body.data.conversation_id;
  const body = {
    body: "Hello, what are you reading lately?",
    client_id: randomUUID(),
  };
  const sent = await request(app)
    .post(`/v1/conversations/${cid}/messages`)
    .auth(a, { type: "bearer" })
    .send(body);
  expect(sent.status).toBe(201);
  const again = await request(app)
    .post(`/v1/conversations/${cid}/messages`)
    .auth(a, { type: "bearer" })
    .send(body);
  expect(again.body.data.id).toBe(sent.body.data.id);
  expect(
    (
      await request(app)
        .get(`/v1/conversations/${cid}/messages`)
        .auth(stranger, { type: "bearer" })
    ).status,
  ).toBe(404);
});
it("returns authorized inbox previews and counts unread messages until acknowledged", async () => {
  const inbox = await request(app)
    .get("/v1/conversations")
    .auth(b, { type: "bearer" });
  expect(inbox.status).toBe(200);
  expect(inbox.body.data).toHaveLength(1);
  expect(inbox.body.data[0].last_message.body).toBe(
    "Hello, what are you reading lately?",
  );
  expect(inbox.body.data[0].unread_count).toBe(1);
  expect(inbox.body.data[0].profile.photo_keys).toBeUndefined();
  expect(
    (
      await request(app)
        .get("/v1/conversations")
        .auth(stranger, { type: "bearer" })
    ).body.data,
  ).toEqual([]);
  await request(app)
    .post(`/v1/conversations/${cid}/read`)
    .auth(b, { type: "bearer" });
  expect(
    (await request(app).get("/v1/conversations").auth(b, { type: "bearer" }))
      .body.data[0].unread_count,
  ).toBe(0);
  expect(
    (
      await request(app)
        .get("/v1/conversations?before=2026-10-06T10:00:00Z")
        .auth(b, { type: "bearer" })
    ).status,
  ).toBe(400);
});
it("rejects spoofed payment webhooks and deduplicates a verified payment", async () => {
  await sql.exec(
    "update public.subscription_plans set amount_minor=12000,purchasable=true where code='plus'",
  );
  const plan = (
    await sql.query<{ id: string }>(
      "select id from public.subscription_plans where code='plus'",
    )
  ).rows[0].id;
  const initialized = await request(app)
    .post("/v1/payments/initialize")
    .auth(a, { type: "bearer" })
    .set("Idempotency-Key", randomUUID())
    .send({ plan_id: plan });
  expect(initialized.status).toBe(200);
  payment = (await sql.query("select * from public.payments")).rows[0];
  const body = JSON.stringify({
    event: "charge.success",
    data: { reference: payment.reference },
  });
  expect(
    (
      await request(app)
        .post("/v1/payments/webhook")
        .set("Content-Type", "application/json")
        .set("x-paystack-signature", "wrong")
        .send(body)
    ).status,
  ).toBe(401);
  const sig = createHmac("sha512", secret).update(body).digest("hex");
  for (let i = 0; i < 2; i++)
    expect(
      (
        await request(app)
          .post("/v1/payments/webhook")
          .set("Content-Type", "application/json")
          .set("x-paystack-signature", sig)
          .send(body)
      ).status,
    ).toBe(200);
  expect(
    (await sql.query("select * from public.subscriptions")).rows,
  ).toHaveLength(1);
  expect(
    (
      await request(app)
        .post("/v1/subscriptions/cancel")
        .auth(a, { type: "bearer" })
    ).status,
  ).toBe(200);
});
it("reports and blocks through REST, then revokes chat access", async () => {
  const report = await request(app)
    .post("/v1/reports")
    .auth(a, { type: "bearer" })
    .send({
      target_id: b,
      category: "spam",
      details: "A development test report for human review.",
    });
  expect(report.status).toBe(201);
  expect(
    (
      await request(app)
        .post("/v1/blocks")
        .auth(a, { type: "bearer" })
        .send({ target_id: b })
    ).status,
  ).toBe(200);
  expect(
    (
      await request(app)
        .get(`/v1/conversations/${cid}/messages`)
        .auth(b, { type: "bearer" })
    ).status,
  ).toBe(404);
});
it("excludes blocked matches and message previews from both members' inboxes", async () => {
  for (const member of [a, b])
    expect(
      (
        await request(app)
          .get("/v1/conversations")
          .auth(member, { type: "bearer" })
      ).body.data,
    ).toEqual([]);
});
it("records date sessions but rejects unsupported emergency or location promises", async () => {
  const input = {
    person_name: "Test date",
    venue: "Public cafe",
    starts_at: "2026-10-08T15:00:00Z",
    ends_at: "2026-10-08T17:00:00Z",
    location_consent: false,
  };
  const session = await request(app)
    .post("/v1/safety/sessions")
    .auth(a, { type: "bearer" })
    .send(input);
  expect(session.status).toBe(201);
  expect(
    (
      await request(app)
        .post(`/v1/safety/sessions/${session.body.data.id}/check_in`)
        .auth(stranger, { type: "bearer" })
    ).status,
  ).toBe(404);
  expect(
    (
      await request(app)
        .post("/v1/safety/sessions")
        .auth(a, { type: "bearer" })
        .send({ ...input, location_consent: true })
    ).status,
  ).toBe(503);
});

it("limits validated members independently behind the same proxy", async () => {
  const results = await Promise.all(
    Array.from({ length: 121 }, () =>
      request(app).get("/v1/profiles/me").auth(stranger, { type: "bearer" }),
    ),
  );
  expect(results.some((result) => result.status === 429)).toBe(true);
  expect(results.every((result) => [200, 429].includes(result.status))).toBe(
    true,
  );
  const other = await request(app)
    .get("/v1/profiles/me")
    .auth(a, { type: "bearer" });
  expect(other.status).toBe(200);
});
