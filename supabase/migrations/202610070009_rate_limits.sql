-- Shared counters survive serverless instance changes. No Redis service is required.
-- Keys are HMAC digests; raw client IP addresses are not stored here.
create table public.request_rate_limits (
 namespace text not null check(namespace in ('api','auth')),
 key text not null check(length(key)=64),
 total_hits bigint not null check(total_hits>=0),
 reset_at timestamptz not null,
 primary key(namespace,key)
);
create index request_rate_limits_expiry_idx on public.request_rate_limits(reset_at);
alter table public.request_rate_limits enable row level security;
revoke all on public.request_rate_limits from public,anon,authenticated;
grant all on public.request_rate_limits to service_role;
