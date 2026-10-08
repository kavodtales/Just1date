import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { Router, type RequestHandler } from "express";
import { z } from "zod";
import type { Database } from "@just1date/database";
import { AppError, ok } from "../lib/http";

export type DemoProfile = {
  id: string;
  slot: number;
  name: string;
  age: number;
  gender: string;
  city: string;
  profession: string;
  bio: string;
  interests: string[];
  values_list: string[];
  prompt: string;
  answer: string;
  image: string;
  sample_reply?: string;
  removed_at?: string | null;
};
export type DemoMessage = {
  id: string;
  body: string;
  sender: "you" | "sample";
  at: string;
};
export type DemoState = {
  likes: string[];
  passes: string[];
  messages: Record<string, DemoMessage[]>;
  gender: "everyone" | "woman" | "man";
};
const empty = (): DemoState => ({
  likes: [],
  passes: [],
  messages: {},
  gender: "everyone",
});
const ttl = 24 * 60 * 60;
export class DemoService {
  constructor(
    private db: Database,
    private secret: string,
  ) {}
  sign(id: string, exp: number) {
    const payload = `${id}.${exp}`;
    return `${payload}.${createHmac("sha256", this.secret).update(`demo:${payload}`).digest("base64url")}`;
  }
  verify(token: string) {
    if (token.length > 180) return undefined;
    const match = /^([a-f0-9-]{36})\.(\d{10})\.([A-Za-z0-9_-]{43})$/.exec(
      token,
    );
    if (
      !match ||
      !z.uuid().safeParse(match[1]).success ||
      Number(match[2]) <= Math.floor(Date.now() / 1000)
    )
      return undefined;
    const expected = Buffer.from(
      this.sign(match[1], Number(match[2])).split(".")[2],
    );
    const actual = Buffer.from(match[3]);
    return actual.length === expected.length &&
      timingSafeEqual(actual, expected)
      ? match[1]
      : undefined;
  }
  middleware: RequestHandler = (req, _res, next) => {
    const token = req.get("X-Demo-Session");
    if (token) {
      const id = this.verify(token);
      if (!id)
        return next(
          new AppError(
            "DEMO_SESSION_EXPIRED",
            401,
            "Your demo session has expired. Start a new preview.",
          ),
        );
      req.demoSession = id;
    }
    next();
  };
  async profiles(tx: Database) {
    const rows = (
      await tx.query<DemoProfile>(
        "select * from public.demo_profiles where removed_at is null order by slot",
      )
    ).rows;
    if (rows.length !== 4)
      throw new AppError(
        "DEMO_DISABLED",
        410,
        "The preview has ended. Create an account to meet real members.",
      );
    return rows;
  }
  publicProfiles(profiles: DemoProfile[]) {
    return profiles.map(
      ({ sample_reply: _reply, removed_at: _removed, ...profile }) => profile,
    );
  }
  async start() {
    return this.db.transaction(null, async (tx) => {
      // A shared lock makes removing demo data atomic with session creation/actions.
      await tx.query(
        "select slot from public.demo_profiles order by slot for share",
      );
      const profiles = await this.profiles(tx);
      await tx.query(
        "delete from public.demo_sessions where id in (select id from public.demo_sessions where expires_at <= now() limit 100)",
      );
      const id = randomUUID(),
        exp = Math.floor(Date.now() / 1000) + ttl;
      await tx.query(
        "insert into public.demo_sessions(id,expires_at) values($1,to_timestamp($2))",
        [id, exp],
      );
      return {
        token: this.sign(id, exp),
        maxAge: ttl,
        profiles: this.publicProfiles(profiles),
        state: empty(),
      };
    });
  }
  async state(id: string, action?: z.infer<typeof actionSchema>) {
    return this.db.transaction(null, async (tx) => {
      await tx.query(
        "select slot from public.demo_profiles order by slot for share",
      );
      const profiles = await this.profiles(tx);
      const row = (
        await tx.query<{ state: DemoState }>(
          "select state from public.demo_sessions where id=$1 and expires_at>now() for update",
          [id],
        )
      ).rows[0];
      if (!row)
        throw new AppError(
          "DEMO_SESSION_EXPIRED",
          401,
          "Your demo session has expired. Start a new preview.",
        );
      const state = row.state;
      if (action) {
        if (action.action === "reset") Object.assign(state, empty());
        else if (action.action === "filter") state.gender = action.gender;
        else {
          const p = profiles.find((p) => p.id === action.profile_id);
          if (!p)
            throw new AppError(
              "DEMO_PROFILE_UNAVAILABLE",
              404,
              "Choose one of the four demo profiles.",
            );
          if (action.action === "like") {
            if (!state.likes.includes(p.id)) {
              state.likes.push(p.id);
              state.passes = state.passes.filter((id) => id !== p.id);
              state.messages[p.id] = [
                {
                  id: randomUUID(),
                  body: `Hi! I’m ${p.name}. This is a sample conversation — tell me about your ideal first date.`,
                  sender: "sample",
                  at: new Date().toISOString(),
                },
              ];
            }
          } else if (action.action === "pass") {
            if (!state.passes.includes(p.id) && !state.likes.includes(p.id))
              state.passes.push(p.id);
          } else if (action.action === "message") {
            if (!state.likes.includes(p.id))
              throw new AppError(
                "DEMO_MATCH_REQUIRED",
                409,
                "Like this profile to try a conversation.",
              );
            const messages = state.messages[p.id];
            const previous = messages.find((m) => m.id === action.client_id);
            if (previous && previous.body !== action.body)
              throw new AppError(
                "IDEMPOTENCY_CONFLICT",
                409,
                "This message was already sent with different text.",
              );
            if (!previous) {
              if (messages.length >= 101)
                throw new AppError(
                  "DEMO_MESSAGE_LIMIT",
                  429,
                  "Reset the preview to start a fresh conversation.",
                );
              const at = new Date().toISOString();
              messages.push({
                id: action.client_id,
                body: action.body,
                sender: "you",
                at,
              });
              messages.push({
                id: randomUUID(),
                body:
                  messages.length > 2
                    ? "That sounds lovely! These replies are scripted for the preview. Create an account to start a conversation with a real person."
                    : p.sample_reply!,
                sender: "sample",
                at,
              });
            }
          }
        }
        await tx.query(
          "update public.demo_sessions set state=$2::jsonb where id=$1",
          [id, JSON.stringify(state)],
        );
      }
      return { profiles: this.publicProfiles(profiles), state };
    });
  }
  async admin(actor: string, action?: "remove" | "restore") {
    return this.db.transaction(actor, async (tx) => {
      await tx.query("select public.require_admin('settings')");
      if (action) {
        await tx.query(
          "select slot from public.demo_profiles order by slot for update",
        );
        await tx.query(
          `update public.demo_profiles set removed_at=${action === "remove" ? "now()" : "null"}`,
        );
        await tx.query("delete from public.demo_sessions");
        await tx.query(
          "insert into public.audit_logs(actor_id,action,metadata) values($1,$2,$3::jsonb)",
          [
            actor,
            `demo_${action}`,
            JSON.stringify({ profiles: 4, scope: "fictional_demo_only" }),
          ],
        );
      }
      const profiles = (
        await tx.query<DemoProfile>(
          "select slot,id,name,age,gender,city,image,removed_at from public.demo_profiles order by slot",
        )
      ).rows;
      return { profiles, active: profiles.filter((p) => !p.removed_at).length };
    });
  }
}
const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("like"), profile_id: z.uuid() }).strict(),
  z.object({ action: z.literal("pass"), profile_id: z.uuid() }).strict(),
  z
    .object({
      action: z.literal("message"),
      profile_id: z.uuid(),
      client_id: z.uuid(),
      body: z.string().trim().min(1).max(1000),
    })
    .strict(),
  z
    .object({
      action: z.literal("filter"),
      gender: z.enum(["everyone", "woman", "man"]),
    })
    .strict(),
  z.object({ action: z.literal("reset") }).strict(),
]);
export function demoRoutes(demo: DemoService) {
  const r = Router();
  r.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  r.post("/session", async (req, res) => {
    if (req.demoSession) {
      try {
        return ok(res, await demo.state(req.demoSession));
      } catch (e) {
        if (!(e instanceof AppError) || e.code !== "DEMO_SESSION_EXPIRED")
          throw e;
      }
    }
    ok(res, await demo.start(), 201);
  });
  r.use((req, _res, next) =>
    req.demoSession
      ? next()
      : next(
          new AppError(
            "DEMO_SESSION_EXPIRED",
            401,
            "Start a preview to continue.",
          ),
        ),
  );
  r.get("/state", async (req, res) =>
    ok(res, await demo.state(req.demoSession!)),
  );
  r.post("/action", async (req, res) =>
    ok(res, await demo.state(req.demoSession!, actionSchema.parse(req.body))),
  );
  return r;
}
