export function migrationConnection(env: Record<string, string | undefined>) {
  const value = env.DATABASE_MIGRATION_URL || env.DATABASE_URL;
  if (!value)
    throw new Error("DATABASE_MIGRATION_URL or DATABASE_URL is required.");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("A valid PostgreSQL migration connection is required.");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol))
    throw new Error("A PostgreSQL migration connection is required.");
  if (url.hostname.endsWith(".pooler.supabase.com") && url.port === "6543")
    throw new Error(
      "Use the direct database or session pooler (port 5432) for migrations. Transaction pooling cannot preserve the migration advisory lock.",
    );
  return value;
}
