# GitHub, Vercel and Supabase setup

Target repository: https://github.com/kavodtales/Just1date. This repository contains deployment configuration and a tested database installer. It is **not yet approved for public production launch**. Database tables do not implement unfinished application/provider workflows. Read `docs/STATUS.md` and the release gates below.

## 1. GitHub upload

The workstation's Git credential identifies `Bluechipwhale`. After the repository owner granted collaborator access, the app source uploaded successfully to `kavodtales/Just1date` on 2026-10-07. No token belongs in the repository or chat. The `origin` and `deployment` remotes point to the requested repository; the former origin is preserved as `previous-origin`.

For subsequent updates, push the reviewed commit with `git push deployment main`. Never force-push over unrelated remote history. Confirm the remote `main` SHA matches the intended local SHA.

## 2. Create separate Supabase staging and production projects

Use a region near your Vercel API and intended users. Select actual domains and keep staging accounts/data out of production. Save the database password in your password manager. Supabase generates the project URL and keys; SQL cannot create working Supabase credentials.

Open **SQL Editor** in the correct project, paste the complete contents of [`supabase/setup/production.sql`](../supabase/setup/production.sql), and run it as database owner. It installs nine migrations in one transaction, with an advisory lock and SHA-256 ledger. Reruns skip matching migrations; modified checksums fail instead of silently replacing the schema. A failure rolls back the entire installer.

This creates **56 application/support tables plus one protected migration ledger**, indexes, foreign keys, RLS/read policies, service-only business RPCs, adult-account provisioning, profile/match/chat workflows, billing/admin/safety records, and catalog data. It creates two private 5 MiB JPEG buckets (`profile-photos`, `verification-evidence`), publishes the four required realtime tables, and configures private conversation broadcast policies. No fake profiles, admin passwords, paid prices, live balances, or test accounts are seeded. Do not create public buckets or permissive upload policies.

Run [`supabase/setup/verify.sql`](../supabase/setup/verify.sql) afterward. Expect 9 migration entries, 57 public tables, zero tables without RLS, both buckets private, four application realtime publication tables, two Just1date broadcast policies, and no client-executable `rpc_*` functions. Investigate any unexpected public tables/policies in an existing project. Use a clean project rather than applying over an unrelated app schema. Do not delete/recreate application tables to fix migration errors.

For subsequent releases prefer `npm run db:migrate` with a migration-capable direct/session connection. The installer and runner use the same ledger and byte-for-byte checksums. The runner reads root `.env.local`; use secure injected `DATABASE_URL` instead of publishing it. Regenerate the installer with `npm run db:bundle` after adding a migration; do not rewrite applied migration files. Do not combine Supabase CLI migrations with this custom ledger without a deliberate migration-history alignment.

## 3. Credentials and where they belong

| Value                    | Where to obtain it                                                              | Where to put it                                                    |
| ------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Project URL              | Supabase project Connect/API settings                                           | API `SUPABASE_URL`; web/admin `NEXT_PUBLIC_SUPABASE_URL`           |
| Public key               | Supabase API Keys: publishable key or legacy anon key                           | API `SUPABASE_ANON_KEY`; web/admin `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Server key               | Supabase API Keys: secret key or legacy service_role key                        | API `SUPABASE_SERVICE_ROLE_KEY` only                               |
| Runtime PostgreSQL URL   | Supabase Connect: transaction pooler; copy exact host, username, password, port | API `DATABASE_URL` only                                            |
| Migration PostgreSQL URL | Supabase Connect: direct connection or session pooler for IPv4                  | Local/protected migration job `DATABASE_URL` only                  |
| Optional Redis TLS URL   | Managed Redis provider's TCP/TLS connection details                             | API `REDIS_URL`; use `rediss://` in production                     |
| Paystack secret          | Paystack dashboard; start with test mode in staging                             | API `PAYSTACK_SECRET_KEY` only when billing is ready               |

Use the actual dashboard connection strings and URL-encode special characters in the database password. Runtime transaction pooling commonly uses port 6543 and a `postgres.<project-ref>` user; do not guess these values. Schema migrations must use direct/session connections. This API uses parameterized, unnamed SQL queries and transaction-local role/claims, without session-level prepared statements. Keep TLS certificate validation enabled. Set API/migration/worker `DATABASE_SSL_CA` to the official Supabase public CA PEM (actual newlines or literal `\n` are accepted). The downloaded certificate is in `supabase/certificates/prod-ca-2021.crt`; its source is the dashboard's Download certificate link. Database drivers keep certificate and hostname validation enabled.

