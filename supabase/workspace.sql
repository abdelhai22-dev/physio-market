-- PHYSIO MARKET: shared workspace snapshot for first-stage multi-device sync
-- Run this in the Supabase SQL Editor. Requires Supabase Auth.
create table if not exists public.workspace_snapshots (
  workspace_key text primary key default 'physio-market-main' check (workspace_key = 'physio-market-main'),
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
alter table public.workspace_snapshots enable row level security;
drop policy if exists "Authenticated members can read workspace" on public.workspace_snapshots;
create policy "Authenticated members can read workspace" on public.workspace_snapshots for select to authenticated using (true);
drop policy if exists "Authenticated members can create workspace" on public.workspace_snapshots;
create policy "Authenticated members can create workspace" on public.workspace_snapshots for insert to authenticated with check (auth.uid() = updated_by);
drop policy if exists "Authenticated members can update workspace" on public.workspace_snapshots;
create policy "Authenticated members can update workspace" on public.workspace_snapshots for update to authenticated using (true) with check (auth.uid() = updated_by);
-- Seed the single shared workspace row. The app must still be configured with the project URL and publishable/anon key.
insert into public.workspace_snapshots (workspace_key, payload) values ('physio-market-main', '{}'::jsonb) on conflict (workspace_key) do nothing;
