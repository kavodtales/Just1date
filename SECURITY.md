# Security model and review requirements

Do not deploy with example secrets or without staging security tests. Supabase Auth validates tokens remotely; actor UUID comes from verified user. Unverified accounts can onboard but cannot discover/message. Signup requires date of birth and the database auth trigger independently rejects underage and invalid dates. DOB cannot be changed by ordinary members. This is age gating, not verified identity; approved identity assurance is still required.

Member database transactions set local role and claims; no shared session claims persist. RLS is deny by default. Read policies require own identity or live membership, active account and no block. Sensitive columns are never exposed through member-wide policies. Server-only helpers revoke PUBLIC execute. Security-definer routines have fixed search paths and check auth.uid, status, membership, quota and both block directions. Dynamic SQL never incorporates user identifiers.

Paystack raw body HMAC-SHA512 is checked with timing-safe comparison. Authoritative provider verification checks success, reference, currency and amount against a locked payment row. Unique reference/event/payment constraints make duplicate settlement harmless. Do not log provider secrets, authorization data or message bodies. Store payments in minor units and disable unavailable plans rather than inventing prices.

Photos require size, actual decoded MIME, pixel limits, EXIF removal and quarantine. Only approved storage keys get short-lived signed URLs. No user-supplied image URL fetches (SSRF). Verification documents are private, inaccessible to general support and have explicit purge deadlines. Messaging attachment scanning is required before enabling media.

Helmet/CSP, strict origin allowlist, secure SSR cookies, same-origin BFF mutations, bounded JSON and upload requests, Zod validation, distributed production rate limiting, redacted Pino logs, generic recovery responses, append-only admin audit records and least privilege secrets. Rate limits and access revocation must also cover direct Supabase RPC; write routines are server-only wherever they depend on API checks.

No automatic bans based solely on AI. Rules flag review cases; human action records a reason and audit. Separate roles SUPER_ADMIN, ADMIN, MODERATOR, SUPPORT, FINANCE, ANALYST with least privilege. Require admin MFA, approved staff onboarding and periodic permission review.

Threats/remaining reviews: distributed abuse, account enumeration, recovery takeover, race conditions, IDOR, webhook replay, realtime authorization, blocked-party history, location privacy, adversarial uploads, retention/export leakage, compromised admin, dependency supply chain. See docs/STATUS.md for actual verification evidence.
