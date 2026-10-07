# Deployment

For the requested `kavodtales/Just1date` repository and Vercel hosting, follow
[the Vercel/Supabase setup guide](docs/VERCEL_SUPABASE_SETUP.md). It includes the
repeat-safe SQL Editor installer, verification/admin bootstrap SQL, three Vercel
projects, credential locations and launch blockers. Hosted Supabase setup and member/staff deployments are now verified; see docs/STATUS.md for the exact scope and remaining release gates.

Install Node 24 and run `npm ci`. Copy `.env.example` to ignored `.env.local` and configure a development Supabase project. Run ordered migrations using `npm run db:migrate` against a direct migration connection (never through transaction poolers for schema operations). Never run the development-account seeder against production.

Local: `npm run dev:api`, `npm run dev:web`, `npm run dev:admin`, `npm run dev:mobile` in separate terminals. Web 3000, admin 3001, API 4000. Mobile API URL must be reachable from the device. Supabase local CLI requires Docker; neither is available in this initial workstation. Embedded SQL tests run without Docker.

After a production build, `npm run start -w @just1date/web` and `npm run start -w @just1date/admin` prepare static/public assets and launch the traced standalone server. The launcher defaults to loopback; set HOSTNAME=0.0.0.0 explicitly when deploying behind a protected container/TLS edge. Supply runtime variables through the host's secrets manager. Do not package local secret environment files into standalone distributions.

CI: npm ci → lint → typecheck → unit/API/database tests → production web/admin/API build. Release workflow consumes that successful check and publishes versioned API images only with configured registry credentials. Environment promotion and schema migrations are explicit protected-environment steps. No automatic unconfigured deployment.

Production: managed Supabase with PITR, backups and restore drills; pooler for API connections; API/worker images on a managed container service; Next standalone containers or managed Next hosting; TLS edge and strict CORS; shared PostgreSQL limits (optional TLS Redis); error monitoring with redaction; separate staff domain; EAS app builds with approved bundle IDs and store billing. Readiness must check database. Logs go to a central protected store with approved retention. Alerts cover latency/error rate, webhook failures, queue age, payment discrepancies and DB capacity.

Migrations: advisory lock, checksum validation, transactional application, staging rehearsal, pre-release backup. Use additive changes and backward compatible readers. Roll back images; roll forward data migrations. Test restoration quarterly. Document RPO/RTO after infrastructure selection and actual drills, not as invented guarantees.

Required release evidence: Supabase email/phone recovery and deletion; RLS against all client roles; private realtime membership; Paystack test payment/replay/refund; native store subscription sandbox; mobile device permissions/deep links/push; Android/iOS build; Playwright journey; load tests; penetration test; accessibility review; legal/privacy/store review.
