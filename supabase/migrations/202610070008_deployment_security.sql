-- The custom migration ledger is infrastructure, never a client-readable catalog.
create table if not exists public.schema_migrations (
  name text primary key,
  checksum text not null,
  applied_at timestamptz not null default now()
);
alter table public.schema_migrations enable row level security;
revoke all on public.schema_migrations from public, anon, authenticated;
grant all on public.schema_migrations to service_role;

-- If buckets already existed, make their configuration match the upload contract.
do $$ begin
  if to_regclass('storage.buckets') is not null then
    update storage.buckets set public=false, file_size_limit=5242880,
      allowed_mime_types=array['image/jpeg']
    where id in ('profile-photos','verification-evidence');
  end if;
end $$;
