# Implementation and verification status

## Coded UI and editable app images — 20 October 2026

Promotional welcome photography now has an authenticated, MFA-protected App images
editor for ADMIN/SUPER_ADMIN staff. It supports local preview, accessible image
descriptions, publication, optimistic revision checks and confirmed restoration.
Migration 012 stores published slots separately from private member photography.
Web and native fetch the same feed and retain original photo fallbacks. Permission
artwork and social glyphs are rendered as code instead of screenshot crops.
Discovery and profile detail share a dynamic match celebration, using the actual
two member photos and a server-confirmed mutual match. See APP_IMAGES.md.

The complete SQL/API/unit suite passes 66 tests, including publishing, reset,
storage failure, staff restrictions and stale-editor cleanup. Ten workspace
typechecks and production web/admin/API builds pass with bounded local memory.
Member browser acceptance passes 75 tests across desktop and mobile, with three
prepared-account staging journeys skipped. Eight staff browser tests pass.
Both updated native Hermes bundles export successfully. RC2's code-11 APK passes
certificate/signature/API/alignment and real emulator navigation checks; its
code-12 AAB passes signature and Google bundletool validation. The exact APK/AAB
are published in the public deployment repository. The updated iOS simulator
archive compiles and passes platform/bundle-ID/privacy-string inspection. APK and
iOS native bundles contain none of the configured privileged values checked.
Install RC2 to get the image feed in native; an already downloaded RC1 binary is
unchanged. The requested owner account is confirmed, and its role activation is
deferred until the user completes authenticator setup.

## Completed reference screens — 20 October 2026

All owner-supplied screen types now have web and native UI, including the permission
introductions, story-style photo viewer, native country/code keypad, tilted swipe
cards, heart feedback and full-screen match. The original owner PNG is retained.
Member browser acceptance: 66 pass; three prepared-account staging journeys remain
skipped. All ten workspace typechecks, lint, web/admin/API production builds and
both native exports pass. The code-8 APK and code-9 AAB passed independent
certificate/signature/API/alignment and emulator or bundletool verification, and
are published as v0.1.0-rc.1 in both authorized repositories. The iOS simulator
archive compiled and was inspected; it is not an iPhone IPA. See DESIGN_PHASE.md and design/verification/current for
measured scope and fixture-only rendered review images.

This completes the screen implementation, not the separate public-launch gates.
Contact matching/social providers remain visibly unavailable. Story-style viewing
uses approved profile photos and matched replies, not ephemeral publishing. Apple
device signing and media/worker configuration remain external dependencies.

## Native and installable web update — 19 October 2026

A real managed-signing Android preview APK has finished building. Video-call
code, consent controls, revocation and installable web infrastructure are now
implemented. Migration 011 has been applied to the hosted database. Current local
evidence: 60 unit/SQL/REST tests, 48 member browser checks, all ten typechecks,
lint and production web/admin/API builds pass; three staging journeys remain
skipped. See RELEASE_2026-10-18.md for artifact provenance and limitations.
This preview is not approval for a public dating-service launch. Apple signing,
media service/worker, email sender, real staff and the outstanding product,
legal, security and device gates below remain necessary. The owner has since locked the supplied white/pink references and original logo;
that UI is now deployed and the reference native artifacts are verified above.

Independent Android CI now passes official signature, target/compile API 36,
16KiB zip/native alignment, emulator installation and welcome startup checks.
The source verification pipeline also passed clean installation, both native
exports and member/staff browser suites. The real APK link/checksum update passes
nine additional targeted browser checks; all four staff checks pass locally.
Google Play approval and a full physical-device journey remain outstanding.

**Public production launch remains blocked.** The source is uploaded to `kavodtales/Just1date`. Project `kyfohngqetzsrqsyabey` now has eleven applied migrations and 62 RLS-enabled public tables, private Storage buckets, real Auth/Storage/Realtime checks, and tested production API access through strict TLS. Member, staff and API applications are deployed to Vercel and verified through their real production domains. Current live evidence is recorded in LIVE_VERIFICATION.md. Supabase and PostgreSQL credentials are kept in ignored environment files and the API's Vercel production environment. The remaining product, SMTP, legal, security and operational gates below still apply. Passing selected live checks does not verify the entire dating journey.

## Earlier premium web redesign — superseded by owner reference update

The 8 October version introduced an editorial landing page, responsive discovery preview, redesigned authentication, and one profile setup form. Migration 010 adds exactly four fictional profiles and private, expiring demo sessions. Likes, sample matches, messages and preferences persist in Supabase. Demo replies are explicitly scripted. Staff removal requires authenticator verification and settings permission; it affects only demo tables and writes an audit entry. The same four profiles can be restored. No Auth accounts or real member records are seeded. Public email sending remains unconfigured and the production database currently has no staff account; owner details are still required.

## Delivered in the repository

- Deployment preparation: eighth migration protects the migration ledger and enforces private bucket configuration; repeat-safe SQL Editor installer with canonical LF SHA-256 checksums; read-only verification and MFA-checked administrator bootstrap scripts; per-app Vercel configuration and lazy Express entry point; bounded runtime database pools; staff TOTP enrollment/challenge screen and CSRF-protected server routes. Earlier deployment suite: 40 tests passed, lint and all workspace typechecks passed; web/admin/API production builds passed. Supabase schemas in new installer tests are fixtures, not a real hosted service. Current npm audit remains at 31 affected entries (19 high, 11 moderate, one low); see `security/npm-audit-deployment-2026-10-07.json`.

