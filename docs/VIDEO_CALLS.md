# Video operation and acceptance

The web and native clients implement actual LiveKit media transport. Production
calling is disabled until a provider and always-running worker are configured.
No two-person live-media acceptance has been performed with the owner's provider.
Do not advertise calling as operational before those checks pass.

## Provisioning

1. Use an owner-controlled LiveKit Cloud project. The production adapter requires
   Cloud's token-revocation support; an arbitrary self-hosted URL is rejected.
2. Set server-only LIVEKIT_URL (exact wss origin), LIVEKIT_API_KEY and
   LIVEKIT_API_SECRET on both the API and worker. Set VIDEO_CALLS_ENABLED=true
   only when the worker and acceptance environment are ready. Never put either
   credential in NEXT_PUBLIC or EXPO_PUBLIC settings.
3. Run `node apps/api/dist/worker.js` continuously from the verified API image,
   with the database/Supabase/origin settings in .env.example. This is a separate
   process from Vercel's request handlers. Calls and the notification outbox have
   independent non-overlapping five-second loops, so slow push delivery cannot
   stall revocation. Shutdown stops scheduling, drains in-flight work and closes
   the pool; leased outbox work is recoverable after a forced termination.
4. Configure the signed provider webhook to
   https://just1date-api.vercel.app/v1/calls/webhook. No unsigned callback can
   change call state. Production web LIVEKIT_URL must be the same
   secure media origin so Content-Security-Policy permits the connection.
5. Observe call_service_health. New calls/tokens fail closed if the heartbeat
   is older than 90 seconds or unresolved room cleanup is older than 30 seconds.
   Alert on either condition, CALL_WORKER_FAILED or MEDIA_REVOCATION_FAILED.
   Lease/retry processing survives a worker restart; a running HTTP API does not
   prove this worker is healthy.

The container path is infrastructure/call-worker.compose.yml. Publish a tested
image through the protected Release API image workflow, pin its actual digest
in JUST1DATE_API_IMAGE and put the operator's real settings in ignored .env.worker.
Run `docker compose -f infrastructure/call-worker.compose.yml up -d` on the selected
host. The process runs as the image's non-root user, without host ports, with a
read-only filesystem, bounded resources/logs and database-backed heartbeat/cleanup
health checks. Image publication and Compose validation are separate from actually
provisioning that host and testing live media; neither is a deployment claim.

Ringing expires after 60 seconds; accepted sessions expire after 30 minutes.
Each conversation has at most one active session; sorted participant locks also
prevent overlapping calls across conversations. Invitations enforce daily and
cooldown limits. Reusing operation_id returns the original invitation.

Camera/microphone are initially off. The recipient must accept, then each person
chooses to join and enable devices. Tokens expire in 60 seconds and can publish
only camera/microphone into that private room, with no recording/admin/data grant.
Blocking, unmatching and account suspension/deletion queue room termination.
The worker removes both participants with a revocation cutoff, then deletes the
room. A feature shutdown must update the API **and worker**, retaining provider
credentials until cleanup has completed. Removing secrets first prevents cleanup.

## Required live acceptance

Use consenting adult staging accounts in a real mutual match on two separate
devices. Test decline/cancel/missed invitation, join with devices off, individual
permissions denial, camera switching, audio playback, reconnect, app background,
ending, block/unmatch/suspend during a call and expired-token rejoin denial.
Test duplicate start/actions/webhooks, stale-worker gating, provider outage and
recovery of leased cleanup after a worker restart. Verify no client can join an
unaccepted, ended or stranger's room using a captured token. Record provider-side
participant removal and timing, not only a hidden UI.

Native uses a custom development/release build with WebRTC; Expo Go cannot load
these native modules. Calls currently require the app to stay open. Background
CallKit/ConnectionService, screen sharing, recording and E2EE are not implemented.
The app does not record media, but another participant may record their screen.
Provider/privacy/retention terms require legal review before enabling the service.
