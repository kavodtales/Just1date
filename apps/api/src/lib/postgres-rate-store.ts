import { createHmac } from "node:crypto";
import type { Store, Options, ClientRateLimitInfo } from "express-rate-limit";
import type { Database } from "@just1date/database";

export class PostgresRateStore implements Store {
  localKeys = false;
  readonly prefix: string;
  private windowMs = 60000;
  constructor(
    private db: Database,
    private namespace: "api" | "auth",
    private secret: string,
  ) {
    this.prefix = `j1d:${namespace}:`;
  }
  init(options: Options) {
    this.windowMs = options.windowMs;
  }
  private digest(key: string) {
    return createHmac("sha256", this.secret)
      .update(`${this.namespace}:${key}`)
      .digest("hex");
  }
  async increment(key: string): Promise<ClientRateLimitInfo> {
    const result = await this.db.query<{
      total_hits: string | number;
      reset_at: Date | string;
    }>(
      `
      with expired as (
        select namespace,key from public.request_rate_limits
        where reset_at < clock_timestamp() - interval '1 hour'
          and not(namespace=$1 and key=$2)
        order by reset_at limit 100 for update skip locked
      ), prune as (
        delete from public.request_rate_limits r using expired e
        where r.namespace=e.namespace and r.key=e.key returning r.key
      )
      insert into public.request_rate_limits(namespace,key,total_hits,reset_at)
      values($1,$2,1,clock_timestamp()+($3::double precision * interval '1 millisecond'))
      on conflict(namespace,key) do update set
        total_hits=case when request_rate_limits.reset_at<=clock_timestamp() then 1 else request_rate_limits.total_hits+1 end,
        reset_at=case when request_rate_limits.reset_at<=clock_timestamp() then excluded.reset_at else request_rate_limits.reset_at end
      returning total_hits,reset_at`,
      [this.namespace, this.digest(key), this.windowMs],
    );
    const row = result.rows[0];
    if (!row) throw new Error("RATE_LIMIT_STORE_UNAVAILABLE");
    return {
      totalHits: Number(row.total_hits),
      resetTime: new Date(row.reset_at),
    };
  }
  async decrement(key: string) {
    await this.db.query(
      "update public.request_rate_limits set total_hits=greatest(0,total_hits-1) where namespace=$1 and key=$2 and reset_at>clock_timestamp()",
      [this.namespace, this.digest(key)],
    );
  }
  async resetKey(key: string) {
    await this.db.query(
      "delete from public.request_rate_limits where namespace=$1 and key=$2",
      [this.namespace, this.digest(key)],
    );
  }
}
