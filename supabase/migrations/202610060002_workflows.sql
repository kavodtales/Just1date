-- Narrow functions are the sole client write path; all authorization is repeated here.
create function public.require_actor(active_required boolean default false) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=auth.uid(); s public.account_status;
begin
 select status into s from public.users where id=actor;
 if actor is null or s is null or s in ('SUSPENDED','BANNED','DELETION_PENDING','DELETED','DEACTIVATED') then raise exception 'ACCOUNT_UNAVAILABLE'; end if;
 if active_required and s<>'ACTIVE' then raise exception 'ONBOARDING_REQUIRED'; end if;
 return actor;
end $$;
create function public.is_blocked(a uuid,b uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$select exists(select 1 from public.blocks where (user_id=a and target_id=b) or (user_id=b and target_id=a))$$;
create function public.can_chat(c uuid,actor uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.conversations x join public.matches m on m.id=x.match_id join public.users a on a.id=m.user_a join public.users b on b.id=m.user_b where x.id=c and m.ended_at is null and actor in(m.user_a,m.user_b) and a.status='ACTIVE' and b.status='ACTIVE' and not public.is_blocked(m.user_a,m.user_b))
$$;
create function public.entitlements(actor uuid) returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce((select p.entitlements from public.subscriptions s join public.subscription_plans p on p.id=s.plan_id where s.user_id=actor and s.status='active' and s.starts_at<=now() and s.ends_at>now() order by (p.entitlements->>'daily_likes')::int desc limit 1),(select entitlements from public.subscription_plans where code='free'))
$$;
create function public.profile_projection(target uuid) returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('user_id',p.user_id,'display_name',p.display_name,'age',extract(year from age(u.date_of_birth))::int,'gender',p.gender,'city',p.city,'bio',p.bio,'profession',p.profession,'education',p.education,'goal',p.goal,'values',p.values,'communication',p.communication,'personality',p.personality,'lifestyle',coalesce(l.preferences,'{}'::jsonb),'interests',coalesce((select jsonb_agg(i.code order by i.code) from public.profile_interests pi join public.interests i on i.id=pi.interest_id where pi.user_id=p.user_id),'[]'::jsonb),'prompts',coalesce((select jsonb_agg(jsonb_build_object('question',question,'answer',answer) order by position) from public.profile_prompts where user_id=p.user_id),'[]'::jsonb),'photo_keys',coalesce((select jsonb_agg(storage_key order by position) from public.profile_photos where user_id=p.user_id and moderation_status='approved'),'[]'::jsonb),'verified',exists(select 1 from public.profile_verifications v where v.user_id=p.user_id and v.method='selfie' and v.revoked_at is null)) from public.profiles p join public.users u on u.id=p.user_id left join public.lifestyle_preferences l on l.user_id=p.user_id where p.user_id=target
$$;
create function public.distance_between(a uuid,b uuid) returns numeric language sql stable security definer set search_path=public,pg_temp as $$
 select (6371*2*asin(sqrt(least(1,power(sin(radians((y.latitude-x.latitude)::float8)/2),2)+cos(radians(x.latitude::float8))*cos(radians(y.latitude::float8))*power(sin(radians((y.longitude-x.longitude)::float8)/2),2)))))::numeric from public.user_locations x join public.user_locations y on y.user_id=b where x.user_id=a and x.consent_at is not null and y.consent_at is not null
$$;
create function public.eligible_pair(a uuid,b uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.users ua join public.profiles pa on pa.user_id=ua.id join public.user_preferences xa on xa.user_id=ua.id join public.users ub on ub.id=b join public.profiles pb on pb.user_id=ub.id join public.user_preferences xb on xb.user_id=ub.id where ua.id=a and a<>b and ua.status='ACTIVE' and ub.status='ACTIVE' and pb.visible and not pb.paused and pa.visible and not pa.paused and not public.is_blocked(a,b) and extract(year from age(ub.date_of_birth)) between xa.age_min and xa.age_max and extract(year from age(ua.date_of_birth)) between xb.age_min and xb.age_max and pb.gender=any(xa.genders) and pa.gender=any(xb.genders) and (cardinality(xa.goals)=0 or pb.goal=any(xa.goals)) and (cardinality(xb.goals)=0 or pa.goal=any(xb.goals)) and coalesce(public.distance_between(a,b)<=least(xa.distance_km,xb.distance_km),lower(pa.city)=lower(pb.city)) and not exists(select 1 from jsonb_each_text(xa.deal_breakers) d where (select preferences->>d.key from public.lifestyle_preferences where user_id=b) is distinct from d.value) and not exists(select 1 from jsonb_each_text(xb.deal_breakers) d where (select preferences->>d.key from public.lifestyle_preferences where user_id=a) is distinct from d.value))
$$;
create function public.rpc_me() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=public.require_actor();
begin return public.profile_projection(actor)||jsonb_build_object('status',(select status from public.users where id=actor),'date_of_birth',(select date_of_birth from public.users where id=actor),'visible',(select visible from public.profiles where user_id=actor),'paused',(select paused from public.profiles where user_id=actor),'show_online',(select show_online from public.profiles where user_id=actor),'completion',(select completion from public.profiles where user_id=actor),'preferences',(select to_jsonb(p)-'user_id' from public.user_preferences p where user_id=actor),'photo_review',coalesce((select jsonb_agg(jsonb_build_object('id',id,'position',position,'status',moderation_status)) from public.profile_photos where user_id=actor),'[]'::jsonb),'entitlements',public.entitlements(actor)); end $$;
create function public.rpc_save_profile(payload jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=public.require_actor(); count_interests int; done int; has_photo boolean;
begin
 if length(payload->>'display_name') not between 2 and 50 or length(payload->>'bio') not between 20 and 1000 or length(payload->>'city') not between 2 and 100 or jsonb_array_length(payload->'interests') not between 3 and 20 or jsonb_array_length(payload->'prompts')>3 then raise exception 'INVALID_PROFILE'; end if;
 select count(distinct i.code) into count_interests from public.interests i where active and code in (select jsonb_array_elements_text(payload->'interests'));
 if count_interests<>jsonb_array_length(payload->'interests') then raise exception 'INVALID_INTERESTS'; end if;
 update public.profiles set display_name=payload->>'display_name',gender=payload->>'gender',city=payload->>'city',bio=payload->>'bio',profession=left(payload->>'profession',100),education=left(payload->>'education',100),goal=payload->>'goal',values=array(select jsonb_array_elements_text(payload->'values')),communication=left(payload->>'communication',50),personality=array(select jsonb_array_elements_text(payload->'personality')),updated_at=now() where user_id=actor;
 update public.lifestyle_preferences set preferences=payload->'lifestyle',updated_at=now() where user_id=actor;
 delete from public.profile_interests where user_id=actor;
 insert into public.profile_interests(user_id,interest_id) select actor,id from public.interests where code in(select jsonb_array_elements_text(payload->'interests'));
 delete from public.profile_prompts where user_id=actor;
 insert into public.profile_prompts(user_id,question,answer,position) select actor,item->>'question',item->>'answer',(ord-1)::int from jsonb_array_elements(payload->'prompts') with ordinality as t(item,ord);
 has_photo:=exists(select 1 from public.profile_photos where user_id=actor and moderation_status='approved');
 done:=case when has_photo then 100 else 88 end;
 update public.profiles set completion=done where user_id=actor;
 update public.users set status=case when has_photo and exists(select 1 from auth.users where id=actor and email_confirmed_at is not null) then 'ACTIVE'::public.account_status else 'PROFILE_COMPLETED'::public.account_status end,updated_at=now() where id=actor;
 insert into public.analytics_events(user_id,event) values(actor,'profile_completed');
 return public.rpc_me();
end $$;
create function public.rpc_preferences(payload jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=public.require_actor();
begin
 if jsonb_array_length(payload->'genders') not between 1 and 4 or not (payload->'genders') <@ '["woman","man","nonbinary","self_described"]'::jsonb then raise exception 'INVALID_PREFERENCES'; end if;
 if coalesce((public.entitlements(actor)->>'advanced_filters')::boolean,false)=false and payload->'deal_breakers'<>'{}'::jsonb then raise exception 'PREMIUM_REQUIRED'; end if;
 update public.user_preferences set age_min=(payload->>'age_min')::int,age_max=(payload->>'age_max')::int,genders=array(select jsonb_array_elements_text(payload->'genders')),goals=array(select jsonb_array_elements_text(payload->'goals')),distance_km=(payload->>'distance_km')::int,deal_breakers=payload->'deal_breakers',updated_at=now() where user_id=actor;
 return public.rpc_me();
end $$;
create function public.rpc_discover(after_id uuid default null,page_size int default 20) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=public.require_actor(true); result jsonb;
begin
 select coalesce(jsonb_agg(public.profile_projection(p.user_id)||jsonb_build_object('distance_km',case when public.distance_between(actor,p.user_id) is null then null else ceil(public.distance_between(actor,p.user_id)/5)*5 end) order by p.user_id),'[]'::jsonb) into result from (select user_id from public.profiles where (after_id is null or user_id>after_id) and public.eligible_pair(actor,user_id) and not exists(select 1 from public.likes where user_id=actor and target_id=profiles.user_id) and not exists(select 1 from public.passes where user_id=actor and target_id=profiles.user_id) order by user_id limit greatest(1,least(page_size,30))) p;
 return result;
end $$;
create function public.rpc_profile(target uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=public.require_actor(true);
begin
 if target<>actor and (public.is_blocked(actor,target) or not (public.eligible_pair(actor,target) or exists(select 1 from public.matches m join public.users u on u.id=target where u.status='ACTIVE' and ended_at is null and actor in(user_a,user_b) and target in(user_a,user_b)))) then raise exception 'PROFILE_UNAVAILABLE'; end if;
 return public.profile_projection(target);
end $$;
create function public.notify(target uuid,kind text,title text,resource uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare n uuid;
begin insert into public.notifications(user_id,kind,title,resource_id) values(target,kind,title,resource) returning id into n;insert into public.notification_outbox(notification_id) values(n);end $$;
create function public.rpc_interact(target uuid,operation uuid,action text) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=public.require_actor(true); mid uuid; cid uuid; existing record; quota int; used int;
begin
 if target=actor or action not in('like','super_like','pass') then raise exception 'INVALID_INTERACTION'; end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,11));
 perform pg_advisory_xact_lock(hashtextextended(least(actor,target)::text||greatest(actor,target)::text,12));
 if not public.eligible_pair(actor,target) then raise exception 'PROFILE_UNAVAILABLE'; end if;
 select * into existing from public.likes where operation_id=operation;
 if found and (existing.user_id<>actor or existing.target_id<>target or existing.kind<>action) then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
 if not found and exists(select 1 from public.passes where operation_id=operation and (user_id<>actor or target_id<>target or action<>'pass')) then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
 if action='pass' then
  if exists(select 1 from public.likes where operation_id=operation) then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
  insert into public.passes(user_id,target_id,operation_id) values(actor,target,operation) on conflict(user_id,target_id) do nothing;
  return jsonb_build_object('matched',false);
 end if;
 if exists(select 1 from public.passes where operation_id=operation) then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
 if not exists(select 1 from public.likes where user_id=actor and target_id=target) then
  quota:=(public.entitlements(actor)->>'daily_likes')::int;
  select count(*) into used from public.likes where user_id=actor and created_at>=date_trunc('day',now());
  if used>=quota then raise exception 'DAILY_LIMIT'; end if;
  if action='super_like' then
   if not exists(select 1 from public.feature_flags where key='super_likes' and enabled) then raise exception 'FEATURE_UNAVAILABLE'; end if;
   quota:=coalesce((public.entitlements(actor)->>'super_likes')::int,0);
   select count(*) into used from public.super_likes where user_id=actor and created_at>=date_trunc('day',now());
   if used>=quota then raise exception 'PREMIUM_REQUIRED'; end if;
  end if;
  insert into public.likes(user_id,target_id,kind,operation_id) values(actor,target,action,operation);
  if action='super_like' then insert into public.super_likes(like_id,user_id) select id,actor from public.likes where operation_id=operation; end if;
  insert into public.analytics_events(user_id,event) values(actor,case when action='super_like' then 'super_like_sent' else 'profile_liked' end);
 end if;
 if exists(select 1 from public.likes where user_id=target and target_id=actor) then
  insert into public.matches(user_a,user_b) values(least(actor,target),greatest(actor,target)) on conflict(user_a,user_b) do nothing returning id into mid;
  if mid is not null then
   insert into public.conversations(match_id) values(mid) returning id into cid;
   insert into public.conversation_members(conversation_id,user_id) values(cid,actor),(cid,target);
   perform public.notify(actor,'match','A connection worth exploring',mid);perform public.notify(target,'match','A connection worth exploring',mid);
   insert into public.analytics_events(user_id,event,metadata) values(actor,'match_created',jsonb_build_object('match_id',mid));
  else select id into mid from public.matches where user_a=least(actor,target) and user_b=greatest(actor,target) and ended_at is null;select id into cid from public.conversations where match_id=mid;end if;
 end if;
 return jsonb_build_object('matched',mid is not null,'match_id',mid,'conversation_id',cid);
end $$;
create function public.rpc_matches() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=public.require_actor(true);
begin return coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'conversation_id',c.id,'created_at',m.created_at,'profile',public.profile_projection(case when m.user_a=actor then m.user_b else m.user_a end)) order by m.created_at desc) from public.matches m join public.conversations c on c.match_id=m.id where public.can_chat(c.id,actor)),'[]'::jsonb);end $$;
create function public.rpc_incoming_likes() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=public.require_actor(true);
begin if not coalesce((public.entitlements(actor)->>'see_likes')::boolean,false) then raise exception 'PREMIUM_REQUIRED';end if;return coalesce((select jsonb_agg(public.profile_projection(x.user_id)) from (select user_id from public.likes where target_id=actor and public.eligible_pair(actor,user_id) order by created_at desc limit 50)x),'[]'::jsonb);end $$;
create function public.rpc_block(target uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=public.require_actor();
begin if target=actor then raise exception 'INVALID_TARGET';end if;perform pg_advisory_xact_lock(hashtextextended(least(actor,target)::text||greatest(actor,target)::text,12));insert into public.blocks(user_id,target_id) values(actor,target) on conflict do nothing;update public.matches set ended_at=now() where user_a=least(actor,target) and user_b=greatest(actor,target) and ended_at is null;insert into public.audit_logs(actor_id,action,resource_id) values(actor,'block_created',target);return '{"blocked":true}'::jsonb;end $$;
create function public.rpc_unmatch(mid uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=public.require_actor(); m record;
begin select * into m from public.matches where id=mid and actor in(user_a,user_b);if not found then raise exception 'MATCH_UNAVAILABLE';end if;perform pg_advisory_xact_lock(hashtextextended(m.user_a::text||m.user_b::text,12));update public.matches set ended_at=coalesce(ended_at,now()) where id=mid;delete from public.likes where (user_id=m.user_a and target_id=m.user_b) or (user_id=m.user_b and target_id=m.user_a);return '{"unmatched":true}'::jsonb;end $$;
create function public.rpc_messages(cid uuid,before_time timestamptz default null,before_id uuid default null) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=public.require_actor(true);
begin if not public.can_chat(cid,actor) then raise exception 'CONVERSATION_UNAVAILABLE';end if;return coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id desc) from (select id,conversation_id,sender_id,body,reply_to,client_id,created_at,deleted_at from public.messages where conversation_id=cid and (before_time is null or (created_at,id)<(before_time,before_id)) order by created_at desc,id desc limit 30)x),'[]'::jsonb);end $$;
create function public.rpc_send_message(cid uuid,payload jsonb,risk int default 0,signals text[] default '{}') returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=public.require_actor(true); m record; result public.messages; recipient uuid;
begin
 select mm.* into m from public.conversations c join public.matches mm on mm.id=c.match_id where c.id=cid;
 if not found then raise exception 'CONVERSATION_UNAVAILABLE';end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,13));perform pg_advisory_xact_lock(hashtextextended(m.user_a::text||m.user_b::text,12));
 if not public.can_chat(cid,actor) then raise exception 'CONVERSATION_UNAVAILABLE';end if;
 select * into result from public.messages where sender_id=actor and client_id=(payload->>'client_id')::uuid;
 if found then if result.conversation_id<>cid or result.body is distinct from payload->>'body' then raise exception 'IDEMPOTENCY_CONFLICT';end if;return to_jsonb(result);end if;
 if (select count(*) from public.messages where sender_id=actor and created_at>now()-interval '1 minute')>=30 then raise exception 'MESSAGE_LIMIT';end if;
 if payload->>'reply_to' is not null and not exists(select 1 from public.messages where id=(payload->>'reply_to')::uuid and conversation_id=cid and deleted_at is null) then raise exception 'INVALID_REPLY';end if;
 insert into public.messages(conversation_id,sender_id,body,client_id,reply_to) values(cid,actor,payload->>'body',(payload->>'client_id')::uuid,(payload->>'reply_to')::uuid) returning * into result;
 recipient:=case when m.user_a=actor then m.user_b else m.user_a end;
 perform public.notify(recipient,'message','You have a new message',cid);
 -- AI/rule signals only create review work; they never ban or suspend.
 if risk>=50 then insert into public.moderation_queue(user_id,resource_id,kind,risk_score,signals) values(actor,result.id,'message_signal',least(100,risk),signals);end if;
 insert into public.analytics_events(user_id,event) values(actor,'message_sent');
 return to_jsonb(result);
