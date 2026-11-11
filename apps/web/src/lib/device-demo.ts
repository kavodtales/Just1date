import { z } from "zod";
import { demoActionSchema } from "@just1date/validation";
import type { DatePlan } from "@just1date/types";

export type DemoProfile = {
  id: string;
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
};
export type DemoMessage = {
  id: string;
  body: string;
  sender: "you" | "sample";
  at: string;
};
export type DemoData = {
  profiles: DemoProfile[];
  state: {
    dates?: DatePlan[];
    likes: string[];
    passes: string[];
    messages: Record<string, DemoMessage[]>;
    gender: string;
  };
};
const people = [
  [
    "d1111111-1111-4111-8111-111111111111",
    "Amara",
    28,
    "woman",
    "Lagos",
    "Designer",
    "amara",
  ],
  [
    "d2222222-2222-4222-8222-222222222222",
    "Tomi",
    31,
    "man",
    "Abuja",
    "Architect",
    "tomi",
  ],
  [
    "d3333333-3333-4333-8333-333333333333",
    "Zara",
    27,
    "woman",
    "Lagos",
    "Creative strategist",
    "zara",
  ],
  [
    "d4444444-4444-4444-8444-444444444444",
    "Daniel",
    30,
    "man",
    "Port Harcourt",
    "Engineer",
    "daniel",
  ],
] as const;
const profiles: DemoProfile[] = people.map(
  ([id, name, age, gender, city, profession, photo]) => ({
    id,
    name,
    age,
    gender,
    city,
    profession,
    image: `/images/editorial/${photo}.webp`,
    bio: "A fictional adult created for this preview. I enjoy thoughtful conversations, shared interests and making time for a good first date.",
    interests: ["Travel", "Coffee", "Art"],
    values_list: ["Kindness", "Honesty"],
    prompt: "My perfect Sunday",
    answer:
      "A slow morning, a gallery visit and dinner with friends. This profile is fictional.",
  }),
);
const profileId = z.enum(people.map((p) => p[0]));
const dateSchema = z.object({
  id: z.uuid(),
  match_id: profileId,
  proposer_id: z.literal("demo_you"),
  activity: z.enum(["coffee", "dinner", "gallery", "walk"]),
  venue: z.string().min(3).max(160),
  starts_at: z.iso.datetime({ offset: true }),
  note: z.string().max(500),
  status: z.enum(["proposed", "accepted", "declined", "cancelled"]),
  revision: z.number().int().nonnegative(),
  created_at: z.iso.datetime(),
  is_sender: z.literal(true),
  other_name: z.string().max(30),
});
const stateSchema = z.object({
  dates: z.array(dateSchema).max(20),
  likes: z.array(profileId).max(4),
  passes: z.array(profileId).max(4),
  messages: z.partialRecord(
    profileId,
    z
      .array(
        z.object({
          id: z.uuid(),
          body: z.string().min(1).max(1000),
          sender: z.enum(["you", "sample"]),
          at: z.iso.datetime(),
        }),
      )
      .max(101),
  ),
  gender: z.enum(["everyone", "woman", "man"]),
});
export const deviceDemoKey = "just1date:fictional-device-demo:v1";
const lifetime = 86400000;
export function newDeviceDemo(): DemoData {
  return {
    profiles,
    state: {
      dates: [],
      likes: [],
      passes: [],
      messages: {},
      gender: "everyone",
    },
  };
}
export function readDeviceDemo(
  raw: string | null,
  now = Date.now(),
): { data: DemoData; expires: number } | undefined {
  if (!raw || raw.length > 500000) return;
  try {
    const envelope = z
      .object({
        version: z.literal(1),
        expires: z.number(),
        state: stateSchema,
      })
      .parse(JSON.parse(raw));
    if (envelope.expires <= now || envelope.expires > now + lifetime) return;
    return {
      data: { profiles, state: envelope.state as DemoData["state"] },
      expires: envelope.expires,
    };
  } catch {
    return;
  }
}
export function writeDeviceDemo(data: DemoData, expires: number) {
  return JSON.stringify({
    version: 1,
    expires,
    state: stateSchema.parse(data.state),
  });
}
export function deviceDemoExpiry(now = Date.now()) {
  return now + lifetime;
}

