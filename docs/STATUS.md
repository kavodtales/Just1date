# Implementation and verification status

**Not production-ready. Not deployed.** This is a substantial service-connected core with real SQL transactions, authorization, provider adapters and clients. No Supabase, Paystack, AI, push or EAS credentials were supplied. A setup/error state is not evidence of a working external integration.

## Delivered in the repository

- TypeScript monorepo: Expo mobile, Next member web/admin, modular Express API, six shared packages; architecture, ERD, environment catalog, build/migration/seed scripts and verification/release workflows.
- Seven ordered migrations: 55 relational application tables covering requested domains, UUID/FK constraints, indexes, deny-by-default RLS, safe profile projections, service-only writes and account/conversation access checks. Migration 007 adds an authorized inbox projection and unread index. Catalog seeds and guarded local-only test-account seeder; no live accounts created.
- Supabase authentication clients/routes: email/password, confirmation/recovery/PKCE, OTP API, refresh/logout; secure SSR cookies, native SecureStore; age validated by API and DB trigger. Member password changes preserve provider reauthentication.
- Profiles/preferences/prompts/lifestyle/interests, completion/activation rules, private photo upload with decoded MIME/size/pixel validation, EXIF removal/compression and human review.
- Paginated discovery, mutual preference eligibility, configurable compatibility with missing-data coverage, quota/idempotency ledger, atomic reciprocal match/conversation/notification creation and block/unmatch revocation.
- Paginated text chat, web replies/reactions/deletion/read cursors, realtime/private typing architecture and polling fallback. Native implements text/load-older/delete/realtime.
- Paystack initialize/signature/authoritative verification, amount/currency/period snapshots, idempotent settlement and fixed-period entitlements/cancellation. Paid checkout disabled by default; operator prices required.
- Reports/moderation/audit, date-session records/check-ins/end, emergency-contact API, deletion requests that hide/revoke immediately; unsupported emergency/location/identity integrations explicitly rejected.
- In-app notifications/outbox, Expo push sender/device registration, privacy controls and bounded export. Optional minimal-input AI suggestions disabled by default; rule-based scam review signals; no automatic AI message or ban.
- Admin overview/moderation/photo review with real metrics and six server-enforced roles; production AAL2 required. Responsive web/core native screens, honest loading/error/empty/offline states, deep links, icons/splash/EAS profiles and legal-review drafts. Standalone web/admin launch scripts prepare static assets without packaging secret environment files.
- Reference redesign: supplied white/pink artwork and typography, welcome/signup/phone/birthday screens, fifteen-step web/native onboarding, photo discovery and connection grids, filter sheets, confirmed mutual-match presentation, inbox search/previews/unread counts, chat sheet and profile gallery. Private approved photos are signed after authorization. See ../design/README.md and DESIGN_PHASE.md for mapping and intentional differences.

## Verification evidence

SQL tests run actual migration SQL on PGlite PostgreSQL with Supabase auth-role fixtures. REST tests inject a test identity validator and Paystack adapter. These do not verify hosted Auth, Storage, Realtime or real payment behavior. See PHASE_REPORTS.md for files/API/database changes.

| Check                                 | Evidence and limitation                                                                                                                                                                                                     |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit                                  | Latest 13 pass: age/strict validation/compatibility/roles/risk/signature and password-authority regressions                                                                                                                 |
| SQL integration                       | Latest 10 pass: all seven migrations, RLS/age/direct-write denial, matching/chat/blocking, billing/audit, quota persistence and deletion-state revocation                                                                   |
| REST integration                      | Latest eight pass against Express and actual SQL with boundary adapters, including inbox previews/read cursors/block revocation; final combined suite: all 31 tests pass using npm run test:low-memory                      |
| Lint / TypeScript / production builds | Final lint and all ten workspace typechecks pass; final production web/admin/API builds pass with TypeScript checks enabled                                                                                                 |
| Expo                                  | SDK dependency compatibility and final iOS/Android Hermes exports pass with one Metro worker (5.5MB / 5.7MB bundles, 44 assets). Exports are not signed native builds; physical-device visual parity is unverified          |
| Browser                               | Desktop, Pixel 7 browser and 375×812 reference tests exercise real UI controls against explicit test-boundary service fixtures; selected screenshots are reviewed in design/verification. No authenticated provider journey |
| Playwright                            | Final Chrome browser suite: 30 passed and three credential-gated staging cases skipped across desktop, Pixel 7 and 375×812 (1.5 minutes). Dedicated provider credentials are absent; skips are not success                  |
| Hosted services / deployment          | No hosted migrations, real Auth/Storage/Realtime, Paystack transaction, AI request, push delivery, Docker build, cloud deployment, EAS build or store upload                                                                |

