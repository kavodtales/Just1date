-- Promotional photography is separate from private member photographs.
create table public.app_media_slots (
 slot text primary key check(slot in ('welcome_algorithm','welcome_matches','welcome_premium')),
 storage_key text unique,
 alt_text text not null default '' check(length(alt_text)<=180),
 revision integer not null default 0 check(revision>=0),
 updated_at timestamptz not null default now(),
 updated_by uuid references public.users(id)
);
alter table public.app_media_slots enable row level security;
revoke all on public.app_media_slots from public,anon,authenticated;
grant all on public.app_media_slots to service_role;
insert into public.app_media_slots(slot) values('welcome_algorithm'),('welcome_matches'),('welcome_premium');

create function public.rpc_admin_app_media() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform public.require_admin('settings');
 return (select jsonb_agg(to_jsonb(s) order by slot) from public.app_media_slots s);
end $$;
create function public.rpc_admin_publish_media(slot_value text,expected_revision int,key_value text,description text) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=public.require_admin('settings'); previous public.app_media_slots; result public.app_media_slots;
begin
 select * into previous from public.app_media_slots where slot=slot_value for update;
 if not found then raise exception 'MEDIA_UNAVAILABLE';end if;
 if expected_revision is null or previous.revision<>expected_revision then raise exception 'MEDIA_CONFLICT';end if;
 if key_value is not null and (key_value !~ ('^'||actor::text||'/[a-f0-9-]{36}[.]jpg$') or length(trim(coalesce(description,''))) not between 3 and 180) then raise exception 'INVALID_MEDIA';end if;
 update public.app_media_slots set storage_key=key_value,alt_text=case when key_value is null then '' else trim(description) end,revision=revision+1,updated_at=now(),updated_by=actor where slot=slot_value returning * into result;
 insert into public.audit_logs(actor_id,action,metadata) values(actor,case when key_value is null then 'app_image_reset' else 'app_image_published' end,jsonb_build_object('slot',slot_value,'revision',result.revision,'previous_key',previous.storage_key,'storage_key',key_value));
 return to_jsonb(result)||jsonb_build_object('previous_key',previous.storage_key);
end $$;
revoke all on function public.rpc_admin_app_media(),public.rpc_admin_publish_media(text,int,text,text) from public,anon,authenticated;
grant execute on function public.rpc_admin_app_media(),public.rpc_admin_publish_media(text,int,text,text) to service_role;
do $$ begin
 if to_regclass('storage.buckets') is not null then
  insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('app-images','app-images',false,5242880,array['image/jpeg']) on conflict(id) do nothing;
 end if;
end $$;
