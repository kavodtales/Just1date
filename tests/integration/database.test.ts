import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
let db: PGlite;
const a = randomUUID(),
  b = randomUUID(),
  c = randomUUID();
async function actor<T>(
  id: string,
  sql: string,
  args: unknown[] = [],
  role = "service_role",
): Promise<T> {
  await db.exec("begin");
  try {
    await db.query("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify({ sub: id }),
    ]);
    await db.exec(`set local role ${role}`);
    const r = await db.query<{ data: T }>(sql, args);
    await db.exec("commit");
    return r.rows[0]?.data;
  } catch (e) {
    await db.exec("rollback");
    throw e;
  }
}
const profile = {
  display_name: "Test member",
  gender: "woman",
  city: "Lagos",
  bio: "A development test profile for integration checks.",
  profession: "Engineer",
  education: "University",
  goal: "serious",
  values: ["kindness"],
  communication: "thoughtful",
  personality: ["curious"],
  lifestyle: { smoking: "no" },
  interests: ["travel", "reading", "music"],
  prompts: [],
};
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;grant usage on schema auth to authenticated,service_role;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb);create function auth.uid() returns uuid language sql stable as $$select (current_setting('request.jwt.claims',true)::jsonb->>'sub')::uuid$$;grant execute on function auth.uid() to public;`,
  );
  for (const f of (await readdir("supabase/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(await readFile(`supabase/migrations/${f}`, "utf8"));
  for (const id of [a, b, c]) {
    await db.query("insert into auth.users values($1,$2,now(),$3)", [
      id,
      `${id}@example.test`,
      JSON.stringify({ date_of_birth: "1995-01-01" }),
    ]);
    await actor(id, "select public.rpc_save_profile($1) data", [
      JSON.stringify(profile),
    ]);
    await db.query(
      "insert into public.profile_photos(user_id,storage_key,position,moderation_status,mime,size_bytes) values($1,$2,0,'approved','image/jpeg',1024)",
      [id, `${id}/test.jpg`],
    );
    await actor(id, "select public.rpc_save_profile($1) data", [
      JSON.stringify(profile),
    ]);
  }
});
afterAll(async () => {
  await db?.close();
});
describe("production migrations and workflows", () => {
  it("enables RLS on every application table", async () => {
    const r = await db.query<{ relname: string }>(
      "select relname from pg_class join pg_namespace n on n.oid=relnamespace where n.nspname='public' and relkind='r' and not relrowsecurity",
    );
    expect(r.rows).toEqual([]);
  });
  it("rejects underage and missing DOB at the auth trigger", async () => {
    await expect(
      db.query(
        "insert into auth.users values($1,'child@example.test',null,$2)",
        [randomUUID(), JSON.stringify({ date_of_birth: "2015-01-01" })],
      ),
    ).rejects.toThrow("AGE_REQUIREMENT");
    await expect(
      db.query(
        "insert into auth.users values($1,'missing@example.test',null,'{}')",
        [randomUUID()],
      ),
    ).rejects.toThrow("AGE_REQUIREMENT");
  });
  it("isolates private user rows and denies direct writes/RPC to client roles", async () => {
    const me = await actor<string>(
      a,
      "select id::text data from public.users",
      [],
      "authenticated",
    );
    expect(me).toBe(a);
    await expect(
      actor(
        a,
        "update public.users set status='ACTIVE' where id=$1 returning id data",
        [b],
        "authenticated",
      ),
    ).rejects.toThrow();
    await expect(
      actor(
        a,
        "select public.rpc_save_profile($1) data",
        [JSON.stringify(profile)],
        "authenticated",
      ),
    ).rejects.toThrow();
    await expect(
      actor(
        a,
        "select public.settle_payment('x',1,'NGN','x') data",
        [],
        "authenticated",
      ),
    ).rejects.toThrow();
  });
  it("creates one match/conversation on reciprocal likes and deduplicates retries", async () => {
    const op = randomUUID();
    const first = await actor<any>(
      a,
      "select public.rpc_interact($1,$2,$3) data",
      [b, op, "like"],
    );
    expect(first.matched).toBe(false);
    const second = await actor<any>(
      b,
      "select public.rpc_interact($1,$2,$3) data",
      [a, randomUUID(), "like"],
    );
    expect(second.matched).toBe(true);
    const replay = await actor<any>(
      a,
      "select public.rpc_interact($1,$2,$3) data",
      [b, op, "like"],
    );
    expect(replay.match_id).toBe(second.match_id);
    expect(
      (await db.query("select * from public.conversations")).rows,
    ).toHaveLength(1);
  });
  it("authorizes chat and prevents replay into another conversation", async () => {
    const cid = (
      await db.query<{ id: string }>("select id from public.conversations")
    ).rows[0].id;
    const payload = {
      body: "Hello from a real SQL test",
      client_id: randomUUID(),
    };
    const one = await actor<any>(
      a,
      "select public.rpc_send_message($1,$2) data",
      [cid, JSON.stringify(payload)],
    );
    const replay = await actor<any>(
      a,
      "select public.rpc_send_message($1,$2) data",
      [cid, JSON.stringify(payload)],
    );
    expect(replay.id).toBe(one.id);
    await expect(
      actor(c, "select public.rpc_messages($1) data", [cid]),
    ).rejects.toThrow("CONVERSATION_UNAVAILABLE");
    expect(
      await actor<any>(
        c,
        "select coalesce(jsonb_agg(id),'[]') data from public.messages",
        [],
        "authenticated",
      ),
    ).toEqual([]);
    expect(
      await actor<any>(
        b,
        "select coalesce(jsonb_agg(id),'[]') data from public.messages",
        [],
        "authenticated",
      ),
    ).toHaveLength(1);
  });
  it("revokes both participants chat access immediately after blocking", async () => {
    const cid = (
      await db.query<{ id: string }>("select id from public.conversations")
    ).rows[0].id;
    await actor(a, "select public.rpc_block($1) data", [b]);
    await expect(
      actor(b, "select public.rpc_messages($1) data", [cid]),
    ).rejects.toThrow("CONVERSATION_UNAVAILABLE");
    expect(
      await actor<any>(
        b,
        "select coalesce(jsonb_agg(id),'[]') data from public.messages",
        [],
        "authenticated",
      ),
    ).toEqual([]);
    await expect(
      actor(a, "select public.rpc_interact($1,$2,$3) data", [
        b,
        randomUUID(),
        "like",
      ]),
    ).rejects.toThrow("PROFILE_UNAVAILABLE");
  });
  it("settles a payment once, checks amount/currency and snapshots period length", async () => {
    await db.exec(
      "update public.subscription_plans set amount_minor=10000,purchasable=true where code='plus'",
    );
    const plan = (
      await db.query<{ id: string }>(
        "select id from public.subscription_plans where code='plus'",
      )
    ).rows[0].id;
    const payment = await actor<any>(
      c,
      "select public.rpc_start_payment($1,$2) data",
      [plan, randomUUID()],
    );
    await expect(
      db.query("select public.settle_payment($1,1,'NGN','bad')", [
        payment.reference,
      ]),
    ).rejects.toThrow("PAYMENT_MISMATCH");
    await db.query("select public.settle_payment($1,10000,'NGN','event-1')", [
      payment.reference,
    ]);
    const repeat = await db.query<any>(
      "select public.settle_payment($1,10000,'NGN','event-1') data",
      [payment.reference],
    );
    expect(repeat.rows[0].data.duplicate).toBe(true);
    expect(
      (await db.query("select * from public.subscriptions")).rows,
    ).toHaveLength(1);
    expect(
      (await actor<any>(c, "select public.rpc_me() data")).entitlements
        .see_likes,
    ).toBe(true);
    await actor(c, "select public.rpc_cancel_subscription() data");
    expect(
      (await actor<any>(c, "select public.rpc_me() data")).entitlements
        .see_likes,
    ).toBe(true);
  });
  it("does not restore daily quota or recreate a match when an old like is replayed after unmatching", async () => {
    const [d, e, f] = [randomUUID(), randomUUID(), randomUUID()];
    for (const id of [d, e, f]) {
      await db.query("insert into auth.users values($1,$2,now(),$3)", [
        id,
        `${id}@example.test`,
        JSON.stringify({ date_of_birth: "1995-01-01" }),
      ]);
      await db.query("update public.users set status='ACTIVE' where id=$1", [
        id,
      ]);
      await db.query(
        "update public.profiles set display_name='Test member',gender='woman',city='Lagos',goal='serious' where user_id=$1",
        [id],
      );
    }
    await db.exec(
      "update public.subscription_plans set entitlements=jsonb_set(entitlements,'{daily_likes}','1') where code='free'",
    );
    try {
      const operation = randomUUID();
      await actor(d, "select public.rpc_interact($1,$2,'like') data", [
        e,
        operation,
      ]);
      const match = await actor<any>(
        e,
        "select public.rpc_interact($1,$2,'like') data",
        [d, randomUUID()],
      );
      await actor(d, "select public.rpc_unmatch($1) data", [match.match_id]);
      const replay = await actor<any>(
        d,
        "select public.rpc_interact($1,$2,'like') data",
        [e, operation],
      );
      expect(replay.matched).toBe(false);
      await expect(
        actor(d, "select public.rpc_interact($1,$2,'like') data", [
          f,
          randomUUID(),
        ]),
      ).rejects.toThrow("DAILY_LIMIT");
      const ledger = await db.query(
        "select * from public.interaction_operations where user_id=$1 and charged",
        [d],
      );
      expect(ledger.rows).toHaveLength(1);
    } finally {
      await db.exec(
        "update public.subscription_plans set entitlements=jsonb_set(entitlements,'{daily_likes}','15') where code='free'",
      );
    }
  });
  it("rejects non-admin moderation and audits a permitted moderator", async () => {
    await expect(
      actor(a, "select public.rpc_admin_queue() data"),
    ).rejects.toThrow("ADMIN_FORBIDDEN");
    await db.query(
      "insert into public.admin_users(user_id,role) values($1,'MODERATOR')",
      [a],
    );
    await actor(a, "select public.rpc_admin_moderate($1) data", [
      JSON.stringify({
        user_id: c,
        action: "suspend",
        reason: "Integration test review decision",
      }),
    ]);
    expect(
      (await db.query("select * from public.admin_actions")).rows,
    ).toHaveLength(1);
    await expect(actor(c, "select public.rpc_me() data")).rejects.toThrow(
      "ACCOUNT_UNAVAILABLE",
    );
    expect(
      await actor(
        c,
        "select coalesce(jsonb_agg(id),'[]') data from public.users",
        [],
        "authenticated",
      ),
    ).toEqual([]);
    expect(
      await actor(
        c,
        "select coalesce(jsonb_agg(id),'[]') data from public.payments",
        [],
        "authenticated",
      ),
    ).toEqual([]);
  });
  it("revokes old-session private reads as soon as account deletion is requested", async () => {
    await actor(b, "select public.rpc_deletion() data");
    expect(
      await actor(
        b,
        "select coalesce(jsonb_agg(user_id),'[]') data from public.profiles",
        [],
        "authenticated",
      ),
    ).toEqual([]);
    await expect(actor(b, "select public.rpc_me() data")).rejects.toThrow(
      "ACCOUNT_UNAVAILABLE",
    );
  });
});
