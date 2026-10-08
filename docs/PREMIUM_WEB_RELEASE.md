# Premium web update — 8 October 2026

The member app has a new ivory, sage and berry design, generated fictional portrait photography, responsive navigation, clearer authentication and a single profile setup form. Real discovery, matches, private photos and messages continue to use authenticated application services.

## Try the app

Open https://just1date-vert.vercel.app/demo. Exactly four labeled fictional adults are available: Amara, Tomi, Zara and Daniel. No registration is needed to try profile details, gender filters, passing, sample matches and sample conversations. Likes and chat history persist in a private 24-hour session. Replies are explicitly scripted. Reset clears your own preview progress.

The preview never seeds Supabase Auth users or real member profiles. Anonymous browser roles cannot select or update its tables. The API validates a signed session token; the member server keeps that token in an HttpOnly cookie. Cross-origin mutations are rejected. Messages have bounded lengths and idempotency keys, and requests use shared PostgreSQL limits.

## Remove the four profiles

At https://just1date-admin.vercel.app, sign into a real staff account, verify your authenticator, then open **Demo profiles → Remove all four**. Review the confirmation before removing. Real accounts, matches and conversations are untouched. The same four profiles can be restored; deleted preview sessions and sample chat history are not restored. Changes are audited. Moderators without settings permission cannot remove or restore profiles.

Production currently has no assigned staff account. The owner must identify their confirmed adult member account and enroll an authenticator before using `supabase/setup/bootstrap-admin.sql`. Custom SMTP is still disabled; public confirmation and recovery delivery require a verified sender/provider and inbox acceptance testing.

## Verification scope

- 51 unit, SQL and REST tests pass, including demo isolation, tampered/expired sessions, message idempotency, removal/restoration and staff permissions.
- 39 member browser tests pass at three viewport sizes, with three credential-gated staging cases skipped. Four staff browser tests pass on desktop/mobile and cover confirmation, cancellation, removal, restoration and moderator denial. Their network boundaries use explicit test fixtures; they do not prove an entire hosted real-member journey.
- Eight real Supabase configuration checks and nineteen real Auth, Storage and Realtime checks pass after migration 010. There are ten applied migrations and 59 RLS-enabled public tables.
- Fifteen checks passed through the local production frontend backed by actual Supabase, including persisted demo messages, private cookies, CSRF rejection and session isolation. The hosted probe additionally checks Secure cookies.
- Web, staff and API production builds pass. Lint and workspace TypeScript checks pass. Local private credentials are absent from tracked/new repository files and both browser bundles.

Run `npm run demo:probe` and `npm run hosted:probe` after deployment to check the actual public domains. The demo probe creates only expiring fictional-preview sessions. Hosted provider probes create disposable hidden accounts and clean them up. Neither proves SMTP delivery, payment behavior or a fully reviewed public launch. Remaining acceptance and product work is recorded in [STATUS.md](STATUS.md).

Portrait assets and their generation prompts are recorded in [demo-portraits.md](../design/demo-portraits.md).
