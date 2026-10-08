-- Exactly four fictional profiles. No Auth accounts or production member records.
create table public.demo_profiles (
  slot smallint primary key check (slot between 1 and 4),
  id uuid not null unique,
  name text not null, age smallint not null check (age >= 18),
  gender text not null check (gender in ('woman','man')),
  city text not null, profession text not null, bio text not null,
  interests text[] not null, values_list text[] not null,
  prompt text not null, answer text not null, image text not null,
  sample_reply text not null, removed_at timestamptz
);
create table public.demo_sessions (
  id uuid primary key,
  expires_at timestamptz not null,
  state jsonb not null default '{"likes":[],"passes":[],"messages":{},"gender":"everyone"}'::jsonb,
  check (octet_length(state::text) < 524288)
);
create index demo_sessions_expiry on public.demo_sessions(expires_at);
alter table public.demo_profiles enable row level security;
alter table public.demo_sessions enable row level security;
revoke all on public.demo_profiles,public.demo_sessions from public,anon,authenticated;
grant all on public.demo_profiles,public.demo_sessions to service_role;
insert into public.demo_profiles(slot,id,name,age,gender,city,profession,bio,interests,values_list,prompt,answer,image,sample_reply) values
(1,'d1111111-1111-4111-8111-111111111111','Amara',28,'woman','Lagos','Product designer','A good conversation, an undiscovered bookshop, and a little spontaneity. I’m looking for someone kind who is ready to build something meaningful.',array['Art & design','Coffee','Travel'],array['Kindness','Curiosity','Honesty'],'My perfect Sunday','A slow morning, a gallery visit, and dinner with the people I love.','/images/demo/amara.png','A bookshop and coffee would be my ideal first date. What does your perfect Sunday look like?'),
(2,'d2222222-2222-4222-8222-222222222222','Tomi',31,'man','Abuja','Architect','Usually sketching a building, planning a weekend escape, or cooking something ambitious. Looking for a thoughtful connection with room for laughter.',array['Architecture','Cooking','Hiking'],array['Family','Creativity','Consistency'],'The way to my heart','Remember the little things. And let me cook you my favourite meal.','/images/demo/tomi.png','I’d choose a relaxed dinner and a good conversation. What’s a meal you could eat every week?'),
(3,'d3333333-3333-4333-8333-333333333333','Zara',27,'woman','Lagos','Creative strategist','Live music, seaside walks, and conversations that go somewhere. A little adventurous, a lot intentional. Let’s find a new favourite place together.',array['Live music','Photography','Beach walks'],array['Growth','Empathy','Adventure'],'We’ll get along if','You can laugh at yourself and you’re curious about the world.','/images/demo/zara.png','A seaside walk and live music sounds lovely. Which artist is on your playlist right now?'),
(4,'d4444444-4444-4444-8444-444444444444','Daniel',30,'man','Port Harcourt','Software engineer','A reader, a runner, and the friend who plans the trip. I value clear communication and showing up. Here for a relationship with depth and a sense of humour.',array['Reading','Running','Travel'],array['Honesty','Ambition','Balance'],'A small thing that matters','Making time for each other, even on the busiest days.','/images/demo/daniel.png','My ideal first date is a quiet cafe where we can really talk. What’s the best book you’ve read recently?');
