import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const provider = vi.hoisted(() => ({
  configured: vi.fn(() => true),
  getUser: vi.fn(),
  listFactors: vi.fn(),
  enroll: vi.fn(),
  challengeAndVerify: vi.fn(),
}));
vi.mock("../../apps/web/src/lib/supabase-server", () => ({
  configured: provider.configured,
  supabaseServer: async () => ({
    auth: {
      getUser: provider.getUser,
      mfa: {
        listFactors: provider.listFactors,
        enroll: provider.enroll,
        challengeAndVerify: provider.challengeAndVerify,
      },
    },
  }),
}));
import { GET, POST } from "../../apps/admin/src/app/api/mfa/route";
const id = "64d4b812-8f1b-4f9f-8e37-93e851a58974";
const req = (body: unknown, origin = "https://staff.example.test") =>
  new NextRequest("https://staff.example.test/api/mfa", {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.clearAllMocks();
  provider.configured.mockReturnValue(true);
  provider.getUser.mockResolvedValue({
    error: null,
    data: { user: { id, email_confirmed_at: "2026-10-07T00:00:00Z" } },
  });
});
it("rejects cross-origin enrollment before contacting the authentication provider", async () => {
  const result = await POST(
    req({ action: "enroll" }, "https://untrusted.example.test"),
  );
  expect(result.status).toBe(403);
  expect(provider.getUser).not.toHaveBeenCalled();
  expect(provider.enroll).not.toHaveBeenCalled();
});
it("rejects unconfirmed enrollment and unauthenticated factor listing", async () => {
  provider.getUser.mockResolvedValue({
    error: null,
    data: { user: { id, email_confirmed_at: null } },
  });
  expect((await POST(req({ action: "enroll" }))).status).toBe(401);
  expect(provider.enroll).not.toHaveBeenCalled();
  provider.getUser.mockResolvedValue({
    error: new Error("expired"),
    data: { user: null },
  });
  expect((await GET()).status).toBe(401);
  expect(provider.listFactors).not.toHaveBeenCalled();
});
it("upgrades using the member's authenticator while keeping session tokens off the response", async () => {
  provider.challengeAndVerify.mockResolvedValue({
    error: null,
    data: { access_token: "private-session-token" },
  });
  const result = await POST(
    req({ action: "verify", factor_id: id, code: "123456" }),
  );
  expect(result.status).toBe(200);
  expect(provider.challengeAndVerify).toHaveBeenCalledWith({
    factorId: id,
    code: "123456",
  });
  expect(await result.json()).toEqual({ verified: true });
  expect(result.headers.get("cache-control")).toBe("no-store");
});
it("does not expose provider errors or accept malformed authentication codes", async () => {
  expect(
    (await POST(req({ action: "verify", factor_id: id, code: "123" }))).status,
  ).toBe(400);
  expect(provider.challengeAndVerify).not.toHaveBeenCalled();
  provider.challengeAndVerify.mockResolvedValue({
    error: new Error("private-provider-detail"),
  });
  const result = await POST(
    req({ action: "verify", factor_id: id, code: "123456" }),
  );
  expect(result.status).toBe(400);
  expect(await result.text()).not.toContain("private-provider-detail");
});
