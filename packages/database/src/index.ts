import pg from "pg";
export interface Database {
  close?(): Promise<void>;
  query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: T[] }>;
  transaction<T>(
    actor: string | null,
    work: (db: Database) => Promise<T>,
  ): Promise<T>;
}
export function createDatabase(url: string, ssl = true, max = 3): Database {
  const pool = new pg.Pool({
    connectionString: url,
    max,
    idleTimeoutMillis: 10000,
    allowExitOnIdle: true,
    ssl: ssl ? { rejectUnauthorized: true } : false,
    connectionTimeoutMillis: 5000,
    statement_timeout: 10000,
  });
  const wrap = (client: pg.Pool | pg.PoolClient): Database => ({
    close: () => pool.end(),
    query: async <T>(sql: string, params?: unknown[]) => {
      const r = await client.query(sql, params);
      return { rows: r.rows as T[] };
    },
    transaction: async <T>(
      actor: string | null,
      work: (db: Database) => Promise<T>,
    ) => {
      const c = await pool.connect();
      try {
        await c.query("begin");
        await c.query("select set_config('request.jwt.claims',$1,true)", [
          JSON.stringify(actor ? { sub: actor, role: "authenticated" } : {}),
        ]);
        await c.query("set local role service_role");
        const result = await work(wrap(c));
        await c.query("commit");
        return result;
      } catch (e) {
        await c.query("rollback");
        throw e;
      } finally {
        c.release();
      }
    },
  });
  return wrap(pool);
}
