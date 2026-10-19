-- Private, consensual two-person video calls. No media or recordings are stored.
create table public.call_sessions (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id),
  caller_id uuid not null references public.users(id),
  recipient_id uuid not null references public.users(id),
  operation_id uuid not null,
  room_name text not null unique default ('j1d-' || gen_random_uuid()::text),
  status text not null default 'ringing' check (status in ('ringing','accepted','declined','cancelled','missed','ended')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '60 seconds',
  accepted_at timestamptz,
  ended_at timestamptz,
  ended_by uuid references public.users(id),
  unique(caller_id,operation_id),
  check(caller_id <> recipient_id),
  check(expires_at > created_at),
  check((status in ('ringing','accepted')) = (ended_at is null))
);
create unique index call_one_per_conversation on public.call_sessions(conversation_id) where status in ('ringing','accepted');
create index call_recipient_ring on public.call_sessions(recipient_id,expires_at) where status='ringing';
create index call_caller_history on public.call_sessions(caller_id,created_at desc);
create index call_expiry on public.call_sessions(expires_at) where status in ('ringing','accepted');
create index call_conversation_fk on public.call_sessions(conversation_id);
create index call_recipient_fk on public.call_sessions(recipient_id);
create index call_ended_by_fk on public.call_sessions(ended_by);

create table public.call_room_cleanup (
  call_id uuid primary key references public.call_sessions(id),
  attempts integer not null default 0 check(attempts>=0),
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  completed_at timestamptz,
  last_error_code text
);
create index call_cleanup_ready on public.call_room_cleanup(available_at) where completed_at is null;
create table public.call_service_health (
  id boolean primary key default true check(id),
  heartbeat_at timestamptz not null
);
alter table public.call_sessions enable row level security;
alter table public.call_room_cleanup enable row level security;
alter table public.call_service_health enable row level security;
revoke all on public.call_sessions,public.call_room_cleanup,public.call_service_health from anon,authenticated;
grant select on public.call_sessions to authenticated;
grant all on public.call_sessions,public.call_room_cleanup,public.call_service_health to service_role;
create policy call_member_read on public.call_sessions for select to authenticated
using(auth.uid() in(caller_id,recipient_id) and public.can_chat(conversation_id,auth.uid()));
alter table public.call_sessions replica identity full;
do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    alter publication supabase_realtime add table public.call_sessions;
  end if;
end $$;

create function public.queue_call_cleanup() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if new.status not in ('ringing','accepted') then
    insert into public.call_room_cleanup(call_id) values(new.id) on conflict(call_id) do nothing;
  end if;
  return new;
end $$;
create trigger call_cleanup after update of status on public.call_sessions for each row execute function public.queue_call_cleanup();

create function public.call_projection(c public.call_sessions,a uuid) returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select to_jsonb(c) || jsonb_build_object('is_caller',c.caller_id=a,'other_user_id',p.user_id,'other_name',p.display_name)
 from public.profiles p where p.user_id=case when c.caller_id=a then c.recipient_id else c.caller_id end
