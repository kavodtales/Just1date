# Reference redesign phase

PHASE: Reference-driven web/mobile UI and authorized GitHub upload

Completed: white/pink design system; supplied brand and introductory artwork;
responsive shell; four-icon mobile navigation; functional discovery reactions,
web pointer swiping and keyboard controls; native gestures; match celebration;
filter sheets; photo-based connection grids; inbox search/previews/unread counts;
chat sheet styling; profile hero/gallery/read-more; birthday calendar; email and
registered-phone OTP flows; fifteen-step native onboarding; native notification
permission screen; shared legal documents; transparent disabled contact/social
availability. See `design/README.md` for reference mapping and differences.

Files changed: web components/styles/routes/public assets; mobile components,
routes/assets/font configuration; shared config/legal documents; API photo signing
and social projections; migration 007; reference assets, browser tests and docs.

Database changes: migration `202610070007_inbox.sql` adds service-only `rpc_inbox`,
unread-message index and additional real interest catalog options. No hosted
production schema was changed.

API changes: matches/likes/inbox now return signed approved photo URLs instead of
storage keys. `GET /conversations` includes membership-authorized message preview
and unread count; matches/inbox accept a timestamp/UUID cursor pair. Web BFF phone
send/verify actions maintain secure session cookies and the existing age-gated
registration model.

Tests: final measured results are recorded in STATUS.md. Fixture browser tests
verify layout/control behavior; SQL/REST integration tests verify actual data
transactions and authorization. Provider credentials are still absent.

Known issues: full pixel equivalence for all references and physical native-device
visual QA are unverified. Six-digit OTP, inclusive preferences, truthful unavailable
features and corrected marketing claims differ intentionally from references.
Stories, contact matching, social sign-in, native media/presence and original
production release gates remain outstanding. Dependency audit has unresolved
advisories and cannot be called clean.

Next phase: configure staging services, test the complete authenticated/provider
journey, resolve release gates and run native device/visual/accessibility audits.
