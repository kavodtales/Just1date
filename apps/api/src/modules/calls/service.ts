import type { VideoCall } from "@just1date/types";
import { Repository } from "../../lib/repository";
import { AppError, log } from "../../lib/http";
import type { CallProvider } from "./provider";
export class CallService {
  private checkedAt = 0;
  constructor(
    private repo: Repository,
    readonly provider?: CallProvider,
    private enabled = Boolean(provider),
  ) {}
  async available() {
    if (!this.provider || !this.enabled) return false;
    return (
      await this.repo.db.transaction(null, (tx) =>
        tx.query<{ ready: boolean }>(
          "select exists(select 1 from public.call_service_health where id and heartbeat_at>now()-interval '90 seconds') and not exists(select 1 from public.call_room_cleanup q join public.call_sessions s on s.id=q.call_id where q.completed_at is null and s.ended_at<now()-interval '30 seconds') ready",
        ),
      )
    ).rows[0].ready;
  }
  async requireAvailable() {
    if (!(await this.available()))
      throw new AppError(
        "CALL_SERVICE_UNAVAILABLE",
        503,
        "Video calls are temporarily unavailable. You can keep chatting here.",
      );
  }
  async token(actor: string, id: string) {
    await this.requireAvailable();
    const call = await this.repo.call<VideoCall>(actor, "callGet", [id]);
    if (call.status !== "accepted")
      throw new AppError(
        "CALL_STATE_CONFLICT",
        409,
        "Both people must accept before joining.",
      );
    const credentials = await this.provider!.credentials(call, actor);
    // Recheck after the provider request: membership may have been revoked meanwhile.
    const current = await this.repo.call<VideoCall>(actor, "callGet", [id]);
    if (current.status !== "accepted") {
      await this.cleanup();
      throw new AppError("CALL_STATE_CONFLICT", 409, "This call has ended.");
    }
    return credentials;
  }
  async cleanup() {
    if (!this.provider) return;
    const rows = await this.repo.db.transaction(
      null,
      async (tx) =>
        (
          await tx.query<VideoCall>(`
      with claimed as (
        select call_id from public.call_room_cleanup where completed_at is null and available_at<=now()
        and (locked_at is null or locked_at<now()-interval '90 seconds')
        order by available_at for update skip locked limit 10
      ), leased as (
        update public.call_room_cleanup q set locked_at=now(),attempts=attempts+1 from claimed c where q.call_id=c.call_id returning q.call_id
      ) select s.* from public.call_sessions s join leased l on l.call_id=s.id`)
        ).rows,
    );
    await Promise.all(
      rows.map(async (call) => {
        try {
          await this.provider!.revoke(call);
          await this.repo.db.transaction(null, (tx) =>
            tx.query(
              "update public.call_room_cleanup set completed_at=now(),locked_at=null,last_error_code=null where call_id=$1",
              [call.id],
            ),
          );
        } catch {
          await this.repo.db.transaction(null, (tx) =>
            tx.query(
              "update public.call_room_cleanup set locked_at=null,available_at=now()+interval '10 seconds',last_error_code='MEDIA_REVOCATION_FAILED' where call_id=$1",
              [call.id],
            ),
          );
          log.error(
            { call_id: call.id, code: "MEDIA_REVOCATION_FAILED" },
            "call_cleanup_retry",
          );
        }
      }),
    );
  }
  async tick() {
    if (!this.provider) return;
    if (!this.enabled)
      await this.repo.db.transaction(null, (tx) =>
        tx.query(
          "update public.call_sessions set status='ended',ended_at=now() where status in('ringing','accepted')",
        ),
      );
    if (Date.now() - this.checkedAt > 30000) {
      await this.provider.health();
      this.checkedAt = Date.now();
    }
    await this.repo.db.transaction(null, (tx) =>
      tx.query(`
      with expired as (select id from public.call_sessions where status in('ringing','accepted') and expires_at<=now() for update skip locked limit 200)
      update public.call_sessions s set status=case when status='ringing' then 'missed' else 'ended' end,ended_at=now() from expired e where s.id=e.id`),
    );
    await this.cleanup();
    await this.repo.db.transaction(null, (tx) =>
      tx.query(
        "insert into public.call_service_health(id,heartbeat_at) values(true,now()) on conflict(id) do update set heartbeat_at=excluded.heartbeat_at",
      ),
    );
  }
}
