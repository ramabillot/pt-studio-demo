-- ── PT Studio — Migration 010: username univocità globale + login_atleta sicuro ─
-- Rende gli username degli atleti globalmente unici (non solo per-PT) e
-- riscrive la RPC login_atleta con controllo is_approved del PT.
-- Append-only: non tocca migrazioni precedenti.
-- Eseguire nel SQL Editor di Supabase.

-- ── 1. Controllo collisioni esistenti ─────────────────────────────────────────
-- Se esistono username duplicati tra PT diversi, la migration fallisce in modo
-- sicuro prima di tentare il drop/add del constraint.
do $$
declare
  dup_count integer;
  dup_sample text;
begin
  select count(*), min(username)
  into dup_count, dup_sample
  from (
    select username
    from public.atleti
    group by username
    having count(*) > 1
  ) sub;

  if dup_count > 0 then
    raise exception
      'BLOCCO MIGRAZIONE: trovati % username duplicati tra PT diversi (es: %). '
      'Risolvere manualmente prima di applicare questa migration.',
      dup_count, dup_sample;
  end if;
end;
$$;

-- ── 2. Sostituisce il constraint scoped con uno globale ────────────────────────
alter table public.atleti
  drop constraint if exists atleti_pt_id_username_key;

alter table public.atleti
  add constraint atleti_username_key unique (username);

-- ── 3. Riscrive login_atleta con controllo stato PT ───────────────────────────
-- Comportamento:
--   • Match esatto username + pin (senza LIMIT 1 ambiguità — username ora univoco).
--   • Se l'atleta non esiste o pin errato → null.
--   • Se il PT dell'atleta non è is_approved → null (PT disattivato/non ancora approvato).
--   • Altrimenti → riga atleta come JSON.
create or replace function public.login_atleta(p_username text, p_pin text)
returns json language plpgsql security definer as $$
declare
  atleta_row  public.atleti%rowtype;
  pt_approved boolean;
begin
  -- Recupera l'atleta (username globalmente unico → nessun LIMIT necessario)
  select * into atleta_row
  from public.atleti
  where username = p_username
    and pin       = p_pin;

  if atleta_row.id is null then
    return null;
  end if;

  -- Verifica che il PT dell'atleta sia approvato
  select is_approved into pt_approved
  from public.profiles
  where id = atleta_row.pt_id;

  if not coalesce(pt_approved, false) then
    return null;
  end if;

  return row_to_json(atleta_row);
end;
$$;

-- Permette al client anonimo di chiamare la funzione
grant execute on function public.login_atleta(text, text) to anon;
