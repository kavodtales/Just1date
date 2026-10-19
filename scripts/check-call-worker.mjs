import pg from "pg";
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true,
    ...(process.env.DATABASE_SSL_CA
      ? { ca: process.env.DATABASE_SSL_CA.replace(/\\n/g, "\n") }
      : {}),
  },
  connectionTimeoutMillis: 10000,
  statement_timeout: 5000,
});
try {
  if (!process.env.DATABASE_URL) throw new Error("Configuration required");
  await client.connect();
  const { rows } = await client.query(`select
    exists(select 1 from public.call_service_health where id and heartbeat_at>now()-interval '90 seconds')
    and not exists(select 1 from public.call_room_cleanup q join public.call_sessions s on s.id=q.call_id
      where q.completed_at is null and s.ended_at<now()-interval '30 seconds') ready`);
  if (!rows[0]?.ready) throw new Error("Worker not ready");
  console.log("Call worker heartbeat and room cleanup are healthy.");
} catch {
  console.error("Call worker is unhealthy or not configured.");
  process.exitCode = 1;
} finally {
  await client.end();
}