/** Only fictional, explicitly opted-in preview activity. No network or member data. */
export function updateDeviceDemo(
  data: DemoData,
  input: Record<string, unknown>,
  now = Date.now(),
): DemoData {
  const parsed = demoActionSchema.safeParse(input);
  if (!parsed.success)
    throw new Error("Check your demo message or invitation details.");
  const action = parsed.data;
  const next = structuredClone(data),
    state = next.state;
  state.dates ??= [];
  if (action.action === "reset") return newDeviceDemo();
  if (action.action === "filter") {
    state.gender = action.gender;
    return next;
  }
  const profile = profiles.find((p) => p.id === action.profile_id);
  if (!profile) throw new Error("Choose one of the four fictional profiles.");
  if (action.action === "like") {
    if (!state.likes.includes(profile.id)) {
      state.likes.push(profile.id);
      state.passes = state.passes.filter((id) => id !== profile.id);
      state.messages[profile.id] = [
        {
          id: crypto.randomUUID(),
          body: `Hi! I’m ${profile.name}. This is a scripted sample conversation. What is your ideal first date?`,
          sender: "sample",
          at: new Date(now).toISOString(),
        },
      ];
    }
  } else if (action.action === "pass") {
    if (!state.likes.includes(profile.id) && !state.passes.includes(profile.id))
      state.passes.push(profile.id);
  } else {
    if (!state.likes.includes(profile.id))
      throw new Error(
        "Like this fictional profile before trying messages or dates.",
      );
    if (action.action === "message") {
      const messages = (state.messages[profile.id] ??= []);
      const previous = messages.find((m) => m.id === action.client_id);
      if (previous && previous.body !== action.body)
        throw new Error(
          "This demo message was already used with different text.",
        );
      if (!previous) {
        if (messages.length >= 101)
          throw new Error("Reset this preview to start a fresh conversation.");
        const at = new Date(now).toISOString();
        messages.push(
          { id: action.client_id, body: action.body, sender: "you", at },
          {
            id: crypto.randomUUID(),
            body: "That sounds lovely. This reply is scripted; no real person receives messages in this preview.",
            sender: "sample",
            at,
          },
        );
      }
    } else if (action.action === "date-propose") {
      const previous = state.dates.find((d) => d.id === action.operation_id);
      if (
        previous &&
        (previous.match_id !== profile.id ||
          previous.activity !== action.activity ||
          previous.venue !== action.venue ||
          previous.starts_at !== action.starts_at ||
          previous.note !== action.note)
      )
        throw new Error(
          "This demo invitation was already used with different details.",
        );
      if (!previous) {
        const time = Date.parse(action.starts_at);
        if (time < now + 15 * 60000 || time > now + 90 * lifetime)
          throw new Error(
            "Choose a time between 15 minutes and 90 days from now.",
          );
        if (state.dates.length >= 20)
          throw new Error("Reset this preview to try more invitations.");
        state.dates.push({
          id: action.operation_id,
          match_id: profile.id,
          proposer_id: "demo_you",
          activity: action.activity,
          venue: action.venue,
          starts_at: action.starts_at,
          note: action.note,
          status: "proposed",
          revision: 0,
          created_at: new Date(now).toISOString(),
          is_sender: true,
          other_name: profile.name,
        });
      }
    } else {
      const plan = state.dates.find(
        (d) => d.id === action.plan_id && d.match_id === profile.id,
      );
      if (!plan) throw new Error("Choose an existing fictional invitation.");
      const target =
        action.response === "accept"
          ? "accepted"
          : action.response === "decline"
            ? "declined"
            : "cancelled";
      if (plan.status !== target) {
        if (
          plan.revision !== action.revision ||
          (action.response === "cancel"
            ? !["proposed", "accepted"].includes(plan.status)
            : plan.status !== "proposed")
        )
          throw new Error("This demo invitation has already changed.");
        plan.status = target;
        plan.revision++;
      }
    }
  }
  return next;
}
