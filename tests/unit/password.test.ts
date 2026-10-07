import { afterEach, expect, it, vi } from "vitest";
import { updateMemberPassword } from "../../apps/api/src/modules/account";
import { envSchema } from "../../apps/api/src/config";
const config = envSchema.parse({
  DATABASE_URL: "postgresql://unused",
  SUPABASE_URL: "http://localhost:54321",
  SUPABASE_ANON_KEY: "public-test-key",
  SUPABASE_SERVICE_ROLE_KEY: "private-test-key",
  APP_URL: "http://localhost:3000",
  ADMIN_URL: "http://localhost:3001",
  CORS_ORIGINS: "http://localhost:3000",
});
afterEach(() => vi.unstubAllGlobals());
it("preserves provider reauthentication by changing a password with member authority", async () => {
  const provider = vi
    .fn()
    .mockResolvedValue(new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", provider);
  await updateMemberPassword(config, "Bearer validated-member-token", {
    password: "a-strong-new-password",
    nonce: "reauth-nonce",
  });
  const [url, request] = provider.mock.calls[0];
  expect(url).toBe("http://localhost:54321/auth/v1/user");
  expect(request.headers.Authorization).toBe("Bearer validated-member-token");
  expect(request.headers.apikey).toBe("public-test-key");
  expect(JSON.stringify(request)).not.toContain("private-test-key");
  expect(JSON.parse(request.body).nonce).toBe("reauth-nonce");
});
it("does not override a provider rejection with administrator privileges", async () => {
  const provider = vi
    .fn()
    .mockResolvedValue(new Response("{}", { status: 401 }));
  vi.stubGlobal("fetch", provider);
  await expect(
    updateMemberPassword(config, "Bearer expired-token", {
      password: "a-strong-new-password",
    }),
  ).rejects.toMatchObject({ code: "PASSWORD_UPDATE_FAILED" });
  expect(provider).toHaveBeenCalledTimes(1);
});
