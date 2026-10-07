-- Run as database owner AFTER signing up through the app with an adult DOB,
-- confirming email, and enrolling a TOTP factor in Supabase Auth.
-- Replace the UUID below with that staff member's Auth user ID.
begin;
do $$
declare staff_id uuid := '00000000-0000-0000-0000-000000000000';
begin
  if not exists (
    select 1 from auth.users a join public.users u on u.id=a.id
    where a.id=staff_id and a.email_confirmed_at is not null
      and u.date_of_birth <= (current_date - interval '18 years')::date
      and not u.is_test and u.status not in ('BANNED','SUSPENDED','DELETION_PENDING','DELETED')
  ) then raise exception 'A confirmed adult staff account is required'; end if;
  if not exists (
    select 1 from auth.mfa_factors where user_id=staff_id and status='verified'
  ) then raise exception 'Enroll and verify staff MFA before granting administrator access'; end if;
  if exists(select 1 from public.admin_users where active and role='SUPER_ADMIN' and user_id<>staff_id)
    then raise exception 'A super administrator already exists; use the reviewed staff provisioning process'; end if;
  insert into public.admin_users(user_id,role,active) values(staff_id,'SUPER_ADMIN',true)
    on conflict(user_id) do update set role='SUPER_ADMIN',active=true;
  insert into public.audit_logs(actor_id,action,resource_id,metadata)
    values(staff_id,'bootstrap_super_admin',staff_id,'{"source":"database_owner"}'::jsonb);
end $$;
commit;
