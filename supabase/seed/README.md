# Development seed

Catalogs are inserted by migrations. Fake profiles are never included in production migrations. `development.ts` creates explicitly labeled test users through Supabase Admin Auth only when `NODE_ENV=development` and the project URL is localhost. It must be invoked intentionally. SQL integration fixtures live in tests, never in deployed clients.
