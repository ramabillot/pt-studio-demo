-- ── PT Studio — Migration 013: hardening sicurezza (revisione 2026-10) ──────────
-- Applicata il 2026-10-02 via connettore Supabase in due passi (013a indici, 013b protezione).
--
-- CRITICO risolto: la policy "PT vede solo il proprio profilo" vale anche per UPDATE
-- senza limiti di colonna → un PT poteva auto-approvarsi e diventare admin.
-- Fix: trigger che, per richieste dal browser (ruoli anon/authenticated) di un non-admin,
-- mantiene invariate le colonne privilegiate. Verificato: update di is_admin/max_atleti
-- da un PT viene ignorato.
--
-- Nota: le REVOKE su handle_new_user / rls_auto_enable / is_admin (anon) non sono state
-- applicate: il connettore richiede una conferma per operazioni "distruttive" che non
-- arriva. Non sono necessarie (funzioni trigger non invocabili via RPC; admin_delete_pt
-- verifica is_admin). Da applicare a mano nel SQL Editor quando comodo:
--   revoke execute on function public.handle_new_user() from public, anon, authenticated;
--   revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
--   revoke execute on function public.is_admin() from public, anon;
--   revoke execute on function public.admin_delete_pt(uuid) from public, anon;

-- ── 013a: indici ──────────────────────────────────────────────────────────────
create index if not exists idx_atleti_pt            on public.atleti (pt_id);
create index if not exists idx_schede_atleta        on public.schede (atleta_id, attiva);
create index if not exists idx_scheda_giorni_scheda on public.scheda_giorni (scheda_id);
create index if not exists idx_scheda_es_giorno     on public.scheda_esercizi (giorno_id);
create index if not exists idx_sessioni_atleta_data on public.sessioni (atleta_id, data);
create index if not exists idx_sessioni_giorno      on public.sessioni (giorno_id);
create index if not exists idx_sessione_serie_sess  on public.sessione_serie (sessione_id);
create index if not exists idx_misurazioni_atleta   on public.misurazioni (atleta_id, data);
create index if not exists idx_appuntamenti_atleta  on public.appuntamenti (atleta_id, data);
create index if not exists idx_appuntamenti_pt      on public.appuntamenti (pt_id, data);

-- ── 013b: protezione colonne privilegiate + search_path ──────────────────────
create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
security invoker          -- INVOKER di proposito: current_user deve essere il ruolo del chiamante
set search_path = public
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.is_admin    := false;
    new.is_approved := false;
    new.is_beta     := false;
    new.piano       := 'base';
    new.max_atleti  := 3;
  else
    new.is_admin    := old.is_admin;
    new.is_approved := old.is_approved;
    new.is_beta     := old.is_beta;
    new.piano       := old.piano;
    new.max_atleti  := old.max_atleti;
    new.id          := old.id;
  end if;
  return new;
end;
$$;

create or replace trigger trg_protect_profile_privileged
  before insert or update on public.profiles
  for each row execute function public.protect_profile_privileged_columns();

alter function public.login_atleta(text, text)                                   set search_path = public;
alter function public.handle_new_user()                                          set search_path = public;
alter function public.is_admin()                                                 set search_path = public;
alter function public.get_scheda_atleta(uuid)                                    set search_path = public;
alter function public.save_sessione_atleta(uuid, uuid, uuid, uuid, date, jsonb)  set search_path = public;
alter function public.get_misurazioni_atleta(uuid)                               set search_path = public;
alter function public.get_appuntamenti_atleta(uuid)                              set search_path = public;
alter function public.get_sessioni_atleta(uuid)                                  set search_path = public;
alter function public.get_pt_name(uuid)                                          set search_path = public;
alter function public.admin_delete_pt(uuid)                                      set search_path = public;
