# JUST1DATE architecture

Status: implementation in progress; not approved for production. This repository starts empty. There are no existing features to preserve.

## Decisions

Node 24, TypeScript, npm workspaces and Turborepo. Next.js App Router web/admin, Expo Router mobile, Express REST API, Supabase Auth/Storage/Realtime and PostgreSQL. Use one modular backend first; split services only when measurements justify it. Public clients carry only public Supabase keys. Server authentication validates sessions with Supabase; database actor identity is derived from that validated session, never a request body.

The API uses parameterized SQL and transactions. Every member query runs as PostgreSQL `authenticated` with transaction-local JWT claims. Sensitive writes use bounded, audited functions with a fixed search path. Client roles cannot directly change matches, membership, account status, verification or payment state. Privileged operations use a separate server connection and require explicit authorization. RLS and restrictive grants protect every application table. No public discovery access; discovery returns a safe projection, never date of birth, contact details or coordinates.

## Boundaries

`apps/api`: auth, profile, discovery, interaction, chat, billing, safety, moderation, AI, notification modules. `apps/web`: desktop and responsive member experience. `apps/admin`: separate operator experience with backend RBAC; UI visibility is not authorization. `apps/mobile`: native navigation, SecureStore sessions and explicit permissions. `packages/validation`, `types`, `utils`, `config`, `database`, `ui`: reusable contracts and domain logic. `supabase/migrations`: sole source of schema changes. `tests`: real SQL and API integration plus domain tests.

## Critical transactions

Like: canonical pair advisory lock → validate both active accounts and both block directions → consume database plan quota → unique like → if reciprocal, unique match + conversation + two memberships + outbox notifications in one transaction. Replay uses operation UUID. Block: same pair lock → insert block → close match → revoke conversation access. Message: pair lock → recheck active match and membership → unique client message ID → moderation signal + outbox. Payment: verify raw HMAC signature → verify provider reference/amount/currency server-side → row lock → unique provider event → settle exactly once and grant expiring entitlement. No entitlement from redirects.

## Scaling

Cursor pagination, bounded payloads, pooled PostgreSQL connections, indexes on membership, actor/time and active discovery filters. Redis distributed rate limits are required for multi-replica production. Notification outbox is durable and claimed with SKIP LOCKED; worker retries with exponential backoff. Scale Realtime on measured connections; private presence channels require membership policies. Archive and partition high-volume message/event tables after measured growth. Avoid profile/message body logging. Structured request IDs, redacted logs and health/readiness endpoints support operations.

## Data, AI and media

Exact locations and verification evidence stay private with explicit consent and retention deadlines. Photos start quarantined; approved copies only can appear in discovery. Matching is a configurable weighted heuristic with hard mutual preference constraints and missing-factor normalization. Scores are suggestions, not scientific certainty. AI sees the minimum explicit nonsensitive profile fields, cannot infer protected traits, send messages or ban users. AI disabled by default; no pretend responses without a configured provider. Photo/selfie identity assurance requires a reviewed external vendor or trained human process.

## Deployment and launch gates

API/worker containers; managed Next web/admin; Supabase managed Postgres/Auth/Storage; Expo EAS builds. Separate projects and secrets for development/staging/production. A staging journey, hosted RLS/Realtime checks, Paystack test-mode transaction, real device push, Android build, macOS/EAS iOS build, load testing, legal review and independent security review are launch gates. Account lifecycle supports pause, deactivation and pending deletion; a retention-aware deletion job must complete erasure across Auth, Storage, analytics and backups according to the approved policy.

## Future modules

Provider interfaces reserve Apple/Google billing, Stripe, verification vendor and email delivery. Video/audio/events/coaching/travel/concierge remain feature-flagged until implemented. Native digital subscriptions require store-compliant billing before release; native Paystack checkout must not be enabled as a substitute.
