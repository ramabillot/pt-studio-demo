-- ── PT Studio — Migration 004: augmenta schede + RLS ─────────────────────────
-- Aggiunge le colonne mancanti al modello esistente e abilita RLS.
-- Idempotente. Eseguire nel SQL Editor di Supabase.

-- ── 1. Colonne mancanti ───────────────────────────────────────────────────────

-- schede: obiettivo, livello, data assegnazione
alter table public.schede add column if not exists obiettivo    text not null default '';
alter table public.schede add column if not exists livello      text not null default '';
alter table public.schede add column if not exists assegnata_il date;

-- scheda_giorni: lettera giorno (A/B/C...) per ricollegare alla struttura app
alter table public.scheda_giorni add column if not exists giorno_key text not null default '';

-- scheda_esercizi: ID intero dal catalogo EXERCISES + tempo recupero
alter table public.scheda_esercizi add column if not exists esercizio_id_int integer;
alter table public.scheda_esercizi add column if not exists rest_sec         integer not null default 90;

-- ── 2. CASCADE FK (per delete scheda → cascade giorni → cascade esercizi) ────

alter table public.scheda_giorni
  drop constraint if exists scheda_giorni_scheda_id_fkey;
alter table public.scheda_giorni
  add constraint scheda_giorni_scheda_id_fkey
  foreign key (scheda_id) references public.schede(id) on delete cascade;

alter table public.scheda_esercizi
  drop constraint if exists scheda_esercizi_giorno_id_fkey;
alter table public.scheda_esercizi
  add constraint scheda_esercizi_giorno_id_fkey
  foreign key (giorno_id) references public.scheda_giorni(id) on delete cascade;

alter table public.sessione_serie
  drop constraint if exists sessione_serie_sessione_id_fkey;
alter table public.sessione_serie
  add constraint sessione_serie_sessione_id_fkey
  foreign key (sessione_id) references public.sessioni(id) on delete cascade;

-- ── 3. RLS ───────────────────────────────────────────────────────────────────

alter table public.schede          enable row level security;
alter table public.scheda_giorni   enable row level security;
alter table public.scheda_esercizi enable row level security;
alter table public.sessioni        enable row level security;
alter table public.sessione_serie  enable row level security;

drop policy if exists "pt owns schede"          on public.schede;
drop policy if exists "pt owns scheda_giorni"   on public.scheda_giorni;
drop policy if exists "pt owns scheda_esercizi" on public.scheda_esercizi;
drop policy if exists "pt owns sessioni"        on public.sessioni;
drop policy if exists "pt owns sessione_serie"  on public.sessione_serie;

create policy "pt owns schede"
  on public.schede for all
  using (auth.uid() = pt_id) with check (auth.uid() = pt_id);

create policy "pt owns scheda_giorni"
  on public.scheda_giorni for all
  using (auth.uid() = pt_id) with check (auth.uid() = pt_id);

create policy "pt owns scheda_esercizi"
  on public.scheda_esercizi for all
  using (auth.uid() = pt_id) with check (auth.uid() = pt_id);

create policy "pt owns sessioni"
  on public.sessioni for all
  using (auth.uid() = pt_id) with check (auth.uid() = pt_id);

create policy "pt owns sessione_serie"
  on public.sessione_serie for all
  using (auth.uid() = pt_id) with check (auth.uid() = pt_id);
