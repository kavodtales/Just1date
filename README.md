# JUST1DATE

The premium transformation is documented in [the delivery report](docs/TRANSFORMATION_2026-10-22.md).
Start at `/` for the new editorial landing, `/demo` for the fictional interactive
preview, or `/discover` for the real member application.

Meet someone worth choosing.

This repository contains a real service-connected implementation in progress. **Public production launch remains blocked by the release gates in docs/STATUS.md.** Real Supabase credentials and the database connection are configured privately; the hosted schema, Auth/Storage/Realtime and production API runtime have selected live verification. Member and staff apps are deployed to Vercel. Expo/EAS is configured and an actual signed Android preview has passed independent signature, API 36, 16 KB alignment and emulator boot checks. Paystack/AI/live video remain disabled without their required setup. Four explicitly fictional preview profiles are isolated in demo sessions; they are never represented as real members or real matches. No payment or subscription outcome is fabricated.

The updated source is uploaded to both authorized repositories. The [verified
RC3 Android APK and Google Play bundle](https://github.com/kavodtales/Just1date/releases/tag/v0.1.0-rc.3)
and checksums are available as a prerelease. The full redesign's Vercel rollout
awaits account access or the owner's destination choice; the current live site
still runs the prior frontend, with the new welcome photos served through its
existing image feed. Review the [27 rendered screens](design/verification/current/README.md),
[artifact evidence](docs/security/mobile-candidate-2026-10-22.json) and [video operation](docs/VIDEO_CALLS.md).
The updated iOS simulator app compiled and was inspected; an iPhone-installable
build still requires Apple Developer signing. No store approval or complete
public launch is claimed.

## Start

1. Install Node 24 and run `npm ci`.
2. Copy `.env.example` to ignored `.env.local` for the API/migration runner. Configure a development Supabase project, pooled/direct database connections, callback origins and public/client keys. Set `DATABASE_SSL=false` only for local PostgreSQL.
3. Create `apps/web/.env.local` and `apps/admin/.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and server-only `API_URL`. Create `apps/mobile/.env.local` with `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_WEB_URL`, `EXPO_PUBLIC_SUPABASE_URL` and the public `EXPO_PUBLIC_SUPABASE_ANON_KEY`. The EAS project ID is recorded in app.config.ts. Never copy service secrets into native builds. Use a device-reachable LAN API URL locally.
4. Run `npm run db:migrate` with a migration-capable direct connection. Set up Supabase email confirmation, SMTP, allowed callback URLs, optional SMS provider and Auth rate limits. The Supabase minimum_age DB setting must match MINIMUM_AGE; the API refuses startup if they differ.
5. Start separate terminals: `npm run dev:api`, `npm run dev:web`, `npm run dev:admin`, `npm run dev:mobile`. Web is 3000, admin 3001, API 4000. Native WebRTC requires a custom development build; Expo Go cannot load it. Inside `apps/mobile`, `npx expo start --dev-client` runs the installed development client. EAS profiles provide preview APK, production Android AAB and iOS builds; device signing/store setup is separate.
6. For local test accounts only, set `NODE_ENV=development`, a local Supabase URL and `TEST_SEED_PASSWORD`, then `npm run seed:dev`. Test accounts are explicitly labeled and must never be created in production.

An account becomes discoverable after confirmed email, a complete profile and an approved photo. Bootstrap staff through `supabase/setup/bootstrap-admin.sql`, which requires a confirmed adult account and verified authenticator before granting access. Staff permissions are enforced in PostgreSQL; production requires AAL2 MFA. Photo review does not grant a selfie identity badge.

## Verify

`npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. Native JS bundling: `npm run export -w @just1date/mobile`. Browser smoke: `npm run test:e2e` after installing Playwright Chromium on a development/CI machine. No browser binaries need to be installed to use the app’s browser preview. Staging browser tests require real dedicated E2E credentials; skipped tests are not launch evidence.

SQL tests execute all real migrations on embedded PostgreSQL with Supabase role/auth fixtures. REST tests execute those functions through Express. The test identity and Paystack adapters isolate external boundaries; they do **not** establish that hosted Auth or Paystack works. Those need live staging tests.

On memory-constrained development machines, `npm run test:low-memory` executes the same assertions with baseline WebAssembly compilation. This is a test-runner option; production runtime settings remain unchanged. See docs/STATUS.md for the current full-suite result. Browser tests exercise desktop, mobile browser and the 375-pixel reference composition; service fixtures are confined to test network boundaries. See [verification status](docs/STATUS.md) for results and release limitations.

## Structure

`apps/mobile`: Expo Router/SecureStore native client. `apps/web`: responsive Next member client with SSR cookie BFF. `apps/admin`: staff dashboard with real counts/moderation/photo review. `apps/api`: modular Express API and notification outbox worker. `packages/*`: shared validation, contracts, configuration, compatibility logic, SQL repository and UI. `supabase/migrations`: ordered relational schema, grants/RLS and transactional workflows. `infrastructure`/`.github`: container and verification/release workflows.

## Read before deployment

- [GitHub, Vercel and Supabase setup, SQL installer and credential mapping](docs/VERCEL_SUPABASE_SETUP.md).

- [Architecture](ARCHITECTURE.md), [database/ERD](DATABASE.md), [API](API.md), [security](SECURITY.md), [deployment](DEPLOYMENT.md).
- [Current implementation and verification status](docs/STATUS.md).
- [Phase delivery reports](docs/PHASE_REPORTS.md).
- [Pending provider contracts and product work](docs/PROVIDERS.md), [roadmap](docs/ROADMAP.md), [official references](docs/SOURCES.md).

OpenAPI is served at `GET /openapi.json`; API routes are under `/v1`. Error responses carry a code, useful message, status and request UUID. Secrets and message bodies are omitted from logs.

Paid prices are operator-controlled. Plus/Premium checkout starts disabled. Paystack currently grants a fixed period with manual renewal, settled only after provider verification. Native store billing, automated refunds, recurring billing, full deletion erasure, trusted-contact alert delivery, selfie verification and full analytics/admin/native parity remain launch-blocking work. See STATUS.md for the full list.
