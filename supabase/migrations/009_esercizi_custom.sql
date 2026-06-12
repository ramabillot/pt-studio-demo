-- ── PT Studio — Migration 009: esercizi_custom ───────────────────────────────
-- Esercizi personalizzati creati dai PT. Ogni PT legge/scrive/cancella
-- solo i propri esercizi (RLS by pt_id = auth.uid()).
-- Idempotente. Eseguire nel SQL Editor di Supabase.

create table if not exists public.esercizi_custom (
  id           uuid        primary key default gen_random_uuid(),
  pt_id        uuid        not null references auth.users(id) on delete cascade,
  nome         text        not null,
  categoria    text        not null,
  descrizione  text,
  immagine_url text,
  created_at   timestamptz not null default now()
);

-- RLS
alter table public.esercizi_custom enable row level security;

drop policy if exists "pt_select_own_custom" on public.esercizi_custom;
drop policy if exists "pt_insert_own_custom" on public.esercizi_custom;
drop policy if exists "pt_delete_own_custom" on public.esercizi_custom;

create policy "pt_select_own_custom" on public.esercizi_custom
  for select using (pt_id = auth.uid());

create policy "pt_insert_own_custom" on public.esercizi_custom
  for insert with check (pt_id = auth.uid());

create policy "pt_delete_own_custom" on public.esercizi_custom
  for delete using (pt_id = auth.uid());

-- GRANT espliciti (RLS da sola non è sufficiente)
grant select, insert, delete on public.esercizi_custom to authenticated;