- TypeScript monorepo: Expo mobile, Next member web/admin, modular Express API, six shared packages; architecture, ERD, environment catalog, build/migration/seed scripts and verification/release workflows.
- Ten ordered migrations: 58 relational application/support tables plus a protected migration ledger, UUID/FK constraints, indexes, deny-by-default RLS, safe profile projections, service-only writes and account/conversation access checks. Migration 007 adds an authorized inbox projection and unread index; migration 008 protects the ledger and existing private buckets. Migration 009 adds RLS-protected shared request counters. Catalog seeds and guarded local-only test-account seeder; temporary hidden provider probes are removed after testing.
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

Current verification for the premium update: **51 unit/SQL/REST tests pass; 39 member and four staff browser tests pass against production builds, with three prepared-account staging journeys skipped. Eight Supabase configuration and nineteen real provider checks pass after migration 010. Fifteen local frontend demo checks pass against actual Supabase.** Twelve production runtime and twenty-five hosted-domain checks passed for the earlier deployed release. See PREMIUM_WEB_RELEASE.md for the new demo behavior and verification scope. Database TLS enforcement is enabled, and strict certificate verification passes. See LIVE_VERIFICATION.md for scope and limitations. The rows below retain earlier implementation evidence.

SQL tests run actual migration SQL on PGlite PostgreSQL with Supabase auth-role fixtures. REST tests inject a test identity validator and Paystack adapter. These do not verify hosted Auth, Storage, Realtime or real payment behavior. See PHASE_REPORTS.md for files/API/database changes.

| Check                                 | Evidence and limitation                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Unit                                  | Earlier 13 pass: age/strict validation/compatibility/roles/risk/signature and password-authority regressions                                                                                                                                                                                                                               |
| SQL integration                       | Earlier 10 pass: all seven migrations, RLS/age/direct-write denial, matching/chat/blocking, billing/audit, quota persistence and deletion-state revocation                                                                                                                                                                                 |
| REST integration                      | Earlier eight pass against Express and actual SQL with boundary adapters, including inbox previews/read cursors/block revocation; final combined suite: all 31 tests pass using npm run test:low-memory                                                                                                                                    |
| Lint / TypeScript / production builds | Final lint and all ten workspace typechecks pass; final production web/admin/API builds pass with TypeScript checks enabled                                                                                                                                                                                                                |
| Expo                                  | SDK dependency compatibility and final iOS/Android Hermes exports pass with one Metro worker (5.5MB / 5.7MB bundles, 44 assets). Exports are not signed native builds; physical-device visual parity is unverified                                                                                                                         |
| Browser                               | Desktop, Pixel 7 browser and 375×812 reference tests exercise real UI controls against explicit test-boundary service fixtures; selected screenshots are reviewed in design/verification. No authenticated provider journey                                                                                                                |
| Playwright                            | Earlier Chrome browser suite: 30 passed and three credential-gated staging cases skipped across desktop, Pixel 7 and 375×812 (1.5 minutes). Dedicated provider credentials are absent; skips are not success                                                                                                                               |
| Hosted services / deployment          | Hosted migrations and selected real Auth/Storage/Realtime/API checks pass; member/staff/API Vercel builds are deployed; actual secure cookie login, proxy access, staff MFA and logout pass. Full real signup/email/match/chat/staff journey, Paystack, AI, push, EAS/store builds, restore and load/security acceptance remain unverified |

The earlier SQL/REST suite passed all 31 tests on 2026-10-07 in 23.06 seconds. Earlier resource-exhausted runs failed; baseline WebAssembly compilation avoids the optimizing compiler memory spike. Only this project's generated caches were removed. Re-run the entire pipeline on a machine/CI runner with enough space and memory before release. Dependency audit has unresolved advisories; see DEPENDENCY_AUDIT.md. Passing builds and tests do not remove that release gate.

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
8. Real staff bootstrap and MFA recovery/provisioning policy; full admin users/profiles/verification/evidence/finance/refunds/boosts/safety/notifications/content/settings/flags/matching/AI/audit sections. Enrollment/challenge UI and guarded bootstrap SQL now exist; hosted enrollment/verification/cookie/access-denial checks pass. Only overview/moderation/photo review administration UI is delivered. Schemas are not functionality.
9. Push tickets/receipts/device retirement, email delivery and complete preferences UI, distributed anti-abuse/cohort rules. Basic request/chat rules are not a complete anti-scam system.
10. DAU/MAU, retention/churn/conversion event pipeline and reporting; deployed monitoring/alerts. Basic counts/events/logging do not constitute complete analytics or operational monitoring.
11. Signed Android/iOS builds, physical-device permissions/push/deep-link tests, native feature parity, store billing, privacy disclosures/age ratings and network/performance/image budgets.
12. WCAG audit, full localization extraction, legal/privacy/subscription/refund/store review; actual hosting IaC/secrets/backups/restore/release/rollback, penetration and scale tests. API Dockerfile/image-publication workflow do not provision a service.

## Next action

Finish production SMTP and bootstrap a real MFA-protected staff account, then complete the hosted staging acceptance journey. Supabase Auth/Storage/Realtime and database setup now have selected live evidence; do not treat those checks as approval of unfinished features. On a resource-capable workstation, finish the remaining product workflows behind disabled flags. This repository remains an implementation in progress until all required release gates pass.