The API's database credential can assume `service_role`; keep it server-only. The public key is intended for client use and grants only what RLS permits. Server secrets bypass RLS and must never appear in `NEXT_PUBLIC_*`, `EXPO_PUBLIC_*`, source code, browser requests, or exported client builds. Configure secrets in each Vercel project's Environment Variables. Do not put them in GitHub repository files.

## 4. Vercel projects

Import the same GitHub repository three times. Use production branch `main`, Node **24.x**, and these settings:

| Project    | Root Directory | Framework | Build command   | Install command                    |
| ---------- | -------------- | --------- | --------------- | ---------------------------------- |
| Member app | `apps/web`     | Next.js   | `npm run build` | `cd ../.. && npm ci --include=dev` |
| Staff app  | `apps/admin`   | Next.js   | `npm run build` | `cd ../.. && npm ci --include=dev` |
| Backend    | `apps/api`     | Express   | `npm run build` | `cd ../.. && npm ci --include=dev` |

Enable inclusion of files outside Root Directory in each project so shared workspace packages are available. The per-app `vercel.json` files supply framework/build/install settings. Let Vercel choose the default output directory. Deploy the API, then configure web/admin `API_URL` with its HTTPS origin (no `/v1` suffix). Redeploy web/admin after entering public keys because Next.js embeds public variables at build time. Enable Fluid compute for the Express project. The three `vercel.json` files select `dub1` (Dublin), alongside this project's eu-west-1 database. Change this region if deploying a different Supabase project.

The Vercel Express entry is `apps/api/app.mjs`, which imports the compiled `dist/app.js` bundle produced by the build. The lazy implementation is `apps/api/src/app.ts`: it opens no provider connections during import/build, initializes once on a warm instance, retries failed initialization, and returns a generic 503 while required services are unavailable. Pools default to three connections per instance (`DATABASE_POOL_MAX`); tune capacity against measured concurrency and Supabase pool limits. Staging must prove the actual Vercel bundle includes shared packages and Sharp's platform binary. Local compilation is not a hosted deployment test.

**API required environment:**

```dotenv
NODE_ENV=production
DATABASE_URL=<Supabase transaction-pooler URL>
DATABASE_SSL=true
DATABASE_POOL_MAX=3
SUPABASE_URL=<project URL>
SUPABASE_ANON_KEY=<public key>
SUPABASE_SERVICE_ROLE_KEY=<server secret>
APP_URL=https://<member domain>
ADMIN_URL=https://<staff domain>
CORS_ORIGINS=https://<member domain>,https://<staff domain>
DATABASE_SSL_CA=<Supabase public CA PEM, with escaped \n or actual newlines>
# Optional: shared limits use PostgreSQL when empty.
REDIS_URL=
MINIMUM_AGE=18
AI_ENABLED=false
```

Shared production limits now use atomic PostgreSQL counters in `request_rate_limits` by default. Counters persist across Vercel instances; keys are HMAC digests, and bounded request-time cleanup removes expired counters older than one hour. Database/store errors fail closed. An optional `REDIS_URL` switches both limiters to Redis; use TLS `rediss://`. Load-test the database budget before opening registration to large cohorts. An HTTP Redis REST URL is not compatible with the current TCP Redis client. The worker also needs a server-only database URL, SSL, and optional `EXPO_ACCESS_TOKEN`. CORS origins must be exact, without trailing slashes or spaces; never use `*` for authenticated production services. Use isolated staging settings for Vercel Preview deployments; do not share production secrets/data with untrusted preview branches.

**Member and staff environment (each project):**

```dotenv
NEXT_PUBLIC_SUPABASE_URL=<same environment's project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<public key>
API_URL=https://<API domain>
```

Server-only database/service secrets are unnecessary in either Next project. Environment names are retained for compatibility even when using the newer publishable/secret keys.

## 5. Supabase Auth settings

Set Site URL to the member HTTPS origin. Allow exact member and staff `/auth/callback` URLs and recovery redirects generated by the app. Add `just1date://auth/callback` only when deploying the native client. Keep arbitrary wildcard production callbacks disabled. Supabase local `config.toml` does not configure the hosted project's dashboard.

