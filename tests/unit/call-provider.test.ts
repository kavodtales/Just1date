import { createHash } from "node:crypto";
import { it, expect } from "vitest";
import { AccessToken } from "livekit-server-sdk";
import { LiveKitProvider } from "../../apps/api/src/modules/calls/provider";
import { envSchema } from "../../apps/api/src/config";
const key = "video-test-api-key",
  secret = "video-test-secret-at-least-thirty-two-characters";
it("authenticates real LiveKit webhook body hashes and rejects tampering", async () => {
  const provider = new LiveKitProvider("wss://test.livekit.cloud", key, secret);
  const body = JSON.stringify({
    event: "room_finished",
    id: "EV_test",
    room: { name: "j1d-test" },
  });
  const token = new AccessToken(key, secret, { ttl: 60 });
  token.sha256 = createHash("sha256").update(body).digest("base64");
  const jwt = await token.toJwt();
  expect((await provider.webhook(body, jwt)).room?.name).toBe("j1d-test");
  await expect(
    provider.webhook(body.replace("j1d-test", "j1d-other"), jwt),
  ).rejects.toThrow();
  await expect(provider.webhook(body)).rejects.toThrow();
});
it("rejects production video configuration without secure Cloud revocation", () => {
  const base = {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://test",
    SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_ANON_KEY: "test",
    SUPABASE_SERVICE_ROLE_KEY: "test",
    APP_URL: "http://localhost:3000",
    ADMIN_URL: "http://localhost:3001",
    CORS_ORIGINS: "http://localhost:3000",
    VIDEO_CALLS_ENABLED: "true",
  };
  expect(envSchema.safeParse(base).success).toBe(false);
  expect(
    envSchema.safeParse({
      ...base,
      LIVEKIT_URL: "not-a-url",
      LIVEKIT_API_KEY: key,
      LIVEKIT_API_SECRET: secret,
    }).success,
  ).toBe(false);
  expect(
    envSchema.safeParse({
      ...base,
      LIVEKIT_URL: "wss://key:secret@test.livekit.cloud",
      LIVEKIT_API_KEY: key,
      LIVEKIT_API_SECRET: secret,
    }).success,
  ).toBe(false);
  expect(
    envSchema.safeParse({
      ...base,
      LIVEKIT_URL: "ws://test",
      LIVEKIT_API_KEY: key,
      LIVEKIT_API_SECRET: secret,
    }).success,
  ).toBe(false);
  expect(
    envSchema.safeParse({
      ...base,
      LIVEKIT_URL: "wss://test.livekit.cloud",
      LIVEKIT_API_KEY: key,
      LIVEKIT_API_SECRET: secret,
    }).success,
  ).toBe(true);
});
