# Development seed

Catalogs are inserted by migrations. Migration 010 installs exactly four explicitly fictional profiles in the separate `demo_profiles` table for the public interactive preview. It creates no Auth accounts or real member records. Demo sessions expire after 24 hours. An ADMIN or SUPER_ADMIN with authenticator verification can remove all four from the staff dashboard and restore the same four later; real member accounts, matches and messages are unaffected.

`development.ts` creates local test users through Supabase Admin Auth only when `NODE_ENV=development` and the project URL is localhost. It must be invoked intentionally. SQL and browser integration fixtures live in tests, never in deployed clients.
