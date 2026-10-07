-- Immutable quota usage survives unmatching. Removing a relationship must not reset daily limits.
create table public.interaction_operations(id uuid primary key, user_id uuid not null references public.users(id) on delete cascade, target_id uuid not null references public.users(id) on delete cascade, action text not null check(action in('like','super_like','pass')), charged boolean not null default false, response jsonb, created_at timestamptz not null default now());
alter table public.interaction_operations enable row level security;
revoke all on public.interaction_operations from anon,authenticated;
grant all on public.interaction_operations to service_role;
create index interaction_operations_quota_idx on public.interaction_operations(user_id,created_at) where charged;
create index interaction_operations_target_idx on public.interaction_operations(target_id);

-- Preserve the tested matching transaction and wrap it with durable operation identity.
alter function public.rpc_interact(uuid,uuid,text) rename to interact_transaction;
create function public.rpc_interact(target uuid,operation uuid,action text) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=public.require_actor(true); previous public.interaction_operations; result jsonb; quota int; used int; charge boolean; existing_match uuid; existing_conversation uuid;
begin
 if target=actor or action not in('like','super_like','pass') then raise exception 'INVALID_INTERACTION';end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,11));
 perform pg_advisory_xact_lock(hashtextextended(least(actor,target)::text||greatest(actor,target)::text,12));
 if not public.eligible_pair(actor,target) then raise exception 'PROFILE_UNAVAILABLE';end if;
 select * into previous from public.interaction_operations where id=operation;
 if found then
  if previous.user_id<>actor or previous.target_id<>target or previous.action<>action then raise exception 'IDEMPOTENCY_CONFLICT';end if;
  if action='pass' then return previous.response;end if;
  select m.id,c.id into existing_match,existing_conversation from public.matches m join public.conversations c on c.match_id=m.id where m.user_a=least(actor,target) and m.user_b=greatest(actor,target) and m.ended_at is null;
  return jsonb_build_object('matched',existing_match is not null,'match_id',existing_match,'conversation_id',existing_conversation);
 end if;
 charge:=action<>'pass' and not exists(select 1 from public.likes where user_id=actor and target_id=target);
 if charge then
  quota:=coalesce((public.entitlements(actor)->>'daily_likes')::int,0);
  select count(*) into used from public.interaction_operations where user_id=actor and charged and created_at>=date_trunc('day',now());
  if used>=quota then raise exception 'DAILY_LIMIT';end if;
  if action='super_like' then
   select count(*) into used from public.interaction_operations where user_id=actor and charged and action='super_like' and created_at>=date_trunc('day',now());
   if used>=coalesce((public.entitlements(actor)->>'super_likes')::int,0) then raise exception 'PREMIUM_REQUIRED';end if;
  end if;
 end if;
 result:=public.interact_transaction(target,operation,action);
 insert into public.interaction_operations(id,user_id,target_id,action,charged,response) values(operation,actor,target,action,charge,result);
 return result;
end $$;
revoke all on function public.rpc_interact(uuid,uuid,text),public.interact_transaction(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.rpc_interact(uuid,uuid,text),public.interact_transaction(uuid,uuid,text) to service_role;

-- Pagination is enforced even if a client omits its cursor.
drop function public.rpc_matches();
create function public.rpc_matches(before_time timestamptz default null,before_id uuid default null) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=public.require_actor(true);
begin return coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'conversation_id',m.cid,'created_at',m.created_at,'profile',public.profile_projection(case when m.user_a=actor then m.user_b else m.user_a end)) order by m.created_at desc,m.id desc) from (select x.*,c.id cid from public.matches x join public.conversations c on c.match_id=x.id where public.can_chat(c.id,actor) and (before_time is null or (x.created_at,x.id)<(before_time,before_id)) order by x.created_at desc,x.id desc limit 30)m),'[]'::jsonb);end $$;
revoke all on function public.rpc_matches(timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.rpc_matches(timestamptz,uuid) to service_role;

-- Strictly private typing channels. Check membership against the signed-in actor.
create function public.realtime_topic_access(topic text) returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$
begin if topic !~ '^conversation:[0-9a-f-]{36}$' then return false;end if;return public.can_chat(substring(topic from 14)::uuid,auth.uid());exception when invalid_text_representation then return false;end $$;
revoke all on function public.realtime_topic_access(text) from public,anon;
grant execute on function public.realtime_topic_access(text) to authenticated,service_role;
do $$ begin if to_regclass('realtime.messages') is not null then
 create policy just1date_typing_read on realtime.messages for select to authenticated using(extension='broadcast' and public.realtime_topic_access(realtime.topic()));
 create policy just1date_typing_send on realtime.messages for insert to authenticated with check(extension='broadcast' and public.realtime_topic_access(realtime.topic()));
end if;end $$;
