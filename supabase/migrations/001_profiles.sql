-- ── PT Studio — Migration 001: profiles ─────────────────────────────────────
-- Run this in the Supabase SQL Editor (once).

-- 1. Profiles table
create table if not exists public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  email       text not null default '',
  nome        text not null default '',
  cognome     text not null default '',
  is_approved boolean not null default false,
  is_admin    boolean not null default false,
  piano       text not null default 'base',   -- base | medio | pro
  max_atleti  integer not null default 5,
  created_at  timestamptz not null default now()
);

-- 2. Row Level Security
alter table public.profiles enable row level security;

-- Helper: is the caller an admin? (security definer avoids RLS circular reference)
create or replace function public.is_admin()
returns boolean language sql security definer as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- Own profile: read + update
create policy "own profile read"   on public.profiles for select using (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Admin: read + update all
create policy "admin read all"   on public.profiles for select using (public.is_admin());
create policy "admin update all" on public.profiles for update using (public.is_admin());

-- Allow the trigger to insert on signup
create policy "insert on signup" on public.profiles for insert with check (true);

-- 3. Auto-create profile on signup (trigger)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, nome, cognome)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nome', ''),
    coalesce(new.raw_user_meta_data->>'cognome', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
