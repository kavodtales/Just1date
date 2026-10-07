import { expect, it } from "vitest";
import { envSchema } from "../../apps/api/src/config";

const production = {
  NODE_ENV: "production",
  DATABASE_URL:
    "postgresql://postgres:placeholder@db.example.test:6543/postgres",
  DATABASE_SSL: "true",
  SUPABASE_URL: "https://project.example.test",
  SUPABASE_ANON_KEY: "public-placeholder",
  SUPABASE_SERVICE_ROLE_KEY: "private-placeholder",
  APP_URL: "https://members.example.test",
  ADMIN_URL: "https://staff.example.test",
  CORS_ORIGINS: "https://members.example.test,https://staff.example.test",
  REDIS_URL: "rediss://default:placeholder@redis.example.test:6379",
};
it("requires database TLS and validates optional Redis TLS before production startup", () => {
  expect(envSchema.safeParse(production).success).toBe(true);
  for (const change of [
    { REDIS_URL: "https://redis.example.test" },
    { REDIS_URL: "redis://redis.example.test" },
    { DATABASE_SSL: "false" },
    { DATABASE_URL: "https://db.example.test" },
  ])
    expect(envSchema.safeParse({ ...production, ...change }).success).toBe(
      false,
    );
  expect(envSchema.safeParse({ ...production, REDIS_URL: "" }).success).toBe(
    true,
  );
});
it("requires exact HTTPS deployment origins and a complete CORS allowlist", () => {
  for (const change of [
    { APP_URL: "http://localhost:3000" },
    { APP_URL: "invalid-url" },
    { ADMIN_URL: "https://staff.example.test/" },
    { CORS_ORIGINS: "*" },
    { CORS_ORIGINS: "https://members.example.test" },
    {
      CORS_ORIGINS: "https://members.example.test, https://staff.example.test",
    },
  ])
    expect(envSchema.safeParse({ ...production, ...change }).success).toBe(
      false,
    );
  expect(
    envSchema.safeParse({
      ...production,
      NODE_ENV: "development",
      APP_URL: "http://localhost:3000",
      ADMIN_URL: "http://localhost:3001",
      REDIS_URL: "",
      DATABASE_SSL: "false",
    }).success,
  ).toBe(true);
});
