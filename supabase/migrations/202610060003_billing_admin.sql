create function public.rpc_start_payment(plan uuid,operation uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=public.require_actor(); p public.subscription_plans; result public.payments;
begin
 perform pg_advisory_xact_lock(hashtextextended(actor::text,14));
 select * into result from public.payments where user_id=actor and idempotency_key=operation;
 if found then if result.plan_id<>plan then raise exception 'IDEMPOTENCY_CONFLICT';end if;return to_jsonb(result);end if;
 select * into p from public.subscription_plans where id=plan and purchasable and amount_minor>0;
 if not found then raise exception 'PLAN_UNAVAILABLE';end if;
 if (select count(*) from public.payments where user_id=actor and created_at>now()-interval '1 hour')>=10 then raise exception 'PAYMENT_LIMIT';end if;
 insert into public.payments(user_id,plan_id,reference,idempotency_key,amount_minor,currency,period_days) values(actor,plan,'j1d_'||replace(gen_random_uuid()::text,'-',''),operation,p.amount_minor,p.currency,p.period_days) returning * into result;return to_jsonb(result);
end $$;
-- Only server privilege can execute this function. It is called after signature and provider verification.
create function public.settle_payment(ref text,amount bigint,ccy text,event_key text) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare p public.payments; sub_id uuid; start_time timestamptz;
begin
 select * into p from public.payments where reference=ref for update;
 if not found or p.amount_minor<>amount or p.currency<>ccy then raise exception 'PAYMENT_MISMATCH';end if;
 if p.status='successful' then return jsonb_build_object('settled',true,'duplicate',true);end if;
 if p.status not in('initiated','pending') then raise exception 'PAYMENT_STATE_CONFLICT';end if;
 insert into public.payment_events(provider,event_key,event_type,payment_id) values('paystack',event_key,'charge.success',p.id) on conflict do nothing;
 if not found then raise exception 'PAYMENT_EVENT_CONFLICT';end if;
 perform pg_advisory_xact_lock(hashtextextended(p.user_id::text,15));
 select greatest(now(),coalesce(max(ends_at),now())) into start_time from public.subscriptions where user_id=p.user_id and status='active' and ends_at>now();
 insert into public.subscriptions(user_id,plan_id,payment_id,starts_at,ends_at) values(p.user_id,p.plan_id,p.id,start_time,start_time+make_interval(days=>p.period_days)) returning id into sub_id;
 update public.payments set status='successful',settled_at=now() where id=p.id;
 perform public.notify(p.user_id,'subscription','Your membership is confirmed',sub_id);
 insert into public.analytics_events(user_id,event) values(p.user_id,'subscription_started');
 return jsonb_build_object('settled',true,'subscription_id',sub_id);
end $$;
create function public.rpc_cancel_subscription() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=public.require_actor();
begin
 -- Initial billing is explicitly nonrecurring; access stays until the paid period ends.
 if exists(select 1 from public.subscriptions where user_id=actor and provider_subscription_code is not null and status='active') then raise exception 'RECURRING_CANCEL_REQUIRES_PROVIDER';end if;
 update public.subscriptions set cancel_at_period_end=true where user_id=actor and status='active' and ends_at>now();
 insert into public.analytics_events(user_id,event) values(actor,'subscription_cancelled');return '{"cancel_at_period_end":true,"renewal":"manual"}'::jsonb;
end $$;
create function public.require_admin(permission text) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=public.require_actor(); r text;
begin select role into r from public.admin_users where user_id=actor and active;
 if r is null or not (r='SUPER_ADMIN' or (r='ADMIN' and permission in('users','moderation','verification','analytics','settings','audit')) or (r='MODERATOR' and permission in('moderation','verification')) or (r='SUPPORT' and permission='users') or (r='FINANCE' and permission='finance') or (r='ANALYST' and permission='analytics')) then raise exception 'ADMIN_FORBIDDEN';end if;return actor;end $$;
create function public.rpc_admin_identity() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=public.require_actor();
begin return (select jsonb_build_object('role',role,'user_id',user_id) from public.admin_users where user_id=actor and active);end $$;
create function public.rpc_admin_metrics() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin perform public.require_admin('analytics');return jsonb_build_object('total_users',(select count(*) from public.users where not is_test and status<>'DELETED'),'active_users',(select count(*) from public.users where not is_test and status='ACTIVE'),'new_users_7d',(select count(*) from public.users where not is_test and created_at>now()-interval '7 days'),'matches',(select count(*) from public.matches),'messages',(select count(*) from public.messages),'open_reports',(select count(*) from public.reports where status='open'),'verified_users',(select count(distinct user_id) from public.profile_verifications where method='selfie' and revoked_at is null),'active_subscriptions',(select count(*) from public.subscriptions where status='active' and starts_at<=now() and ends_at>now()),'revenue_by_currency',coalesce((select jsonb_object_agg(currency,total) from (select currency,sum(amount_minor) total from public.payments where status='successful' group by currency)x),'{}'::jsonb));end $$;
create function public.rpc_admin_queue() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin perform public.require_admin('moderation');return coalesce((select jsonb_agg(to_jsonb(x)) from (select q.id,q.user_id,q.kind,q.risk_score,q.signals,q.created_at,r.id report_id,r.category,r.details from public.moderation_queue q left join public.reports r on r.id=q.report_id where q.status='pending' order by q.created_at limit 100)x),'[]'::jsonb);end $$;
create function public.rpc_admin_moderate(payload jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=public.require_admin('moderation'); target uuid:=(payload->>'user_id')::uuid; action text:=payload->>'action'; aid uuid;
begin
 if target=actor or exists(select 1 from public.admin_users where user_id=target and active) then raise exception 'ADMIN_TARGET_RESTRICTED';end if;
 if length(payload->>'reason') not between 10 and 1000 or action not in('warn','suspend','ban','restore') then raise exception 'INVALID_ACTION';end if;
 perform 1 from public.users where id=target for update;if not found then raise exception 'USER_UNAVAILABLE';end if;
 if action='restore' then update public.users set status='PROFILE_COMPLETED',updated_at=now() where id=target and status in('SUSPENDED','BANNED');
 elsif action='suspend' then update public.users set status='SUSPENDED',updated_at=now() where id=target;
 elsif action='ban' then update public.users set status='BANNED',updated_at=now() where id=target;end if;
 insert into public.admin_actions(admin_id,action,target_id,reason) values(actor,action,target,payload->>'reason') returning id into aid;
 insert into public.audit_logs(actor_id,action,resource_id,metadata) values(actor,'admin_'||action,target,jsonb_build_object('admin_action_id',aid));
 if payload->>'report_id' is not null then update public.reports set status='resolved' where id=(payload->>'report_id')::uuid and target_id=target;update public.moderation_queue set status='resolved' where report_id=(payload->>'report_id')::uuid and user_id=target;end if;
 perform public.notify(target,'admin','Your account has a moderation update',aid);
 return jsonb_build_object('action_id',aid);
end $$;
create function public.rpc_admin_photos() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin perform public.require_admin('verification');return coalesce((select jsonb_agg(to_jsonb(x)) from (select id,user_id,storage_key,created_at from public.profile_photos where moderation_status='pending' order by created_at limit 50)x),'[]'::jsonb);end $$;
create function public.rpc_admin_photo_review(photo uuid,approved boolean,reason text) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=public.require_admin('verification'); target uuid; aid uuid;
begin
 if length(reason) not between 10 and 1000 then raise exception 'REASON_REQUIRED';end if;
 select user_id into target from public.profile_photos where id=photo for update;if not found then raise exception 'PHOTO_UNAVAILABLE';end if;
 if target=actor then raise exception 'SELF_REVIEW_FORBIDDEN';end if;
 update public.profile_photos set moderation_status=case when approved then 'approved' else 'rejected' end where id=photo;
 if approved then update public.users set status='ACTIVE',updated_at=now() where id=target and status in('PROFILE_COMPLETED','PHOTO_ADDED') and exists(select 1 from public.profiles where user_id=target and completion>=88) and exists(select 1 from auth.users where id=target and email_confirmed_at is not null);update public.profiles set completion=100 where user_id=target and exists(select 1 from public.users where id=target and status='ACTIVE');end if;
 insert into public.admin_actions(admin_id,action,target_id,reason) values(actor,case when approved then 'photo_approved' else 'photo_rejected' end,target,reason) returning id into aid;
 insert into public.audit_logs(actor_id,action,resource_id,metadata) values(actor,'photo_review',photo,jsonb_build_object('approved',approved,'action_id',aid));
 perform public.notify(target,'verification',case when approved then 'Your photo has been approved' else 'Your photo needs attention' end,photo);return '{"reviewed":true}'::jsonb;
end $$;
create function public.rpc_add_photo(key text,pos int,mime_value text,size int) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=public.require_actor(); result uuid;
begin if key not like actor::text||'/%' then raise exception 'INVALID_STORAGE_KEY';end if;insert into public.profile_photos(user_id,storage_key,position,mime,size_bytes) values(actor,key,pos,mime_value,size) returning id into result;insert into public.moderation_queue(user_id,resource_id,kind) values(actor,result,'profile_photo');return jsonb_build_object('id',result,'status','pending');end $$;
create function public.rpc_contact(payload jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=public.require_actor(); result uuid;
begin if length(payload->>'name') not between 2 and 100 or payload->>'phone' !~ '^\+[1-9][0-9]{7,14}$' or not (payload->>'consent_confirmed')::boolean then raise exception 'INVALID_CONTACT';end if;insert into public.emergency_contacts(user_id,name,phone,consent_confirmed) values(actor,payload->>'name',payload->>'phone',true) returning id into result;return jsonb_build_object('id',result);end $$;
create function public.rpc_notification_read(nid uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=public.require_actor();begin update public.notifications set read_at=now() where id=nid and user_id=actor;return '{"read":true}'::jsonb;end $$;
create function public.rpc_notification_preferences(payload jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=public.require_actor();begin update public.notification_preferences set push_enabled=coalesce((payload->>'push_enabled')::boolean,push_enabled),email_enabled=coalesce((payload->>'email_enabled')::boolean,email_enabled),likes_enabled=coalesce((payload->>'likes_enabled')::boolean,likes_enabled),messages_enabled=coalesce((payload->>'messages_enabled')::boolean,messages_enabled),updated_at=now() where user_id=actor;return '{"saved":true}'::jsonb;end $$;
create function public.rpc_device_token(token_value text,platform_value text) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=public.require_actor();begin if token_value !~ '^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$' then raise exception 'INVALID_PUSH_TOKEN';end if;insert into public.device_tokens(user_id,token,platform) values(actor,token_value,platform_value) on conflict(token) do update set user_id=actor,platform=platform_value,updated_at=now();return '{"registered":true}'::jsonb;end $$;

-- Member API writes are service-only. RLS client access remains read-only.
-- The API supplies a remotely validated actor in transaction-local claims.
revoke all on all functions in schema public from public,anon,authenticated;
grant execute on all functions in schema public to service_role;
-- Boolean policy wrappers bind actor internally, avoiding caller-supplied identities.
create function public.own_chat_access(c uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$select public.can_chat(c,auth.uid())$$;
create function public.own_match_access(m uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$select exists(select 1 from public.matches x join public.conversations c on c.match_id=x.id where x.id=m and public.can_chat(c.id,auth.uid()))$$;
revoke all on function public.own_chat_access(uuid),public.own_match_access(uuid) from public,anon;
grant execute on function public.own_chat_access(uuid),public.own_match_access(uuid) to authenticated,service_role;
drop policy matches_read on public.matches;
create policy matches_read on public.matches for select to authenticated using(public.own_match_access(id));
drop policy conversations_read on public.conversations;
create policy conversations_read on public.conversations for select to authenticated using(public.own_chat_access(id));
drop policy members_read on public.conversation_members;
create policy members_read on public.conversation_members for select to authenticated using(public.own_chat_access(conversation_id));
drop policy messages_read on public.messages;
create policy messages_read on public.messages for select to authenticated using(public.own_chat_access(conversation_id));
