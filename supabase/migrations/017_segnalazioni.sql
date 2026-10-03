-- ── PT Studio — Migration 017: segnalazioni bug / idee dalla beta ─────────────
-- Applicata il 2026-10-03 via connettore Supabase.
--  · tabella segnalazioni: tipo (bug|idea), testo, foto opzionale (jpeg compressa
--    nel browser, salvata come bytea: niente bucket Storage aperto agli anonimi),
--    contesto automatico (schermata, dispositivo, versione, ultimi errori JS)
--  · nessun accesso diretto dall'API (RLS senza policy): si scrive solo con la
--    funzione segnala(), si legge da Claude via connettore / SQL Editor
--  · segnala(): PT/admin = utente Auth (auth.uid()); atleta = token di sessione
--  · pt_id / atleta_id senza foreign key: la cancellazione di un PT/atleta non
--    deve essere bloccata dalle segnalazioni

create table if not exists public.segnalazioni (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  tipo         text not null default 'bug' check (tipo in ('bug','idea')),
  testo        text not null check (length(trim(testo)) between 1 and 4000),
  autore_ruolo text not null check (autore_ruolo in ('pt','admin','atleta')),
  autore_nome  text,
  pt_id        uuid,
  atleta_id    uuid,
  contesto     jsonb not null default '{}'::jsonb,
  foto         bytea check (foto is null or length(foto) <= 3000000),
  foto_mime    text,
  -- gestione (Claude / Ramiro)
  stato        text not null default 'aperta' check (stato in ('aperta','in_corso','risolta','scartata')),
  risposta     text,          -- diagnosi / soluzione proposta / commit che la risolve
  aggiornata_at timestamptz
);
alter table public.segnalazioni enable row level security;   -- nessuna policy: accesso solo via funzione
create index if not exists idx_segnalazioni_stato on public.segnalazioni (stato, created_at desc);

-- p_foto_b64: jpeg in base64 (senza prefisso data:), opzionale
create or replace function public.segnala(
  p_tipo text, p_testo text, p_contesto jsonb default '{}'::jsonb,
  p_foto_b64 text default null, p_token text default null)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_id    uuid;
  v_ruolo text;
  v_nome  text;
  v_pt    uuid;
  v_atl   uuid;
  v_prof  public.profiles;
  v_a     public.atleti;
  v_foto  bytea;
begin
  if auth.uid() is not null then
    select * into v_prof from public.profiles where id = auth.uid();
    if v_prof.id is null then raise exception 'profilo_non_trovato' using errcode = '28000'; end if;
    v_ruolo := case when v_prof.is_admin then 'admin' else 'pt' end;
    v_nome  := nullif(trim(coalesce(v_prof.nome,'') || ' ' || coalesce(v_prof.cognome,'')), '');
    v_pt    := v_prof.id;
  else
    v_a     := private.atleta_da_token(p_token);
    v_ruolo := 'atleta';
    v_nome  := coalesce(nullif(trim(coalesce(v_a.nome,'') || ' ' || coalesce(v_a.cognome,'')), ''), v_a.username);
    v_pt    := v_a.pt_id;
    v_atl   := v_a.id;
  end if;

  if p_foto_b64 is not null and length(p_foto_b64) > 0 then
    v_foto := decode(p_foto_b64, 'base64');
  end if;

  insert into public.segnalazioni (tipo, testo, autore_ruolo, autore_nome, pt_id, atleta_id, contesto, foto, foto_mime)
  values (coalesce(nullif(p_tipo,''),'bug'), trim(p_testo), v_ruolo, v_nome, v_pt, v_atl,
          coalesce(p_contesto,'{}'::jsonb), v_foto, case when v_foto is not null then 'image/jpeg' end)
  returning id into v_id;
  return v_id;
end;
$$;
