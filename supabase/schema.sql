-- Run this in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run
--
-- Safe to run more than once, and safe to run on a database that was set
-- up with an earlier version of this file: tables and columns are only
-- added if missing, and policies are dropped before being recreated.

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  client_name text not null,
  prompt text not null,
  code text,
  status text default 'generating',
  published boolean default false,
  slug text unique,
  custom_domain text,
  created_at timestamptz default now()
);

-- Added separately so databases created before these existed pick them
-- up: "create table if not exists" above would skip the whole table.
alter table projects add column if not exists published boolean default false;
alter table projects add column if not exists slug text;
alter table projects add column if not exists custom_domain text;

-- Publishing picks a subdomain per site, so slugs have to be unique.
create unique index if not exists projects_slug_key on projects (slug);

-- Row-level security: every reseller can only see and edit their own client sites
alter table projects enable row level security;

drop policy if exists "Users can view their own projects" on projects;
create policy "Users can view their own projects"
  on projects for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own projects" on projects;
create policy "Users can insert their own projects"
  on projects for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own projects" on projects;
create policy "Users can update their own projects"
  on projects for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own projects" on projects;
create policy "Users can delete their own projects"
  on projects for delete
  using (auth.uid() = user_id);

-- Public routes (app/s/[id] and the custom-domain handler) serve a
-- published project's HTML to anonymous visitors, so published sites
-- need to be readable without a session.
-- The first name below is what an earlier setup used; dropping both
-- keeps a re-run from leaving two policies that do the same thing.
drop policy if exists "Anyone can view published sites" on projects;
drop policy if exists "Anyone can view published projects" on projects;
create policy "Anyone can view published projects"
  on projects for select
  using (published = true);

create table if not exists profiles (
  id uuid primary key references auth.users(id),
  plan text default 'trial',
  generations_used int default 0,
  searches_used int default 0,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz default now()
);

alter table profiles add column if not exists plan text default 'trial';
alter table profiles add column if not exists generations_used int default 0;
alter table profiles add column if not exists searches_used int default 0;
alter table profiles add column if not exists stripe_customer_id text;
alter table profiles add column if not exists stripe_subscription_id text;
-- Which referral code (if any) brought this signup in, e.g. 'APEX'.
-- Set once at profile creation and never overwritten afterwards.
alter table profiles add column if not exists referred_by text;

-- The Stripe webhook finds users by customer id, which is a lookup on
-- every billing event.
create index if not exists profiles_stripe_customer_id_idx
  on profiles (stripe_customer_id);

-- Row-level security: users can see their own plan/usage, but can't
-- write to it directly — every write goes through the service role
-- key server-side (Stripe webhook, generation/search counters), so
-- people can't tamper with their own plan or reset their usage.
alter table profiles enable row level security;

drop policy if exists "Users can view their own profile" on profiles;
create policy "Users can view their own profile"
  on profiles for select
  using (auth.uid() = id);

-- Storage bucket for the real business photos a reseller uploads before
-- generating a site. Public, because the generated HTML references these
-- URLs directly and is served to anonymous visitors.
insert into storage.buckets (id, name, public)
values ('client-photos', 'client-photos', true)
on conflict (id) do nothing;

drop policy if exists "Authenticated users can upload client photos" on storage.objects;
create policy "Authenticated users can upload client photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'client-photos');

drop policy if exists "Anyone can view client photos" on storage.objects;
create policy "Anyone can view client photos"
  on storage.objects for select
  using (bucket_id = 'client-photos');
