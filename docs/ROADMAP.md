# Delivery roadmap

Phases follow the user specification. A phase is not complete without acceptance tests. See STATUS.md and PHASE_REPORTS.md for delivered work and remaining gates.

1. Architecture: decisions, ERD, module boundaries, environment catalog and workspace.
2. Database: ordered full relational schema, grants/RLS, catalog seeds, SQL integration tests. Hosted Supabase validation follows credential provisioning.
3. Authentication: Supabase email/password, recovery, OTP/session/deletion architecture, age gating; provider integration tests require a project.
4. Profiles: validated onboard/edit/preferences/prompts/photo quarantine and completion.
5. Discovery: mutual preference filters, paginated profiles, gesture/button controls, quota-limited operations; complete search and paid filters.
6. Matching: configurable compatibility, atomic mutual match/conversation/outbox, block/unmatch revocation; ranking/load evaluation and boosts.
7. Messaging: cursor text, replies, reactions, tombstones, membership, realtime; safe media/voice/GIF and native parity.
8. AI: explainable privacy-limited adapter, flags, entitlements and reviewable suggestions; consent/budgets/evaluation/profile coaching/reranking.
9. Billing: DB plans, Paystack initialize/verify/webhook, fixed periods/cancellation; sandbox acceptance, recurring/refund/store billing.
10. Safety: reports/blocks, moderation, verification, date sessions/contacts; real alert delivery, retention and complete erasure.
11. Admin: staff MFA, permissioned review/audit; complete finance/users/settings/evidence/analytics workflows.
12. Mobile: native feature parity, device permissions/realtime/push/deep links, signed Android/iOS builds and store review.
13. Web: responsive real service screens, all UX states, full staging journey, WCAG/network/performance QA.
14. QA/deployment: unit/SQL/API/browser/device tests, hosted integration, actual infrastructure, load/security/legal/restore/release gates.

Future features remain disabled until their backend, privacy controls and release tests exist. Prioritize a secure tested core over superficial menus. docs/STATUS.md records every feature's real implementation state and outstanding dependencies.