end $$;
create function public.rpc_message_action(mid uuid,action text,emoji_value text default null) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=public.require_actor(true); m public.messages;
begin select * into m from public.messages where id=mid;if not found or not public.can_chat(m.conversation_id,actor) then raise exception 'MESSAGE_UNAVAILABLE';end if;
 if action='delete' then if m.sender_id<>actor then raise exception 'FORBIDDEN';end if;update public.messages set body=null,media_key=null,deleted_at=now() where id=mid;
 elsif action='react' then if emoji_value not in('❤️','👍','😊','😂','🎉') then raise exception 'INVALID_REACTION';end if;insert into public.message_reactions(message_id,user_id,emoji) values(mid,actor,emoji_value) on conflict(message_id,user_id) do update set emoji=excluded.emoji;
 else raise exception 'INVALID_ACTION';end if;return '{"updated":true}'::jsonb;end $$;
create function public.rpc_read_conversation(cid uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=public.require_actor(true);
begin if not public.can_chat(cid,actor) then raise exception 'CONVERSATION_UNAVAILABLE';end if;update public.conversation_members set last_read_at=now() where conversation_id=cid and user_id=actor;return '{"read":true}'::jsonb;end $$;
create function public.rpc_report(payload jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=public.require_actor(); target uuid:=(payload->>'target_id')::uuid; rid uuid; mid uuid:=(payload->>'message_id')::uuid;
begin
 if target=actor then raise exception 'INVALID_TARGET';end if;
 if (select count(*) from public.reports where user_id=actor and created_at>now()-interval '1 day')>=20 then raise exception 'REPORT_LIMIT';end if;
 if mid is not null and not exists(select 1 from public.messages m join public.conversation_members cm on cm.conversation_id=m.conversation_id where m.id=mid and m.sender_id=target and cm.user_id=actor) then raise exception 'MESSAGE_UNAVAILABLE';end if;
 insert into public.reports(user_id,target_id,category,details) values(actor,target,payload->>'category',payload->>'details') returning id into rid;
 if mid is not null then insert into public.message_reports(report_id,message_id) values(rid,mid);end if;
 insert into public.moderation_queue(report_id,user_id,resource_id,kind) values(rid,target,mid,'report');
 insert into public.analytics_events(user_id,event) values(actor,'report_created');return jsonb_build_object('id',rid,'status','open');
end $$;
create function public.rpc_privacy(payload jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=public.require_actor();
begin update public.profiles set visible=coalesce((payload->>'visible')::boolean,visible),paused=coalesce((payload->>'paused')::boolean,paused),show_online=coalesce((payload->>'show_online')::boolean,show_online),updated_at=now() where user_id=actor;return public.rpc_me();end $$;
create function public.rpc_deletion() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=auth.uid();
begin if actor is null then raise exception 'UNAUTHENTICATED';end if;insert into public.account_deletion_requests(user_id) values(actor) on conflict(user_id) do nothing;update public.users set status='DELETION_PENDING',updated_at=now() where id=actor;update public.profiles set visible=false,paused=true where user_id=actor;update public.matches set ended_at=coalesce(ended_at,now()) where actor in(user_a,user_b);delete from public.device_tokens where user_id=actor;insert into public.audit_logs(actor_id,action) values(actor,'account_deletion_requested');return '{"status":"pending","message":"Your profile is hidden and access revoked. Erasure is pending processing."}'::jsonb;end $$;
create function public.rpc_safety_create(payload jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=public.require_actor(); result public.date_safety_sessions; contact uuid:=(payload->>'trusted_contact_id')::uuid;
begin if contact is not null and not exists(select 1 from public.emergency_contacts where id=contact and user_id=actor and consent_confirmed) then raise exception 'CONTACT_UNAVAILABLE';end if;if (payload->>'ends_at')::timestamptz>(payload->>'starts_at')::timestamptz+interval '24 hours' then raise exception 'INVALID_SESSION';end if;
 if (payload->>'location_consent')::boolean then raise exception 'LOCATION_SHARING_UNAVAILABLE';end if;
 insert into public.date_safety_sessions(user_id,person_name,venue,starts_at,ends_at,trusted_contact_id,location_consent) values(actor,payload->>'person_name',payload->>'venue',(payload->>'starts_at')::timestamptz,(payload->>'ends_at')::timestamptz,contact,false) returning * into result;return to_jsonb(result);end $$;
create function public.rpc_safety_action(sid uuid,action text) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=public.require_actor(); result public.date_safety_sessions;
begin if action not in('check_in','end','alert') then raise exception 'INVALID_ACTION';end if;if action='alert' then raise exception 'ALERT_DELIVERY_UNAVAILABLE';end if;update public.date_safety_sessions set status=case when action='end' then 'ended' else 'active' end,last_check_in_at=case when action='check_in' then now() else last_check_in_at end,ended_at=case when action='end' then now() else null end where id=sid and user_id=actor and status<>'ended' returning * into result;if not found then raise exception 'SESSION_UNAVAILABLE';end if;return to_jsonb(result);end $$;

-- Live membership is rechecked by RLS on every message read/realtime event.
grant select on public.matches,public.conversations,public.conversation_members,public.messages,public.message_reactions,public.blocks to authenticated;
create policy matches_read on public.matches for select to authenticated using(ended_at is null and auth.uid() in(user_a,user_b) and not public.is_blocked(user_a,user_b));
create policy conversations_read on public.conversations for select to authenticated using(public.can_chat(id,auth.uid()));
create policy members_read on public.conversation_members for select to authenticated using(public.can_chat(conversation_id,auth.uid()));
create policy messages_read on public.messages for select to authenticated using(public.can_chat(conversation_id,auth.uid()));
create policy reactions_read on public.message_reactions for select to authenticated using(exists(select 1 from public.messages where id=message_id));
create policy blocks_read on public.blocks for select to authenticated using(user_id=auth.uid());

revoke all on all functions in schema public from public,anon,authenticated;
-- RLS helpers expose only a boolean. Non-member actor probing is prevented.
create function public.member_chat_access(c uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$select public.can_chat(c,auth.uid())$$;
-- Policies must be able to call their boolean helper, never private profile projection.
grant execute on function public.is_blocked(uuid,uuid),public.can_chat(uuid,uuid) to authenticated;
do $$ declare f record;begin for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'rpc_%' loop execute format('grant execute on function %s to authenticated',f.signature);end loop;end $$;
