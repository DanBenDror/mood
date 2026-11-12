-- Mood app: one-time database setup.
-- Paste all of this into Supabase > SQL Editor and press Run.

create table public.profiles (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  salt       text not null,
  check_iv   text not null,
  check_ct   text not null,
  created_at timestamptz not null default now()
);

create table public.entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day        date not null,
  kind       text not null check (kind in ('morning', 'night')),
  iv         text not null,
  ct         text not null,  -- the encrypted entry; unreadable without your passphrase
  created_at timestamptz not null default now(),
  unique (user_id, day, kind)
);

alter table public.profiles enable row level security;
alter table public.entries  enable row level security;

-- Only your signed-in account can read or add rows. There is deliberately no
-- update or delete rule: once an entry is locked in, nothing can change it.
create policy "read own profile"   on public.profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy "create own profile" on public.profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "read own entries"   on public.entries  for select to authenticated using ((select auth.uid()) = user_id);
create policy "add own entries"    on public.entries  for insert to authenticated with check ((select auth.uid()) = user_id);

revoke all on public.profiles, public.entries from anon, authenticated;
grant select, insert on public.profiles, public.entries to authenticated;
