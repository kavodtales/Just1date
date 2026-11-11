import { describe, expect, it } from "vitest";
import {
  deviceDemoExpiry,
  newDeviceDemo,
  readDeviceDemo,
  updateDeviceDemo,
  writeDeviceDemo,
} from "../../apps/web/src/lib/device-demo";
const now = Date.parse("2026-11-11T12:00:00Z");
const id = "d1111111-1111-4111-8111-111111111111";
const messageId = "77777777-7777-4777-8777-777777777777";
const planId = "88888888-8888-4888-8888-888888888888";
const connected = () =>
  updateDeviceDemo(newDeviceDemo(), { action: "like", profile_id: id }, now);
const proposal = {
  action: "date-propose",
  profile_id: id,
  operation_id: planId,
  activity: "coffee",
  venue: "Fictional public café",
  starts_at: new Date(now + 86400000).toISOString(),
  note: "Fictional preview only",
};
describe("explicit device-only fictional demo", () => {
  it("restores bounded tab state with the original expiry and rejects corrupt/expired data", () => {
    const data = connected(),
      expires = deviceDemoExpiry(now);
    const stored = writeDeviceDemo(data, expires);
    expect(readDeviceDemo(stored, now + 1000)).toEqual({ data, expires });
    expect(readDeviceDemo(stored, expires)).toBeUndefined();
    expect(readDeviceDemo("broken", now)).toBeUndefined();
    expect(
      readDeviceDemo(
        JSON.stringify({
          version: 1,
          expires,
          state: { ...data.state, dates: [{}] },
        }),
        now,
      ),
    ).toBeUndefined();
    expect(
      readDeviceDemo(writeDeviceDemo(data, expires + 1), now),
    ).toBeUndefined();
  });
  it("only supports its four fictional adults and does not mutate the previous state", () => {
    const first = newDeviceDemo(),
      next = updateDeviceDemo(first, { action: "like", profile_id: id }, now);
    expect(first.state.likes).toEqual([]);
    expect(next.state.likes).toEqual([id]);
    expect(
      next.profiles.every((p) => p.age >= 21 && p.image.endsWith(".webp")),
    ).toBe(true);
    expect(() =>
      updateDeviceDemo(next, { action: "like", profile_id: messageId }, now),
    ).toThrow("four fictional");
  });
  it("requires a connection and deduplicates explicit messages without hiding conflicting retries", () => {
    const input = {
      action: "message",
      profile_id: id,
      client_id: messageId,
      body: "A gallery sounds lovely.",
    };
    expect(() => updateDeviceDemo(newDeviceDemo(), input, now)).toThrow(
      "Like this fictional",
    );
    const next = updateDeviceDemo(connected(), input, now);
    expect(next.state.messages[id]).toHaveLength(3);
    expect(next.state.messages[id][2].body).toContain("scripted");
    expect(updateDeviceDemo(next, input, now)).toEqual(next);
    expect(() =>
      updateDeviceDemo(next, { ...input, body: "Changed" }, now),
    ).toThrow("different text");
  });
  it("requires explicit simulated consent and optimistic revisions for date responses", () => {
    expect(() => updateDeviceDemo(newDeviceDemo(), proposal, now)).toThrow(
      "Like this fictional",
    );
    const next = updateDeviceDemo(connected(), proposal, now);
    expect(updateDeviceDemo(next, proposal, now)).toEqual(next);
    expect(() =>
      updateDeviceDemo(next, { ...proposal, venue: "Changed venue" }, now),
    ).toThrow("different details");
    const response = {
      action: "date-respond",
      profile_id: id,
      plan_id: planId,
      response: "accept",
      revision: 0,
    };
    expect(() => updateDeviceDemo(next, response, now)).toThrow();
    const accepted = updateDeviceDemo(
      next,
      { ...response, simulated: true },
      now,
    );
    expect(accepted.state.dates?.[0].status).toBe("accepted");
    expect(() =>
      updateDeviceDemo(
        accepted,
        { ...response, response: "cancel", simulated: true },
        now,
      ),
    ).toThrow("already changed");
    const ended = updateDeviceDemo(
      accepted,
      { ...response, response: "cancel", revision: 1, simulated: true },
      now,
    );
    expect(ended.state.dates?.[0].status).toBe("cancelled");
  });
  it("enforces dates, message limits, filters and a complete reset", () => {
    expect(() =>
      updateDeviceDemo(
        connected(),
        { ...proposal, starts_at: new Date(now).toISOString() },
        now,
      ),
    ).toThrow("15 minutes");
    let data = connected();
    for (let i = 0; i < 50; i++)
      data = updateDeviceDemo(
        data,
        {
          action: "message",
          profile_id: id,
          client_id: crypto.randomUUID(),
          body: "Fictional message",
        },
        now,
      );
    expect(() =>
      updateDeviceDemo(
        data,
        {
          action: "message",
          profile_id: id,
          client_id: messageId,
          body: "One more",
        },
        now,
      ),
    ).toThrow("fresh conversation");
    expect(
      updateDeviceDemo(data, { action: "filter", gender: "woman" }, now).state
        .gender,
    ).toBe("woman");
    expect(updateDeviceDemo(data, { action: "reset" }, now)).toEqual(
      newDeviceDemo(),
    );
  });
});
