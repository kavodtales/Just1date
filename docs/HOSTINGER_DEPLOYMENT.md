# Just1date on Hostinger

The existing Business Web Hosting account supports Node.js 24, Next.js and Express, but on 26 November 2026 the Hostinger panel reported **resource limits reached**. Its Max Processes chart repeatedly hit 120/120. Do not add three live Node processes to that plan until capacity is restored; the other websites on the same plan could slow down or fail. The setup wizard offered a temporary domain, `perky-slategray-salamander-11.hostingersite.com`, but no deployment was submitted.

Hostinger's managed Node service runs one server per website. Create separate websites from the existing Just1date repository for member web, API and staff admin. Use Node 24, npm, repository root `./` so npm workspaces resolve, and these settings:

| Website | Framework | Build command | Output directory | Entry file |
| --- | --- | --- | --- | --- |
| Member web | Next.js | `npm run build -w @just1date/web` | `apps/web/.next` | `scripts/hostinger-web.mjs` |
| API | Express | `npm run build -w @just1date/api` | `apps/api/dist` | `apps/api/dist/server.js` |
| Staff admin | Next.js | `npm run build -w @just1date/admin` | `apps/admin/.next` | `scripts/hostinger-admin.mjs` |

The two Hostinger entry files use the existing standalone Next server, copy static/public assets and bind to the Hostinger-supplied `PORT`. Keep them in the monorepo, because standalone tracing depends on workspace paths.

Set variables separately in Hostinger's environment settings, without committing local `.env` files. Member web needs `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `API_URL` pointing to the new API origin. Staff admin needs the same three values. API requires `NODE_ENV=production`, `DATABASE_URL`, verified `DATABASE_SSL=true` and CA settings, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_URL`, `ADMIN_URL`, and `CORS_ORIGINS` for the actual web/admin origins. Let Hostinger supply `PORT`. Keep paid/AI/video options disabled until their providers and acceptance tests are complete.

Supabase currently returns DNS `ENOTFOUND`, so moving Node servers will not restore accounts, matches, messages or dates. Restore the existing project and preserve its data before live acceptance. Update Supabase Auth callback allowlists after final Hostinger origins are known. Do not cut over a public domain until all three temporary URLs, TLS, login/recovery, member isolation, staff MFA, photos, reports and API health pass.

Hostinger managed Node hosting does not support an always-running background worker or inbound WebSockets. The existing notification/call worker needs a separate supported host; LiveKit remains the media service for consented video calls. Hostinger's MySQL offering does not replace the current PostgreSQL/Supabase schema, Auth, Storage and Realtime without a separate migration.

Sources: [Hostinger Node app setup](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/), [monorepo deployment](https://www.hostinger.com/support/how-to-deploy-monorepos-with-npm-yarn-or-pnpm-on-hostinger/), [managed Node limits](https://www.hostinger.com/support/hostinger-node-js-limits-for-web-and-cloud-plans/).
