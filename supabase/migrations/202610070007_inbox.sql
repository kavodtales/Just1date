-- Read-only inbox metadata. Caller identity and blocked/ended relationships are
-- checked by rpc_matches/can_chat. No presence is inferred from activity times.
create function public.rpc_inbox(before_time timestamptz default null,before_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=public.require_actor(true); result jsonb;
begin
  select coalesce(jsonb_agg(item || jsonb_build_object(
    'last_message', (select jsonb_build_object('body', case when x.deleted_at is null then left(x.body,120) else null end,'created_at',x.created_at,'sender_id',x.sender_id,'deleted',x.deleted_at is not null) from public.messages x where x.conversation_id=(item->>'conversation_id')::uuid order by x.created_at desc,x.id desc limit 1),
    'unread_count', (select count(*) from public.messages x join public.conversation_members cm on cm.conversation_id=x.conversation_id and cm.user_id=actor where x.conversation_id=(item->>'conversation_id')::uuid and x.sender_id<>actor and x.deleted_at is null and x.created_at>coalesce(cm.last_read_at,'-infinity'::timestamptz))
  ) order by (item->>'created_at')::timestamptz desc,(item->>'id')::uuid desc),'[]'::jsonb) into result
  from jsonb_array_elements(public.rpc_matches(before_time,before_id)) item;
  return result;
end $$;
revoke all on function public.rpc_inbox(timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.rpc_inbox(timestamptz,uuid) to service_role;
create index if not exists messages_unread_idx on public.messages(conversation_id,created_at) where deleted_at is null;

-- Real, configurable catalog options represented in the supplied design.
insert into public.interests(code,name) values
('shopping','Shopping'),('karaoke','Karaoke'),('yoga','Yoga'),('tennis','Tennis'),
('running','Run'),('swimming','Swimming'),('extreme','Extreme sports'),('gaming','Video games')
on conflict(code) do nothing;
