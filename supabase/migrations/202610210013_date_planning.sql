-- Evolve the existing date-planning table; retain legacy personal plans.
alter table public.date_plans
 add column activity text not null default 'coffee' check(activity in('coffee','dinner','gallery','walk')),
 add column note text not null default '' check(length(note)<=500),
 add column status text not null default 'proposed' check(status in('proposed','accepted','declined','cancelled')),
 add column operation_id uuid,
 add column revision integer not null default 0,
 add column updated_at timestamptz not null default now(),
 add constraint date_operation_unique unique(user_id,operation_id);
create index date_plans_match_time on public.date_plans(match_id,starts_at);
create policy date_plans_matched_read on public.date_plans for select to authenticated using(public.own_match_access(match_id));

create function public.rpc_date_plans() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=public.require_actor(true);
begin return coalesce((select jsonb_agg(to_jsonb(x) order by starts_at desc) from (
 select d.id,d.match_id,d.user_id proposer_id,d.activity,d.venue,d.starts_at,d.note,d.status,d.revision,d.created_at,d.user_id=actor is_sender,p.display_name other_name
 from public.date_plans d join public.conversations c on c.match_id=d.match_id join public.matches m on m.id=d.match_id join public.profiles p on p.user_id=case when m.user_a=actor then m.user_b else m.user_a end
 where public.can_chat(c.id,actor) order by d.starts_at desc limit 100)x),'[]'::jsonb);end $$;
create function public.rpc_date_propose(payload jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=public.require_actor(true);mid uuid:=(payload->>'match_id')::uuid;op uuid:=(payload->>'operation_id')::uuid;starts timestamptz:=(payload->>'starts_at')::timestamptz;previous public.date_plans;result public.date_plans;target uuid;
begin
 perform 1 from public.matches where id=mid for update;
 if not exists(select 1 from public.conversations c where c.match_id=mid and public.can_chat(c.id,actor)) then raise exception 'MATCH_UNAVAILABLE';end if;
 select * into previous from public.date_plans where user_id=actor and operation_id=op;
 if found then
  if previous.match_id<>mid or previous.activity<>payload->>'activity' or previous.venue<>trim(payload->>'venue') or previous.starts_at<>starts or previous.note<>coalesce(trim(payload->>'note'),'') then raise exception 'IDEMPOTENCY_CONFLICT';end if;
  return to_jsonb(previous);
 end if;
 if op is null or starts is null or starts<=now()+interval '15 minutes' or starts>now()+interval '90 days' or coalesce(payload->>'activity','') not in('coffee','dinner','gallery','walk') or length(coalesce(trim(payload->>'venue'),'')) not between 3 and 160 or length(coalesce(payload->>'note',''))>500 then raise exception 'INVALID_DATE_PLAN';end if;
 if (select count(*) from public.date_plans where user_id=actor and created_at>now()-interval '24 hours')>=10 then raise exception 'DATE_LIMIT';end if;
 if (select count(*) from public.date_plans where match_id=mid and status in('proposed','accepted') and starts_at>now())>=3 then raise exception 'DATE_LIMIT';end if;
 insert into public.date_plans(user_id,match_id,venue,starts_at,activity,note,operation_id) values(actor,mid,trim(payload->>'venue'),starts,payload->>'activity',coalesce(trim(payload->>'note'),''),op) returning * into result;
 select case when user_a=actor then user_b else user_a end into target from public.matches where id=mid;
 perform public.notify(target,'date','You have a Just One Date invitation',result.id);
 insert into public.audit_logs(actor_id,action,resource_id,metadata) values(actor,'date_proposed',result.id,jsonb_build_object('match_id',mid));
 return to_jsonb(result);
end $$;
create function public.rpc_date_action(plan_id uuid,action_value text,expected_revision int) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=public.require_actor(true);mid uuid;plan public.date_plans;target uuid;next_status text;
begin
 select match_id into mid from public.date_plans where id=plan_id;
 if mid is null then raise exception 'DATE_UNAVAILABLE';end if;
 perform 1 from public.matches where id=mid for update;
 if not exists(select 1 from public.conversations c where c.match_id=mid and public.can_chat(c.id,actor)) then raise exception 'DATE_UNAVAILABLE';end if;
 select * into plan from public.date_plans where id=plan_id for update;
 if action_value is null or action_value not in('accept','decline','cancel') then raise exception 'INVALID_DATE_PLAN';end if;
 if action_value in('accept','decline') and plan.user_id=actor then raise exception 'DATE_FORBIDDEN';end if;
 next_status:=case action_value when 'accept' then 'accepted' when 'decline' then 'declined' else 'cancelled' end;
 if plan.status=next_status then return to_jsonb(plan);end if;
 if expected_revision is null or expected_revision<>plan.revision or plan.starts_at<=now() or (action_value in('accept','decline') and plan.status<>'proposed') or (action_value='cancel' and plan.status not in('proposed','accepted')) then raise exception 'DATE_CONFLICT';end if;
 update public.date_plans set status=next_status,revision=revision+1,updated_at=now() where id=plan_id returning * into plan;
 select case when user_a=actor then user_b else user_a end into target from public.matches where id=mid;
 perform public.notify(target,'date','Your Just One Date plan was updated',plan.id);
 insert into public.audit_logs(actor_id,action,resource_id,metadata) values(actor,'date_'||next_status,plan.id,jsonb_build_object('revision',plan.revision));
 return to_jsonb(plan);
end $$;
create function public.close_match_date_plans() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin if old.ended_at is null and new.ended_at is not null then update public.date_plans set status='cancelled',revision=revision+1,updated_at=now() where match_id=new.id and status in('proposed','accepted');end if;return new;end $$;
create trigger close_match_date_plans after update of ended_at on public.matches for each row execute function public.close_match_date_plans();
revoke all on function public.rpc_date_plans(),public.rpc_date_propose(jsonb),public.rpc_date_action(uuid,text,int),public.close_match_date_plans() from public,anon,authenticated;
grant execute on function public.rpc_date_plans(),public.rpc_date_propose(jsonb),public.rpc_date_action(uuid,text,int),public.close_match_date_plans() to service_role;

-- Only freshly generated, explicitly fictional editorial/demo photography ships.
update public.demo_profiles set image='/images/editorial/'||lower(name)||'.webp';
insert into public.audit_logs(action,metadata) select 'app_photography_replaced',jsonb_build_object('slot',slot,'previous_key',storage_key,'source','original_ai_editorial_2026_10_21') from public.app_media_slots where storage_key is not null;
update public.app_media_slots set storage_key=null,alt_text='',revision=revision+1,updated_at=now(),updated_by=null where storage_key is not null;
alter table public.app_media_slots drop constraint app_media_slots_slot_check;
alter table public.app_media_slots add constraint app_media_slots_slot_check check(slot in('welcome_algorithm','welcome_matches','welcome_premium','landing_hero','date_venue'));
insert into public.app_media_slots(slot) values('landing_hero'),('date_venue');
