-- ── PT Studio — Migration 019: notifiche push del cronometro (atleta) ─────────
-- Applicata il 2026-10-04 via connettore Supabase.
--
-- Idea (decisione 2026-10-04): la notifica compare SOLO quando l'app non è a schermo.
--  · l'app va in secondo piano con un cronometro attivo → atleta_programma_push(avvisi):
--    "Recupero · finisce alle HH:MM" subito + "Recupero finito" all'ora di fine
--  · l'app torna a schermo → atleta_annulla_push: niente notifiche mentre la si guarda
--  · ogni 5 secondi pg_cron controlla se ci sono avvisi dovuti; solo allora chiama la
--    Edge Function "invia-push" (supabase/functions/invia-push) che manda le Web Push
--  · iscrizioni (endpoint del telefono) salvate con atleta_salva_push; tabelle senza policy
--  · chiavi VAPID e segreto del cron in private.push_config: inserite A MANO via SQL,
--    NON in questo file (il repo è pubblico)
--  · niente foreign key verso atleti (come segnalazioni): niente "on ..." che blocca il connettore

create extension if not exists pg_net;
create extension if not exists pg_cron;

create table if not exists private.push_config (
  id            boolean primary key default true check (id),   -- una riga sola
  vapid_public  text not null,
  vapid_private text not null,
  subject       text not null,
  cron_secret   text not null,
  function_url  text not null
);

create table if not exists public.push_iscrizioni (
  endpoint   text primary key,
  atleta_id  uuid not null,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.push_iscrizioni enable row level security;
create index if not exists idx_push_iscrizioni_atleta on public.push_iscrizioni (atleta_id);

create table if not exists public.push_programmate (
  id           bigint generated always as identity primary key,
  atleta_id    uuid not null,
  invia_at     timestamptz not null,
  titolo       text not null,
  corpo        text,
  tag          text not null default 'cronometro',
  created_at   timestamptz not null default now(),
  inviata_at   timestamptz,
  annullata_at timestamptz,
  esito        text
);
alter table public.push_programmate enable row level security;
create index if not exists idx_push_dovute on public.push_programmate (invia_at)
  where inviata_at is null and annullata_at is null;

-- ── RPC atleta (token) ────────────────────────────────────────────────────────
create or replace function public.atleta_salva_push(p_token text, p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare v public.atleti;
begin
  v := private.atleta_da_token(p_token);
  if p_endpoint !~ '^https://' or length(p_endpoint) > 1000 then
    raise exception 'endpoint_non_valido';
  end if;
  insert into public.push_iscrizioni (endpoint, atleta_id, p256dh, auth, user_agent)
  values (p_endpoint, v.id, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
    set atleta_id = excluded.atleta_id, p256dh = excluded.p256dh, auth = excluded.auth,
        user_agent = excluded.user_agent, updated_at = now();
end;
$$;

-- p_avvisi: [{ "tra_sec": 0, "titolo": "...", "corpo": "..." }, ...] (massimo 4, entro 2 ore)
-- Sostituisce gli avvisi ancora in attesa dello stesso atleta.
create or replace function public.atleta_programma_push(p_token text, p_avvisi json)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare v public.atleti; a json; n int := 0;
begin
  v := private.atleta_da_token(p_token);
  update public.push_programmate set annullata_at = now()
   where atleta_id = v.id and inviata_at is null and annullata_at is null;
  for a in select * from json_array_elements(coalesce(p_avvisi, '[]'::json)) loop
    n := n + 1;
    exit when n > 4;
    if coalesce((a->>'tra_sec')::int, -1) between 0 and 7200 and length(coalesce(a->>'titolo','')) between 1 and 120 then
      insert into public.push_programmate (atleta_id, invia_at, titolo, corpo)
      values (v.id, now() + make_interval(secs => (a->>'tra_sec')::int), a->>'titolo', left(a->>'corpo', 200));
    end if;
  end loop;
end;
$$;

create or replace function public.atleta_annulla_push(p_token text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare v public.atleti;
begin
  v := private.atleta_da_token(p_token);
  update public.push_programmate set annullata_at = now()
   where atleta_id = v.id and inviata_at is null and annullata_at is null;
end;
$$;

-- ── Cron: chiama la Edge Function solo se c'è qualcosa da inviare ─────────────
create or replace function private.push_dovute()
returns void
language plpgsql security definer
set search_path = ''
as $$
declare c private.push_config;
begin
  if not exists (select 1 from public.push_programmate
                  where inviata_at is null and annullata_at is null and invia_at <= now()) then
    return;
  end if;
  select * into c from private.push_config where id;
  if c.function_url is null then return; end if;
  perform net.http_post(
    url := c.function_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', c.cron_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
end;
$$;

select cron.schedule('push-cronometro', '5 seconds', 'select private.push_dovute()');
