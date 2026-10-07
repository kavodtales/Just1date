-- Supabase-managed schemas are optional only for embedded PostgreSQL tests.
-- Hosted Supabase always has storage/realtime; no public bucket is created.
do $$ begin
 if to_regclass('storage.buckets') is not null then
  insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('profile-photos','profile-photos',false,5242880,array['image/jpeg']),('verification-evidence','verification-evidence',false,5242880,array['image/jpeg']) on conflict(id) do nothing;
  -- No client INSERT/SELECT policies: server validates upload and signs only approved keys.
 end if;
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  alter publication supabase_realtime add table public.messages,public.notifications,public.conversation_members,public.message_reactions;
 end if;
end $$;
