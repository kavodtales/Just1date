-- Keep already deployed staff clients on their three known slots during rollout.
-- The updated API explicitly calls v2; authorization remains identical.
create or replace function public.rpc_admin_app_media() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform public.require_admin('settings');
 return (select jsonb_agg(to_jsonb(s) order by slot) from public.app_media_slots s where slot in('welcome_algorithm','welcome_matches','welcome_premium'));
end $$;
create function public.rpc_admin_app_media_v2() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform public.require_admin('settings');
 return (select jsonb_agg(to_jsonb(s) order by slot) from public.app_media_slots s);
end $$;
revoke all on function public.rpc_admin_app_media_v2() from public,anon,authenticated;
grant execute on function public.rpc_admin_app_media_v2() to service_role;
