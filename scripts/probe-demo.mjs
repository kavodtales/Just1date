import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const fetch = globalThis.fetch;
const web = process.env.PROBE_WEB_URL || "https://just1date.vercel.app";
let count = 0;
function check(condition, label) {
  assert.ok(condition, label);
  console.log(`PASS ${++count}: ${label}`);
}
async function call(cookie, body, origin = web) {
  const r = await fetch(`${web}/api/demo`, {
    method: body ? "POST" : "GET",
    headers: {
      ...(body ? { "Content-Type": "application/json", Origin: origin } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return {
    status: r.status,
    data: await r.json(),
    cookie: r.headers.get("set-cookie"),
  };
}
const first = await call(null, { action: "start" });
check(first.status === 201, "preview starts without registration");
check(first.data.data.profiles.length === 4, "exactly four fictional profiles");
check(
  !JSON.stringify(first.data).includes('"token"'),
  "session token stays outside browser-readable JSON",
);
check(
  /HttpOnly/i.test(first.cookie) && /SameSite=lax/i.test(first.cookie),
  "demo session uses a private SameSite cookie",
);
if (web.startsWith("https:"))
  check(/Secure/i.test(first.cookie), "hosted demo cookie is secure");
const cookie = first.cookie.split(";")[0],
  id = first.data.data.profiles[0].id;
check(
  (
    await call(
      cookie,
      { action: "like", profile_id: id },
      "https://untrusted.example",
    )
  ).status === 403,
  "cross-origin writes are denied",
);
check((await call(null)).status === 401, "state requires its demo session");
check(
  (await call(cookie, { action: "like", profile_id: randomUUID() })).status ===
    404,
  "non-demo profiles cannot be targeted",
);
const liked = await call(cookie, { action: "like", profile_id: id });
check(
  liked.data.data.state.likes.includes(id),
  "liking a profile creates a sample connection",
);
const message = {
  action: "message",
  profile_id: id,
  client_id: randomUUID(),
  body: "I would choose a quiet bookshop and coffee.",
};
const sent = await call(cookie, message);
check(
  sent.data.data.state.messages[id].length === 3,
  "message and scripted reply are persisted",
);
check(
  (await call(cookie, message)).data.data.state.messages[id].length === 3,
  "retrying a message does not duplicate it",
);
check(
  (await call(cookie)).data.data.state.messages[id][1].body === message.body,
  "messages survive a subsequent request",
);
check(
  (await call(cookie, { action: "start" })).data.data.state.likes.includes(id),
  "returning to the preview resumes existing state",
);
const second = await call(null, { action: "start" });
check(
  second.data.data.state.likes.length === 0,
  "a separate visitor has isolated demo state",
);
const dateProposal = {
  action: "date-propose",
  profile_id: id,
  operation_id: randomUUID(),
  activity: "coffee",
  venue: "Fictional public café · test plan",
  starts_at: new Date(Date.now() + 86400000).toISOString(),
  note: "Fictional integration check; no invitation or booking.",
};
const proposed = await call(cookie, dateProposal);
check(
  proposed.status === 200 && proposed.data.data.state.dates.length === 1,
  "fictional date plan persists through the real service",
);
check(
  (await call(cookie, dateProposal)).data.data.state.dates.length === 1,
  "retrying a date proposal is idempotent",
);
const response = {
  action: "date-respond",
  profile_id: id,
  plan_id: dateProposal.operation_id,
  response: "accept",
  revision: 0,
};
check(
  (await call(cookie, response)).status === 400,
  "demo response cannot omit the explicit simulation flag",
);
check(
  (await call(cookie, { ...response, simulated: true })).data.data.state
    .dates[0].status === "accepted",
  "explicitly simulated acceptance persists",
);
check(
  (await call(cookie)).data.data.state.dates[0].status === "accepted",
  "date plan survives a subsequent request",
);
check(
  (await call(second.cookie.split(";")[0])).data.data.state.dates.length === 0,
  "date plans remain isolated between visitors",
);
check(
  (
    await call(cookie, {
      ...response,
      response: "cancel",
      revision: 1,
      simulated: true,
    })
  ).data.data.state.dates[0].status === "cancelled",
  "fictional date can be cancelled",
);
const filtered = await call(cookie, { action: "filter", gender: "woman" });
check(filtered.data.data.state.gender === "woman", "preferences are saved");
const reset = await call(cookie, { action: "reset" });
check(
  reset.data.data.state.likes.length === 0 &&
    reset.data.data.state.dates.length === 0 &&
    Object.keys(reset.data.data.state.messages).length === 0,
  "reset clears only this visitor’s demo activity",
);
console.log(`${count} live demo checks passed.`);
