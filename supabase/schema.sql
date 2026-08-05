-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run

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

-- Row-level security: every reseller can only see and edit their own client sites
alter table projects enable row level security;

create policy "Users can view their own projects"
  on projects for select
  using (auth.uid() = user_id);

create policy "Users can insert their own projects"
  on projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own projects"
  on projects for update
  using (auth.uid() = user_id);

create policy "Users can delete their own projects"
  on projects for delete
  using (auth.uid() = user_id);

-- Public routes (app/s/[id] and the custom-domain handler) serve a
-- published project's HTML to anonymous visitors, so published sites
-- need to be readable without a session.
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

-- Row-level security: users can see their own plan/usage, but can't
-- write to it directly — every write goes through the service role
-- key server-side (Stripe webhook, generation/search counters), so
-- people can't tamper with their own plan or reset their usage.
alter table profiles enable row level security;

create policy "Users can view their own profile"
  on profiles for select
  using (auth.uid() = id);

-- Storage bucket for the real business photos a reseller uploads before
-- generating a site. Public, because the generated HTML references these
-- URLs directly and is served to anonymous visitors.
insert into storage.buckets (id, name, public)
values ('client-photos', 'client-photos', true)
on conflict (id) do nothing;

create policy "Authenticated users can upload client photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'client-photos');

create policy "Anyone can view client photos"
  on storage.objects for select
  using (bucket_id = 'client-photos');
