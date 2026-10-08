# Premium update: live verification — 8 October 2026

Published source: `ba45866e0b69c9111b50915af09fb7cebea9ce0a` in [kavodtales/Just1date](https://github.com/kavodtales/Just1date). The member, API and staff applications use Git-linked production deployments. The final follow-up adjusts only profile-card spacing and desktop readability.

- [Member app](https://just1date-vert.vercel.app) and [four-profile preview](https://just1date-vert.vercel.app/demo).
- [Staff app](https://just1date-admin.vercel.app).
- [API readiness](https://just1date-api.vercel.app/ready).
- [GitHub verification](https://github.com/kavodtales/Just1date/actions/runs/37783454942): clean install, lint, workspace TypeScript, migration checksums, 51 backend tests, builds, Expo exports and both browser suites passed.

## Completed checks

| Check                  | Passed | Scope                                                                                                                              |
| ---------------------- | -----: | ---------------------------------------------------------------------------------------------------------------------------------- |
| Unit / SQL / REST      |     51 | Actual migration SQL with test identity/provider boundaries, demo isolation, idempotency and staff permissions                     |
| Member browsers        |     39 | Desktop, Pixel 7 and 375-pixel UI flows against explicit network fixtures; three prepared-account staging cases skipped            |
| Staff browsers         |      4 | Desktop/mobile removal, cancel, restore and moderator denial against fixtures                                                      |
| Supabase configuration |      8 | Actual project configuration and access restrictions                                                                               |
| Supabase providers     |     19 | Actual Auth, private Storage, notification/typing Realtime isolation, TOTP and cleanup                                             |
| API production runtime |     12 | Actual PostgreSQL/Supabase, authorization, TLS and shared request limits across two runtime instances                              |
| Hosted authentication  |     25 | Public production domains, CSRF, real login, secure HttpOnly cookies, private proxy access, staff TOTP, nonstaff denial and logout |
| Hosted demo            |     16 | Exactly four profiles, secure cookie, persisted chat, session isolation, retry idempotency, preferences and reset                  |

The live browser review also opened registration, profile details, a sample match and a scripted chat. Mobile chat layout fits at 375 pixels. Generated portraits are served by Next.js image optimization. The preview clearly labels fictional profiles and scripted replies. Probe users and their objects were removed; no real member records were changed. Demo sessions expire after 24 hours.

Migration 010 is installed: ten migration checksums match, and all 59 public tables use RLS. The preview uses separate service-only demo tables, never Auth users or real profiles. Removal/restoration requires verified staff MFA plus settings permission and is audited; it leaves real accounts, matches and conversations untouched.

Custom SMTP remains disabled and the owner staff account is not yet assigned. Inbox-based signup/recovery acceptance and the full real-member signup → approved photo → mutual match → chat → report/block journey remain unverified. The three skipped staging tests are not successes. These results do not establish competitor superiority or approval for a complete public launch; see [STATUS.md](STATUS.md) for remaining product and release work.

Private credentials stay in ignored local environment files and Vercel server settings. The repository and both browser bundles passed comparison against the actual local server secrets. Public clients use only the Supabase publishable key.
