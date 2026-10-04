-- ── PT Studio — Migration 018: codice di installazione (iPhone senza secondo login) ──
-- Applicata il 2026-10-04 via connettore Supabase.
--
-- Su iPhone l'app installata sulla Home NON condivide i dati con Safari: dopo
-- l'installazione l'atleta doveva rifare il login. Ora:
--  · l'atleta collegato in Safari chiede un codice monouso (atleta_crea_codice_installa)
--  · il codice finisce nell'indirizzo di avvio dell'icona (start_url del manifest)
--  · al primo avvio dall'icona, atleta_login_codice scambia il codice con un token nuovo
--  · codice: casuale, nel DB solo l'hash, valido 7 giorni, usabile una volta sola
--  · atleta_id senza foreign key (stessa scelta di segnalazioni: niente "on ..." che
--    blocca il connettore; il codice scade da solo)

create table if not exists public.atleta_codici_installa (
  codice_hash text primary key,
  atleta_id   uuid not null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '7 days',
  usato_at    timestamptz
);
alter table public.atleta_codici_installa enable row level security;   -- nessuna policy: solo via funzioni
create index if not exists idx_codici_installa_atleta on public.atleta_codici_installa (atleta_id);

-- Atleta già collegato (token) → codice monouso per l'icona sulla Home
create or replace function public.atleta_crea_codice_installa(p_token text)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  v        public.atleti;
  v_codice text;
begin
  v := private.atleta_da_token(p_token);
  v_codice := encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.atleta_codici_installa (codice_hash, atleta_id)
  values (private.hash_token(v_codice), v.id);
  return v_codice;
end;
$$;

-- Primo avvio dall'icona: codice valido → nuovo token di sessione (come atleta_login)
create or replace function public.atleta_login_codice(p_codice text)
returns json
language plpgsql security definer
set search_path = ''
as $$
declare
  v_cod   public.atleta_codici_installa;
  v       public.atleti;
  v_token text;
begin
  if p_codice is null or length(p_codice) < 32 then
    return json_build_object('ok', false);
  end if;

  select * into v_cod from public.atleta_codici_installa
   where codice_hash = private.hash_token(p_codice)
     and usato_at is null and expires_at > now()
   for update;
  if v_cod.codice_hash is null then
    return json_build_object('ok', false);
  end if;

  update public.atleta_codici_installa set usato_at = now() where codice_hash = v_cod.codice_hash;

  select * into v from public.atleti where id = v_cod.atleta_id;
  if v.id is null or v.archived_at is not null
     or not coalesce((select p.is_approved from public.profiles p where p.id = v.pt_id), false) then
    return json_build_object('ok', false);
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.atleta_sessioni (atleta_id, token_hash) values (v.id, private.hash_token(v_token));

  return json_build_object('ok', true, 'token', v_token, 'atleta', private.atleta_json(v));
end;
$$;
