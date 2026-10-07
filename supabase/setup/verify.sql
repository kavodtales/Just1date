-- Read-only checks after production.sql. Run as database owner.
select name,checksum,applied_at from public.schema_migrations order by name;
-- Expected: 56 public tables (55 app tables and the migration ledger); zero without RLS.
select count(*) as public_tables, count(*) filter(where not rowsecurity) as missing_rls
from pg_tables where schemaname='public';
select tablename from pg_tables where schemaname='public' and not rowsecurity;
-- Both buckets must be private; allowed MIME is image/jpeg, limit is 5 MiB.
select id,public,file_size_limit,allowed_mime_types from storage.buckets
where id in ('profile-photos','verification-evidence');
select tablename from pg_publication_tables where pubname='supabase_realtime';
select policyname,cmd,roles from pg_policies where schemaname='realtime';
-- Expected: zero application RPCs callable by anon/authenticated.
select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname like 'rpc_%'
and (has_function_privilege('anon',p.oid,'execute') or has_function_privilege('authenticated',p.oid,'execute'));
select key,value from public.app_settings where key='minimum_age';
select code,amount_minor,currency,period_days,purchasable from public.subscription_plans order by code;
-- Expected: zero development test accounts in production.
select count(*) as test_accounts from public.users where is_test;
