# Whaleswealth deployment — 22 October 2026

The owner explicitly selected the existing Whaleswealth `just1date` project.
The redesign is deployed at these public production aliases:

| Service | URL | Vercel project ID | Source root |
| --- | --- | --- | --- |
| Member web/PWA | https://just1date.vercel.app | `prj_MhBYQ0rHTfyGAaHiFTUfqNO7ZUST` | `apps/web` |
| API | https://just1date-api-whaleswealth.vercel.app | `prj_etct6ZzhJuW0m0DYeUDgd2ViR5TQ` | `apps/api` |
| Staff | https://just1date-admin-whaleswealth.vercel.app | `prj_NDrfAnrra1EQHF1LYRRVVkKp7t1z` | `apps/admin` |

All three now use `Bluechipwhale/Just1date`, production branch `main`, Node 24,
workspace source inclusion and the checked-in app-specific Vercel configuration.
The existing web project's stale `Bluechipwhale/edgewforce` connection was
replaced. No other Whaleswealth project was changed. Production aliases are
public; preview deployments retain Vercel authentication. Staff actions still
require app sign-in, a verified second factor and an authorized staff role.

## Repeatable deployment

Use the existing authenticated official Vercel CLI session. From the repository
root, run Node with the environment proxy and system certificate store when the
workstation needs them:

```powershell
$env:NODE_OPTIONS='--max-old-space-size=512 --use-env-proxy --use-system-ca'
node scripts/vercel-whaleswealth.mjs inspect
node scripts/vercel-whaleswealth.mjs deploy api
node scripts/vercel-whaleswealth.mjs deploy web
node scripts/vercel-whaleswealth.mjs deploy admin
```

The helper checks project ownership and identities, and uploads only an
allowlisted source tree (about 2.4 MB compressed). It excludes environment files,
Git history, credentials, signing keys, local caches and native binaries. Private
values are read in memory and sent to the intended service over verified TLS;
they are not printed. The `environment` command updates only named Just1date
keys. Existing unrelated settings are preserved: automatic approval review
rejected bulk deletion because it could lose existing secrets.

The API uses the existing Supabase project `kyfohngqetzsrqsyabey`, its strict-TLS
runtime database connection and applied migrations 001–014. Web and staff builds
receive public Supabase configuration and the server-side API URL. Service-role
and database credentials are configured only for the API in this rollout.
Older kavodtales origins remain in API CORS during migration. Legacy demo photo
aliases remain compatible with the older site; new clients render fresh WebPs.

## Auth callback configuration still required

A temporary-account probe confirmed that Supabase currently substitutes the old
`https://just1date-vert.vercel.app/` redirect when either new web origin or the
native callback is requested. Password sign-in, cookies, profile proxying, MFA
enrollment/verification, role enforcement and logout already pass on the new
deployments. Confirmation and recovery redirects need the project owner to save
these settings in Supabase Auth → URL Configuration:

- Site URL: `https://just1date.vercel.app`
- Add `https://just1date.vercel.app/auth/callback**`
- Add `https://just1date-admin-whaleswealth.vercel.app/auth/callback**`
- Add `just1date://auth/callback**`

Keep existing redirect entries while old builds/site versions remain supported.
Run `node scripts/probe-hosted.mjs` afterward. It creates and removes a temporary
test account, sends no emails, and checks callbacks without printing tokens.

## External launch gates

Live video remains disabled until LiveKit and the continuously running cleanup
worker are configured and a two-person call is accepted. Verified SMTP delivery,
SMS/social providers, payment acceptance and store review remain separate gates.
Owner role activation remains deferred until the nominated owner completes MFA.
An iOS simulator archive is not an iPhone-installable IPA; Apple signing is
required for a device build. No store approval or production-scale guarantee is
claimed by this deployment.
