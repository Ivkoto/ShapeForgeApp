-- Contacts table
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trainer_name text,
  phone text,
  email text,
  facebook_url text,
  instagram_url text,
  website_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contacts_user_unique unique (user_id)
);

alter table public.contacts add column if not exists facebook_url text;
alter table public.contacts add column if not exists instagram_url text;
alter table public.contacts add column if not exists website_url text;

-- Index on user_id
create index if not exists contacts_user_id_idx on public.contacts (user_id);

-- Trigger for updated_at
drop trigger if exists contacts_set_updated_at on public.contacts;
create trigger contacts_set_updated_at
  before update on public.contacts
  for each row
  execute function public.set_updated_at();

-- RLS
alter table public.contacts enable row level security;

-- Policy: users can manage their own contacts
drop policy if exists "Users can manage own contacts" on public.contacts;
create policy "Users can manage own contacts"
  on public.contacts
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Grants
grant select, insert, update, delete on public.contacts to authenticated;