The SQL/REST suite passed all 31 tests on 2026-10-07 in 23.06 seconds. Earlier resource-exhausted runs failed; baseline WebAssembly compilation avoids the optimizing compiler memory spike. Only this project's generated caches were removed. Re-run the entire pipeline on a machine/CI runner with enough space and memory before release. Dependency audit has unresolved advisories; see DEPENDENCY_AUDIT.md. Passing builds and tests do not remove that release gate.

After the full browser suite, a final profile padding correction was rebuilt and
all three targeted profile/gallery cases passed (26.1 seconds), including assertions
that the mobile hero starts at (0,0), spans the viewport and is 393 pixels high.
The final changed browser test file passes ESLint. `npm ci --dry-run --ignore-scripts`
also accepts the lockfile; that does not replace a real clean install on CI.

## Remaining implementation, not just credentials

1. Full staging signup → email confirmation → profile/photo approval → mutual like → chat → paid checkout/cancel → report/block → deletion acceptance; controlled inbox/accounts/provider sandbox. Current Playwright staging test covers only a partial existing-account journey.
2. Durable fifteen-step onboarding drafts, native editor/device parity verification, photo replacement/removal, per-field visibility; complete profession/education/interest/verification search and paid filters/rewind. Connection lists now support pagination. Approximate distance eligibility exists but consent-bound location collection UX does not.
3. Chat images/GIF/voice with private attachments/scanning/transcoding; online presence/delivery acknowledgements; native replies/reactions/typing/report UX and hosted realtime/block revocation tests.
4. AI consent/retention review, budgets, output safeguards/evaluations, profile coaching/prompts and recommendation reranking. `store:false` does not promise zero provider retention.
5. Recurring billing, refunds/disputes/reconciliation/receipts, Apple/Google billing validation/server notifications, optional Stripe, boosts/exposure metrics and incognito rules. Current Paystack periods renew manually.
6. Identity vendor consent/signed callbacks/evidence retention jobs; trusted-contact verification, scheduling/countdown/missed-check-in delivery and receipts, opt-in location sharing. No emergency help is dispatched.
7. Complete account erasure and approved retention/recovery policy, asynchronous full export, deactivation/reactivation. Deletion currently revokes access and creates a request; it does not complete physical erasure. Export is capped at 1,000 rows per history section.
8. Staff MFA enrollment/challenge/recovery UX, reviewed bootstrap; full admin users/profiles/verification/evidence/finance/refunds/boosts/safety/notifications/content/settings/flags/matching/AI/audit sections. Only overview/moderation/photo review UI is delivered; schemas are not functionality.
9. Push tickets/receipts/device retirement, email delivery and complete preferences UI, distributed anti-abuse/cohort rules. Basic request/chat rules are not a complete anti-scam system.
10. DAU/MAU, retention/churn/conversion event pipeline and reporting; deployed monitoring/alerts. Basic counts/events/logging do not constitute complete analytics or operational monitoring.
11. Signed Android/iOS builds, physical-device permissions/push/deep-link tests, native feature parity, store billing, privacy disclosures/age ratings and network/performance/image budgets.
12. WCAG audit, full localization extraction, legal/privacy/subscription/refund/store review; actual hosting IaC/secrets/backups/restore/release/rollback, penetration and scale tests. API Dockerfile/image-publication workflow do not provision a service.

## Next action

Configure a development Supabase project through ignored environment files, apply migrations, enable email confirmation/SMTP/callbacks and bootstrap a reviewed staff account. Validate real authentication and private Storage/Realtime before enabling other integrations. On a resource-capable workstation, finish the remaining product workflows behind disabled flags. This repository remains an implementation in progress until all required release gates pass.
