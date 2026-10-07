-- Old JWTs may remain cryptographically valid until expiry after logout/deletion.
-- This account-state predicate also revokes direct Supabase private-row reads.
create function public.own_account_available() returns boolean language sql stable security definer set search_path=public,pg_temp as $$select exists(select 1 from public.users where id=auth.uid() and status not in('SUSPENDED','BANNED','DEACTIVATED','DELETION_PENDING','DELETED'))$$;
revoke all on function public.own_account_available() from public,anon;
grant execute on function public.own_account_available() to authenticated,service_role;
do $$ declare t text;begin
 foreach t in array array['users','profiles','user_preferences','user_locations','profile_photos','profile_prompts','profile_interests','education','employment','lifestyle_preferences','likes','passes','super_likes','match_preferences','reports','notifications','notification_preferences','device_tokens','subscriptions','payments','verification_requests','profile_verifications','emergency_contacts','date_plans','date_safety_sessions','compatibility_scores','ai_recommendations','profile_views','user_boosts','account_deletion_requests'] loop
  execute format('drop policy own_read on public.%I',t);
  execute format('create policy own_read on public.%I for select to authenticated using (%I=(select auth.uid()) and (select public.own_account_available()))',t,case when t='users' then 'id' else 'user_id' end);
 end loop;
end $$;
-- Rejected photos can no longer leave an account discoverable without approved imagery.
create function public.sync_photo_activation() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin if old.moderation_status='approved' and new.moderation_status<>'approved' and not exists(select 1 from public.profile_photos where user_id=new.user_id and moderation_status='approved') then update public.users set status='PROFILE_COMPLETED' where id=new.user_id and status='ACTIVE';update public.profiles set completion=88 where user_id=new.user_id;end if;return new;end $$;
create trigger sync_photo_activation after update of moderation_status on public.profile_photos for each row execute function public.sync_photo_activation();
revoke all on function public.sync_photo_activation() from public,anon,authenticated;
grant execute on function public.sync_photo_activation() to service_role;
