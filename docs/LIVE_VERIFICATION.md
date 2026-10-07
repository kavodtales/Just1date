# Hosted verification — 7 October 2026

Source: https://github.com/kavodtales/Just1date

Member site: https://just1date-vert.vercel.app

Staff site: https://just1date-admin.vercel.app

API: https://just1date-api.vercel.app — production deployment Ready, compiled bundle and actual endpoints verified.

Deployments from commit `35edf908aaa768774677b7d87555a3d5cd666daf` are Ready. The earlier raw-TypeScript Vercel API build failed on Helmet module resolution; the final deployment loads the tested compiled ESM bundle through `apps/api/app.mjs`.

## Verified services

- Supabase project `kyfohngqetzsrqsyabey`: nine migrations match the canonical source checksums; all 57 public tables have RLS; none of the 33 `rpc_*` business functions is executable by anonymous or authenticated browser roles.
- Eight configuration checks pass, including required email confirmation, valid public/server keys, anonymous isolation and private JPEG buckets limited to 5 MiB.
- Nineteen provider checks pass: confirmed/unconfirmed/underage Auth behavior, real token validation, isolation of private rows and writes, notification Realtime delivery and cross-member denial, nonmember typing denial, private photo access and authorized signed downloads, TOTP AAL2 upgrade, logout and cleanup.
- Twelve production runtime checks pass against the actual PostgreSQL/Supabase services: health/readiness/catalog, verified bearer identity, onboarding and staff access restrictions, CORS, atomic limits across two instances and per-member isolation behind a shared proxy.
- Temporary provider probe accounts were hidden, marked as test accounts and removed with their generated objects. No live member or staff accounts were invented.
- Production database connections use the transaction pooler, a bounded three-connection pool, certificate verification and the public Supabase CA. Database-side SSL enforcement is enabled, and the compiled Vercel entry passes readiness after the restart. API limits use atomic PostgreSQL counters with HMAC identifiers; Redis is optional. Authenticated limits use remotely validated member identities, avoiding a shared Vercel outbound-IP quota.
- Twenty-five hosted-domain checks pass: API health/readiness/catalog, provider rejection of short passwords, unauthorized access and CSRF rejection, member/staff real sign-in, Secure/HttpOnly/SameSite cookies, token-free login responses, authenticated proxy access, staff TOTP enrollment/verification and upgraded cookies, nonstaff denial after MFA, logout and test-account cleanup.
- Web, staff and API production builds, lint and all ten workspace typechecks pass locally.
- Final unit/SQL/REST suite: 48 tests pass in ten files. Final browser suite against the built production server: 30 pass across desktop, Pixel 7 and 375×812; three prepared-account staging journeys are skipped. An earlier development-server run timed out on three cold route transitions; the production build passes those same cases. A duplicate keypad React key was also corrected. The default Playwright launcher now builds and starts production, so CI no longer depends on development compilation timing.

Commands: `npm run hosted:probe`, `npm run supabase:check`, `npm run supabase:probe`, `npm run api:probe`, `npm run test:low-memory`, `npm run lint`, `npm run typecheck`, `npm run build`. Real provider probes require private environment configuration and create disposable, hidden records; they are not a load test.

Hosted Auth requires a minimum 12-character password, secure password-change reauthentication and confirmation on both sides of email changes. Anonymous sign-in, phone and social providers are disabled. Leaked-password protection is unavailable on the current free plan and was not enabled.

GitHub Verify run [37616130435](https://github.com/kavodtales/Just1date/actions/runs/37616130435) completed successfully for the deployed implementation, including clean install, checks/builds, mobile export and browser jobs.

## Release gates

This is a deployed implementation, not approval for an unrestricted public launch. Custom SMTP is disabled in the actual Supabase dashboard. Public signup confirmation and email recovery need a verified sender/provider and an inbox-based acceptance test. Phone OTP also needs a configured SMS provider.

The first administrator must be a real confirmed adult member with a verified authenticator. Use `supabase/setup/bootstrap-admin.sql` after that enrollment. No staff password is stored in the repository.

Full hosted signup/photo approval/mutual-match/chat/report/block/deletion acceptance, owner-approved legal notices and retention/physical erasure, security review, monitored load/restore tests and unresolved dependency advisories remain release gates. The latest audit has 31 affected entries: 19 high, 11 moderate and one low; see `security/npm-audit-live-2026-10-07.json`. Optional payments, AI, SMS, native distribution and push delivery remain unconfigured or gated.

Environment values are in ignored local files and Vercel production settings. Only the Supabase publishable key is supplied to client builds; database and server keys are confined to the API environment. Rotate the privileged keys and database password shared in this conversation before public launch, then update the API settings and rerun the probes.

Screenshots: `design/verification/hosted/member-welcome.jpg`, `api-deployment.jpg`, `database-tls.jpg` and `auth-protections.jpg`.
