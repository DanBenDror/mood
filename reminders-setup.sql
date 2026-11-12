-- Mood app: reminders setup. Paste into Supabase > SQL Editor and press Run.
-- Use the copy in .secrets/reminders-setup.sql, which has the real job secret
-- filled in. This committed copy has a placeholder.

create table public.push_subscriptions (
  endpoint     text primary key,
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  p256dh       text not null,
  auth         text not null,
  tz           text not null,
  morning_time text,
  night_time   text,
  updated_at   timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;
create policy "manage own subscriptions" on public.push_subscriptions for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.push_subscriptions from anon, authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Every 15 minutes, ask the "remind" function to check for missing entries.
select cron.schedule('mood-reminders', '*/15 * * * *', $job$
  select net.http_post(
    url     := 'https://pysgbynpkqvpmwylfqtk.supabase.co/functions/v1/remind',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "__CRON_SECRET__"}'::jsonb,
    body    := '{}'::jsonb
  );
$job$);
