-- ── PT Studio — Migration 003: atleti table ──────────────────────────────────
-- Idempotente. Eseguire nel SQL Editor di Supabase.

create table if not exists public.atleti (
  id           uuid primary key default gen_random_uuid(),
  pt_id        uuid not null references public.profiles(id) on delete cascade,
  nome         text not null default '',
  cognome      text not null default '',
  username     text not null,
  pin          text not null,
  sesso        text not null default '',
  data_nascita date,
  altezza_cm   integer,
  obiettivo    text not null default '',
  livello      text not null default '',
  note_pt      text not null default '',
  color        text not null default '#e8ff47',
  created_at   timestamptz not null default now(),
  unique(pt_id, username)
);

alter table public.atleti enable row level security;

-- Il PT vede e gestisce solo i propri atleti
drop policy if exists "pt owns atleti" on public.atleti;
create policy "pt owns atleti"
  on public.atleti for all
  using  (auth.uid() = pt_id)
  with check (auth.uid() = pt_id);
