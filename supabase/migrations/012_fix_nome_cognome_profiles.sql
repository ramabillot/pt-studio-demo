-- ── PT Studio — Migration 012: fix propagazione nome/cognome da Auth → profiles ─
--
-- Causa confermata: GoTrue inserisce auth.users in due fasi su certi flussi
-- (es. conferma email abilitata):
--   1. INSERT con raw_user_meta_data = NULL → trigger scatta → nome = NULL
--   2. UPDATE che scrive i metadata reali → AFTER INSERT non si riscatta più
--
-- ON CONFLICT (id) DO NOTHING cristallizzava il NULL e bloccava ogni correzione.
-- Nota: il valore rotto è NULL, non '' — il WHERE profiles.nome = '' non sarebbe
-- bastato (NULL ≠ '').
--
-- Fix:
--   PARTE 1 — trigger riscritto + secondo trigger su UPDATE OF raw_user_meta_data
--   PARTE 2 — backfill una-tantum per i record già rotti (nome IS NULL o '')
-- Append-only. Eseguire nel SQL Editor di Supabase.


-- ── PARTE 1: trigger robusto ──────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  v_nome    text;
  v_cognome text;
begin
  -- NULLIF(TRIM(...), '') → NULL se il campo è assente, vuoto o solo spazi.
  -- Evita che coalesce trasformi un metadata non ancora arrivato in ''
  -- e lo cristallizzi come valore definitivo.
  v_nome    := nullif(trim(coalesce(new.raw_user_meta_data->>'nome',    '')), '');
  v_cognome := nullif(trim(coalesce(new.raw_user_meta_data->>'cognome', '')), '');

  insert into public.profiles (id, email, nome, cognome)
  values (
    new.id,
    new.email,
    coalesce(v_nome,    ''),
    coalesce(v_cognome, '')
  )
  on conflict (id) do update set
    -- Aggiorna solo il campo che è effettivamente mancante (NULL o '').
    -- Non tocca valori già presenti: un nome valido non viene mai sovrascritto.
    nome    = case
                when profiles.nome    is null or profiles.nome    = '' then coalesce(v_nome,    '')
                else profiles.nome
              end,
    cognome = case
                when profiles.cognome is null or profiles.cognome = '' then coalesce(v_cognome, '')
                else profiles.cognome
              end
  -- La WHERE limita il DO UPDATE ai soli record con almeno un campo mancante.
  -- Se il profilo è già completo, questa clausola è false → no-op, zero modifiche.
  where (profiles.nome    is null or profiles.nome    = '')
     or (profiles.cognome is null or profiles.cognome = '');

  return new;
end;
$$;

-- Trigger su INSERT (sostituisce il precedente con stesso nome)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger su UPDATE di raw_user_meta_data — cattura la seconda fase di GoTrue:
-- quando i metadata vengono scritti dopo l'INSERT iniziale vuoto.
-- Si scatta solo quando raw_user_meta_data cambia effettivamente.
drop trigger if exists on_auth_user_metadata_updated on auth.users;
create trigger on_auth_user_metadata_updated
  after update of raw_user_meta_data on auth.users
  for each row execute procedure public.handle_new_user();


-- ── PARTE 2: backfill record esistenti ───────────────────────────────────────

-- Ripara tutti i profili con nome NULL o '' copiando dai metadata Auth.
-- WHERE:
--   · p.nome IS NULL OR p.nome = ''  → solo i record rotti (non tocca chi ha già un nome)
--   · AND raw_user_meta_data ha almeno nome o cognome disponibile
-- COALESCE(NULLIF(TRIM(...), ''), p.nome, ''):
--   → usa il metadata se presente, mantiene il valore esistente se già ok, '' come ultimo fallback
update public.profiles p
set
  nome    = coalesce(nullif(trim(u.raw_user_meta_data->>'nome'),    ''), p.nome,    ''),
  cognome = coalesce(nullif(trim(u.raw_user_meta_data->>'cognome'), ''), p.cognome, '')
from auth.users u
where u.id = p.id
  and (p.nome is null or p.nome = '' or p.cognome is null or p.cognome = '')
  and (u.raw_user_meta_data->>'nome'    is not null
    or u.raw_user_meta_data->>'cognome' is not null);
