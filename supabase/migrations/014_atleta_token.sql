-- ── PT Studio — Migration 014: accesso atleta con token di sessione ───────────
-- Applicata il 2026-10-02 via connettore Supabase.
--
-- Prima: l'atleta non era un utente Auth; il browser teneva solo il suo ID e le RPC
-- get_*_atleta / save_sessione_atleta accettavano l'ID senza verifiche. Login con PIN
-- a 4 cifre senza limite di tentativi; login_atleta restituiva anche il PIN.
--
-- Ora:
--  · atleta_login(username, pin) → token casuale (nel DB solo l'hash sha256), valido 180
--    giorni e rinnovato con l'uso → l'atleta resta collegato (niente login a ogni apertura)
--  · blocco 15 minuti dopo 5 PIN sbagliati
--  · tutte le funzioni atleta ricevono il token e ricavano da lì atleta e PT
--  · atleta_save_sessione verifica che il giorno appartenga a una scheda dell'atleta,
--    rifiuta date future, collega ogni serie all'esercizio della scheda (esercizio_id)
--  · helper in schema "private" (non esposto dall'API)
--
-- Le vecchie funzioni (login_atleta, get_*_atleta, save_sessione_atleta, get_pt_name)
-- restano finché il nuovo frontend non è online; poi vengono rimosse (migration 015).

create schema if not exists private;

-- ── Tabella sessioni atleta ───────────────────────────────────────────────────
create table if not exists public.atleta_sessioni (
  id           uuid primary key default gen_random_uuid(),
  atleta_id    uuid not null references public.atleti(id) on delete cascade,
  token_hash   text not null unique,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at   timestamptz not null default now() + interval '180 days'
);
alter table public.atleta_sessioni enable row level security;   -- nessuna policy: accesso solo via funzioni
create index if not exists idx_atleta_sessioni_atleta on public.atleta_sessioni (atleta_id);

-- ── Anti brute-force ──────────────────────────────────────────────────────────
alter table public.atleti add column if not exists login_falliti     integer not null default 0;
alter table public.atleti add column if not exists login_bloccato_fino timestamptz;

-- ── Helper privati ────────────────────────────────────────────────────────────
create or replace function private.hash_token(p_token text)
returns text language sql immutable
set search_path = ''
as $$ select encode(extensions.digest(p_token, 'sha256'), 'hex') $$;

create or replace function private.atleta_da_token(p_token text)
returns public.atleti
language plpgsql security definer
set search_path = ''
as $$
declare
  v_sess public.atleta_sessioni;
  v_row  public.atleti;
begin
  if p_token is null or length(p_token) < 32 then
    raise exception 'sessione_non_valida' using errcode = '28000';
  end if;

  select * into v_sess from public.atleta_sessioni
  where token_hash = private.hash_token(p_token) and expires_at > now();
  if v_sess.id is null then
    raise exception 'sessione_non_valida' using errcode = '28000';
  end if;

  select * into v_row from public.atleti where id = v_sess.atleta_id;
  if v_row.id is null or v_row.archived_at is not null
     or not coalesce((select p.is_approved from public.profiles p where p.id = v_row.pt_id), false) then
    raise exception 'sessione_non_valida' using errcode = '28000';
  end if;

  -- rinnovo "scorrevole", al massimo una scrittura all'ora
  if v_sess.last_seen_at < now() - interval '1 hour' then
    update public.atleta_sessioni
       set last_seen_at = now(), expires_at = now() + interval '180 days'
     where id = v_sess.id;
  end if;

  return v_row;
end;
$$;

create or replace function private.atleta_json(a public.atleti)
returns json language sql stable
set search_path = ''
as $$
  select json_build_object(
    'id', a.id, 'pt_id', a.pt_id, 'nome', a.nome, 'cognome', a.cognome,
    'username', a.username, 'color', a.color,
    'pt_nome', (select trim(coalesce(p.nome,'') || ' ' || coalesce(p.cognome,'')) from public.profiles p where p.id = a.pt_id)
  )
$$;

-- ── Login / me / logout ───────────────────────────────────────────────────────
create or replace function public.atleta_login(p_username text, p_pin text)
returns json
language plpgsql security definer
set search_path = ''
as $$
declare
  v       public.atleti;
  v_token text;
begin
  select * into v from public.atleti where username = trim(p_username);
  if v.id is null then
    return json_build_object('ok', false, 'errore', 'credenziali');
  end if;

  if v.login_bloccato_fino is not null and v.login_bloccato_fino > now() then
    return json_build_object('ok', false, 'errore', 'bloccato', 'fino', v.login_bloccato_fino);
  end if;

  if v.pin is distinct from p_pin then
    update public.atleti
       set login_falliti = login_falliti + 1,
           login_bloccato_fino = case when login_falliti + 1 >= 5 then now() + interval '15 minutes' else null end
     where id = v.id;
    return json_build_object('ok', false, 'errore', 'credenziali');
  end if;

  if v.archived_at is not null
     or not coalesce((select p.is_approved from public.profiles p where p.id = v.pt_id), false) then
    return json_build_object('ok', false, 'errore', 'credenziali');
  end if;

  update public.atleti set login_falliti = 0, login_bloccato_fino = null where id = v.id;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.atleta_sessioni (atleta_id, token_hash) values (v.id, private.hash_token(v_token));
  delete from public.atleta_sessioni where atleta_id = v.id and expires_at < now();

  return json_build_object('ok', true, 'token', v_token, 'atleta', private.atleta_json(v));
end;
$$;

create or replace function public.atleta_me(p_token text)
returns json
language plpgsql security definer
set search_path = ''
as $$
begin
  return private.atleta_json(private.atleta_da_token(p_token));
end;
$$;

create or replace function public.atleta_logout(p_token text)
returns void
language sql security definer
set search_path = ''
as $$
  delete from public.atleta_sessioni where token_hash = private.hash_token(p_token);
$$;

-- ── Lettura dati ──────────────────────────────────────────────────────────────
create or replace function public.atleta_get_scheda(p_token text)
returns json
language plpgsql security definer
set search_path = ''
as $$
declare v public.atleti;
begin
  v := private.atleta_da_token(p_token);
  return (
    select row_to_json(q) from (
      select s.id, s.nome, s.obiettivo, s.livello, s.assegnata_il,
        (select coalesce(json_agg(gq order by gq.ordine), '[]'::json) from (
          select g.id, g.nome, g.giorno_key, g.ordine,
            (select coalesce(json_agg(eq order by eq.ordine), '[]'::json) from (
              select e.id, e.nome, e.esercizio_id_int, e.serie, e.reps, e.rest_sec, e.ordine
              from public.scheda_esercizi e where e.giorno_id = g.id
            ) eq) as scheda_esercizi
          from public.scheda_giorni g where g.scheda_id = s.id
        ) gq) as scheda_giorni
      from public.schede s
      where s.atleta_id = v.id and s.attiva = true
      order by s.created_at desc
      limit 1
    ) q
  );
end;
$$;

create or replace function public.atleta_get_sessioni(p_token text)
returns json
language plpgsql security definer
set search_path = ''
as $$
declare v public.atleti;
begin
  v := private.atleta_da_token(p_token);
  return (
    select coalesce(json_agg(sq order by sq.data), '[]'::json) from (
      select s.id, s.data, s.giorno_id, s.note,
        (select coalesce(json_agg(json_build_object(
            'esercizio_id', ss.esercizio_id, 'nome_esercizio', ss.nome_esercizio,
            'serie_numero', ss.serie_numero, 'reps', ss.reps, 'peso', ss.peso
          ) order by ss.nome_esercizio, ss.serie_numero), '[]'::json)
         from public.sessione_serie ss where ss.sessione_id = s.id) as sessione_serie
      from public.sessioni s where s.atleta_id = v.id
    ) sq
  );
end;
$$;

create or replace function public.atleta_get_misurazioni(p_token text)
returns json
language plpgsql security definer
set search_path = ''
as $$
declare v public.atleti;
begin
  v := private.atleta_da_token(p_token);
  return (select coalesce(json_agg(row_to_json(m) order by m.data), '[]'::json)
          from public.misurazioni m where m.atleta_id = v.id);
end;
$$;

create or replace function public.atleta_get_appuntamenti(p_token text)
returns json
language plpgsql security definer
set search_path = ''
as $$
declare v public.atleti;
begin
  v := private.atleta_da_token(p_token);
  return (select coalesce(json_agg(row_to_json(a) order by a.data, a.ora_inizio), '[]'::json)
          from public.appuntamenti a where a.atleta_id = v.id);
end;
$$;

-- ── Salvataggio sessione ──────────────────────────────────────────────────────
-- p_serie: [{ "scheda_esercizio_id": uuid|null, "nome_esercizio": text,
--             "serie_numero": int, "reps": int|null, "peso": numeric|null }]
create or replace function public.atleta_save_sessione(
  p_token text, p_giorno_id uuid, p_data date, p_serie jsonb, p_note text default null
)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v         public.atleti;
  v_scheda  uuid;
  v_id      uuid;
begin
  v := private.atleta_da_token(p_token);

  select g.scheda_id into v_scheda
  from public.scheda_giorni g join public.schede s on s.id = g.scheda_id
  where g.id = p_giorno_id and s.atleta_id = v.id;
  if v_scheda is null then
    raise exception 'giorno_non_valido' using errcode = '22023';
  end if;

  if p_data > (now() at time zone 'Europe/Rome')::date then
    raise exception 'data_futura' using errcode = '22023';
  end if;

  delete from public.sessioni
  where atleta_id = v.id and data = p_data and giorno_id = p_giorno_id;

  insert into public.sessioni (pt_id, atleta_id, scheda_id, giorno_id, data, note)
  values (v.pt_id, v.id, v_scheda, p_giorno_id, p_data, coalesce(p_note, ''))
  returning id into v_id;

  insert into public.sessione_serie (sessione_id, pt_id, esercizio_id, nome_esercizio, serie_numero, reps, peso, completata)
  select v_id, v.pt_id,
    (select e.id from public.scheda_esercizi e
      where e.id = nullif(s->>'scheda_esercizio_id','')::uuid and e.giorno_id = p_giorno_id),
    s->>'nome_esercizio',
    coalesce((s->>'serie_numero')::integer, 1),
    nullif(s->>'reps','')::integer,
    nullif(s->>'peso','')::numeric,
    true
  from jsonb_array_elements(coalesce(p_serie, '[]'::jsonb)) s
  where coalesce(s->>'nome_esercizio','') <> '';

  return v_id;
end;
$$;