Enable email confirmation and double confirmation for email changes. Configure custom SMTP, sender-domain SPF/DKIM/DMARC, production delivery limits and monitoring; the default Supabase mail service is unsuitable for general public signup. Set minimum password length to 12, choose supported strength/leaked-password controls, and require secure password changes/reauthentication. Align Auth request limits and abuse protection with the application's flows. Configure an SMS provider before offering phone OTP; phone-only signup is intentionally unsupported because the adult DOB trigger requires registration metadata. Disable unused providers and anonymous sign-in.

Every new member must register through the app with an adult DOB. Creating a user in Auth without `date_of_birth` metadata fails intentionally. A complete profile, confirmed email, and a staff-approved photo are required before discovery; an empty discovery feed in a fresh project is expected.

## 6. First administrator and photo review

Create a real staff account through member signup, confirm email, sign into the staff domain, and visit `/auth/mfa`. Enroll a TOTP authenticator and verify its six-digit code. Keep the authenticator setup key private. Copy that account's UUID from Supabase Auth, replace the zero UUID in [`supabase/setup/bootstrap-admin.sql`](../supabase/setup/bootstrap-admin.sql), and run it as database owner. This requires confirmed email, adult DOB, a verified MFA factor, and a non-test/non-revoked account; it records an audit event. It does not seed a password or let ordinary members grant themselves staff roles.

Sign in again on the staff domain, verify your authenticator at `/auth/mfa`, and open the dashboard. Production admin API routes require AAL2 even if a staff role exists. Approve member photos using a different staff account; self-review is prohibited. Staff role/recovery changes require a reviewed operator process. See LIVE_VERIFICATION.md for hosted enrollment/challenge evidence. Recovery and real staff provisioning still require acceptance tests.

## 7. Worker, payments and disabled integrations

The current notification worker is a persistent process (`node apps/api/dist/worker.js`) with a durable PostgreSQL outbox. Do not run its interval loop inside a Vercel request handler. Deploy it to a managed persistent worker host if enabling native push, and finish provider receipt reconciliation/device retirement before launch. In-app notifications do not require this process. Vercel + Supabase host the member/staff/API core and its shared database limiter. They do not host the existing persistent worker; leave native push disabled until a supported scheduled/durable worker and receipt reconciliation are delivered.

Paid plans ship `purchasable=false`, with no invented prices. After testing refunds/disputes/reconciliation and operator-approved price/currency/period settings, add Paystack credentials and callback URL; configure the Paystack webhook to `https://<API domain>/v1/payments/webhook` (verify against API route definitions before enabling). Current entitlements are fixed-duration with manual renewal. Do not advertise recurring subscriptions or launch native paid billing without implementing and testing the required store integration. Leave AI, identity badges, boosts and emergency-delivery integrations disabled until their workflows and provider contracts are implemented and verified.

## 8. Production acceptance gates

Database installer tests and builds are preparation, not evidence that a live dating service is production-ready. Required before public launch:

- Successful GitHub upload and protected release branch; clean CI install/build/test pipeline and reviewed current dependency advisories (`docs/DEPENDENCY_AUDIT.md`).
- Hosted staging signup → email confirmation → profile → upload → MFA photo approval → discovery → mutual match → chat/realtime → report/block/unmatch → recovery and deletion, with member/stranger authorization tests and real SMTP/SMS where enabled.
- Complete account erasure and retention policy; current deletion only revokes access and creates a request. Replace capped exports with a complete asynchronous export workflow before claiming full portability.
- Production Auth/Storage/Realtime tests, signed URL expiration/block revocation checks, MFA recovery/provisioning tests, load/abuse testing, accessibility and privacy/legal review.
- Approved payment/refund/store workflows, push ticket/receipt reconciliation, identity/safety delivery where advertised; no public claims for unfinished features.
- Backups/PITR appropriate to the deployment, proven restore procedure, redacted monitoring/alerts, database/network/TLS controls, incident handling, tested rollback, and capacity budgets.

Official references: [Vercel Express](https://vercel.com/docs/frameworks/backend/express), [Vercel monorepos](https://vercel.com/docs/monorepos), [Supabase database connections](https://supabase.com/docs/guides/database/connecting-to-postgres), [API keys](https://supabase.com/docs/guides/getting-started/api-keys), [TOTP MFA](https://supabase.com/docs/guides/auth/auth-mfa/totp), [production checklist](https://supabase.com/docs/guides/deployment/going-into-prod).
