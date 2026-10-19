import { it, expect } from "vitest";
import { migrationConnection } from "../../packages/database/src/migration-url";
it("rejects the transaction pooler for session-locked schema migrations", () => {
  expect(() =>
    migrationConnection({
      DATABASE_URL:
        "postgresql://test:unused@aws-0-eu-west-1.pooler.supabase.com:6543/postgres",
    }),
  ).toThrow("Transaction pooling");
  const session =
    "postgresql://test:unused@aws-0-eu-west-1.pooler.supabase.com:5432/postgres";
  expect(
    migrationConnection({
      DATABASE_MIGRATION_URL: session,
      DATABASE_URL: "postgresql://unused@localhost",
    }),
  ).toBe(session);
  expect(() =>
    migrationConnection({
      DATABASE_URL: "https://example.test/private-password",
    }),
  ).toThrow("PostgreSQL migration connection");
});
