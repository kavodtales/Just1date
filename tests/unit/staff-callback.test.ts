import { expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("../../apps/web/src/lib/supabase-server", () => ({
  supabaseServer: async () => ({
    auth: { exchangeCodeForSession: async () => ({ error: null }) },
  }),
}));
import { GET } from "../../apps/admin/src/app/auth/callback/route";
it("opens staff password recovery after a valid code exchange", async () => {
  const result = await GET(
    new NextRequest(
      "https://staff.example.test/auth/callback?code=fixture&next=/auth/reset",
    ),
  );
  expect(result.headers.get("location")).toBe(
    "https://staff.example.test/auth/reset",
  );
});
it("does not follow a supplied external redirect after staff sign-in", async () => {
  const result = await GET(
    new NextRequest(
      "https://staff.example.test/auth/callback?code=fixture&next=https://untrusted.example.test",
    ),
  );
  expect(result.headers.get("location")).toBe("https://staff.example.test/");
});
