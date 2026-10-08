import { readFile } from "node:fs/promises";
import pg from "pg";
process.loadEnvFile(".env.local");
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true,
    ca: process.env.DATABASE_SSL_CA?.replace(/\\n/g, "\n"),
  },
  connectionTimeoutMillis: 15000,
});
try {
  await client.connect();
  await client.query(await readFile("supabase/setup/production.sql", "utf8"));
  const result = await client.query(
    "select count(*)::int as count from public.demo_profiles",
  );
  if (result.rows[0].count !== 4) throw new Error("DEMO_COUNT_INVALID");
  console.log(
    "Supabase schema updated; exactly 4 fictional demo profiles installed.",
  );
} finally {
  await client.end();
}