$$;
create function public.rpc_call_start(cid uuid,op uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare a uuid:=public.require_actor(true); b uuid; c public.call_sessions;
begin
 if not public.can_chat(cid,a) then raise exception 'CONVERSATION_UNAVAILABLE'; end if;
 select user_id into b from public.conversation_members where conversation_id=cid and user_id<>a;
 if b is null then raise exception 'CONVERSATION_UNAVAILABLE'; end if;
 -- Consistent row-lock order prevents simultaneous calls in separate conversations.
 perform id from public.users where id in(a,b) order by id for update;
 if not public.can_chat(cid,a) then raise exception 'CONVERSATION_UNAVAILABLE'; end if;
 select * into c from public.call_sessions where caller_id=a and operation_id=op;
 if found then
   if c.conversation_id<>cid then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
   return public.call_projection(c,a);
 end if;
 update public.call_sessions set status=case when status='ringing' then 'missed' else 'ended' end,ended_at=now()
 where status in('ringing','accepted') and expires_at<=now() and (caller_id in(a,b) or recipient_id in(a,b));
 if exists(select 1 from public.call_sessions where status in('ringing','accepted') and (caller_id in(a,b) or recipient_id in(a,b))) then raise exception 'CALL_BUSY'; end if;
 if (select count(*) from public.call_sessions where caller_id=a and created_at>now()-interval '24 hours')>=20
 or exists(select 1 from public.call_sessions where caller_id=a and created_at>now()-interval '30 seconds') then raise exception 'CALL_LIMIT'; end if;
 insert into public.call_sessions(conversation_id,caller_id,recipient_id,operation_id) values(cid,a,b,op) returning * into c;
 perform public.notify(b,'call','A match is inviting you to a video call',c.id);
 return public.call_projection(c,a);
end $$;
create function public.rpc_call_get(cid uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare a uuid:=public.require_actor(true); c public.call_sessions;
begin
 select * into c from public.call_sessions where id=cid and a in(caller_id,recipient_id) for update;
 if not found or not public.can_chat(c.conversation_id,a) then raise exception 'CALL_UNAVAILABLE'; end if;
 if c.status in('ringing','accepted') and c.expires_at<=now() then
   update public.call_sessions set status=case when status='ringing' then 'missed' else 'ended' end,ended_at=now() where id=cid returning * into c;
 end if;
 return public.call_projection(c,a);
end $$;
create function public.rpc_call_action(cid uuid,action text) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare a uuid:=public.require_actor(true); c public.call_sessions;
begin
 perform public.rpc_call_get(cid);
 select * into c from public.call_sessions where id=cid for update;
 if action='accept' then
   if c.recipient_id<>a then raise exception 'FORBIDDEN'; end if;
   if c.status='accepted' then return public.call_projection(c,a); end if;
   if c.status<>'ringing' then raise exception 'CALL_STATE_CONFLICT'; end if;
   update public.call_sessions set status='accepted',accepted_at=now(),expires_at=now()+interval '30 minutes' where id=cid returning * into c;
 elsif action='decline' then
   if c.recipient_id<>a then raise exception 'FORBIDDEN'; end if;
   if c.status='declined' then return public.call_projection(c,a); end if;
   if c.status<>'ringing' then raise exception 'CALL_STATE_CONFLICT'; end if;
   update public.call_sessions set status='declined',ended_at=now(),ended_by=a where id=cid returning * into c;
 elsif action='end' then
   if c.status not in('ringing','accepted') then return public.call_projection(c,a); end if;
   update public.call_sessions set status=case when status='ringing' then 'cancelled' else 'ended' end,ended_at=now(),ended_by=a where id=cid returning * into c;
 else raise exception 'CALL_STATE_CONFLICT'; end if;
 return public.call_projection(c,a);
end $$;
create function public.rpc_call_incoming() returns jsonb language sql security definer set search_path=public,pg_temp as $$
 select coalesce(jsonb_agg(public.call_projection(c,auth.uid())),'[]'::jsonb)
 from public.call_sessions c where recipient_id=auth.uid() and status='ringing' and expires_at>now() and public.can_chat(conversation_id,auth.uid())
$$;

create function public.revoke_member_calls() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if tg_table_name='blocks' then
   update public.call_sessions set status='ended',ended_at=now() where status in('ringing','accepted') and ((caller_id=new.user_id and recipient_id=new.target_id) or (caller_id=new.target_id and recipient_id=new.user_id));
 elsif tg_table_name='matches' then
   if new.ended_at is not null then
     update public.call_sessions set status='ended',ended_at=now() where status in('ringing','accepted') and conversation_id in(select id from public.conversations where match_id=new.id);
   end if;
 elsif new.status<>'ACTIVE' then
   update public.call_sessions set status='ended',ended_at=now() where status in('ringing','accepted') and new.id in(caller_id,recipient_id);
 end if;
 return new;
end $$;
create trigger calls_block_revocation after insert on public.blocks for each row execute function public.revoke_member_calls();
create trigger calls_unmatch_revocation after update of ended_at on public.matches for each row execute function public.revoke_member_calls();
create trigger calls_account_revocation after update of status on public.users for each row execute function public.revoke_member_calls();

revoke all on function public.queue_call_cleanup(),public.call_projection(public.call_sessions,uuid),public.rpc_call_start(uuid,uuid),public.rpc_call_get(uuid),public.rpc_call_action(uuid,text),public.rpc_call_incoming(),public.revoke_member_calls() from public,anon,authenticated;
grant execute on function public.queue_call_cleanup(),public.call_projection(public.call_sessions,uuid),public.rpc_call_start(uuid,uuid),public.rpc_call_get(uuid),public.rpc_call_action(uuid,text),public.rpc_call_incoming(),public.revoke_member_calls() to service_role;
