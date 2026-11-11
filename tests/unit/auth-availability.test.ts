import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const provider = vi.hoisted(() => ({ recovery: vi.fn(), login: vi.fn() }));
vi.mock("../../apps/web/src/lib/supabase-server", () => ({
  configured: () => true,
  supabaseServer: async () => ({
    auth: {
      resetPasswordForEmail: provider.recovery,
      signInWithPassword: provider.login,
    },
  }),
}));
import { POST } from "../../apps/web/src/app/api/auth/route";
const req = (mode = "recovery") =>
  new NextRequest("https://app.example.test/api/auth", {
    method: "POST",
    headers: {
      Origin: "https://app.example.test",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mode,
      email: "fictional@example.com",
      ...(mode === "login" ? { password: "sample-password" } : {}),
    }),
  });
beforeEach(() => vi.clearAllMocks());
it.each([0, 503])(
  "reports provider outages (%s) without pretending a recovery email was sent",
  async (status) => {
    provider.recovery.mockResolvedValue({
      error: { status, message: "Private infrastructure detail" },
    });
    const response = await POST(req());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error:
        "Recovery services are temporarily unavailable. Please try again later.",
    });
  },
);
it("preserves non-enumerating recovery feedback for account-specific rejections", async () => {
  provider.recovery.mockResolvedValue({
    error: { status: 400, code: "user_not_found" },
  });
  expect((await POST(req())).status).toBe(200);
});
it("asks rate-limited visitors to wait instead of claiming a recovery email was sent", async () => {
  provider.recovery.mockResolvedValue({ error: { status: 429 } });
  expect((await POST(req())).status).toBe(429);
});
it("distinguishes an unavailable sign-in provider from invalid credentials", async () => {
  provider.login.mockResolvedValue({ error: { status: 0 } });
  expect((await POST(req("login"))).status).toBe(503);
  provider.login.mockResolvedValue({ error: { status: 400 } });
  expect((await POST(req("login"))).status).toBe(400);
});
