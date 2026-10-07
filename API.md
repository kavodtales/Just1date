# API contract

REST `/v1`, JSON request/response, bearer Supabase access token, HTTPS in production. Browser sessions use Supabase SSR cookies in the Next BFF; the API does not accept cookie authentication. Mutating BFF routes require same-origin checks. Mobile uses SecureStore and bearer tokens. UUID operation keys for likes and messages are reused across retries. Payments require `Idempotency-Key`. Lists use bounded cursors. All error responses contain `{ error: { code, message, status, request_id } }`; success is `{ data, request_id }`.

OpenAPI is generated at `/openapi.json`. Public endpoints: health, readiness, signup, password login, recovery, verification and catalogs. Supabase handles password hashing, verification/OTP, token refresh and recovery proof. Session endpoints and profile/interaction/chat/safety/billing/AI require a validated member identity. Admin routes require a database role, active admin record, and role-specific permission. Production admin MFA is a launch requirement.

Modules: `/auth/*`, `/profiles/me`, `/profiles/discover`, `/profiles/:id`, `/likes`, `/passes`, `/super-likes`, `/matches`, `/conversations`, `/conversations/:id/messages`, `/reports`, `/blocks`, `/notifications`, `/subscriptions/plans`, `/subscriptions/me`, `/payments/initialize`, `/payments/webhook`, `/verification`, `/safety/sessions`, `/safety/contacts`, `/privacy`, `/account/export`, `/account/deletion`, `/ai/*`, `/admin/*`.

Unsupported integrations return explicit `FEATURE_UNAVAILABLE` rather than false success. AI suggestions are editable and never auto-sent. Payment callback only prompts authoritative server verification. Paid feature checks run server-side and again in the transaction where relevant. The implemented route inventory and gaps are tracked in docs/STATUS.md.

`GET /conversations` returns authorized active matches with `conversation_id`,
`profile`, `created_at`, `unread_count`, and nullable `last_message` (`body`,
`created_at`, `sender_id`, `deleted`). Preview bodies are capped at 120 characters.
Read acknowledgement updates the caller's membership cursor. Blocks/unmatches
revoke both participants' conversation visibility. Inbox and matches accept paired
`before` (ISO timestamp) / `before_id` (UUID) cursors and return at most 30 rows;
supplying only one cursor is invalid. Approved photo object keys are removed from
member projections and replaced with 120-second signed URLs. Missing photos return
an empty array, never sample photography.

The same-origin web `/api/auth` BFF accepts `phone_send` (E.164 `phone`) and
`phone_verify` (`phone`, six-digit `token`) for registered-number SMS sign-in.
Sessions are maintained through Supabase SSR cookies. These actions do not create
new unverified-age accounts. SMS configuration and a registered phone are required.
