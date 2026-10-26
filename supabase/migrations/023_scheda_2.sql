-- ── PT Studio — Migration 023: Scheda 2.0 ────────────────────────────────────
-- Solo aggiunte (colonne nullable o con default): nessuna riga esistente cambia.
--  · scheda_esercizi: nome per l'atleta, carichi per serie, "consiglia questi pesi",
--    tipo forza/cardio e obiettivi cardio (durata, velocità, inclinazione, livello)
--  · scheda_giorni.nascosto_at: giorno nascosto invece che cancellato (B7)
--  · sessione_serie: valori cardio registrati dall'atleta
--  · atleta_get_scheda: restituisce i campi nuovi + peso_iniziale (B4); in scheda_giorni
--    solo i giorni visibili (come vedevano le app vecchie), i nascosti a parte in giorni_nascosti
--  · atleta_get_sessioni: + valori cardio
--  · atleta_set_cardio: scrive i valori cardio dopo atleta_save_sessione (come atleta_set_note),
--    così atleta_save_sessione non si ricrea
-- Idempotente. Nessuna parola che blocca il connettore.

-- ── Colonne ───────────────────────────────────────────────────────────────────
alter table public.scheda_esercizi add column if not exists nome_atleta          text;
alter table public.scheda_esercizi add column if not exists carichi_serie        jsonb;   -- [{"kg":100},{"kg":110}] · domani {"pct":75}
alter table public.scheda_esercizi add column if not exists carichi_proposti_il  date;    -- "consiglia questi pesi" (vale fino al prossimo allenamento)
alter table public.scheda_esercizi add column if not exists tipo                 text not null default 'forza';
alter table public.scheda_esercizi add column if not exists durata_min           numeric;
alter table public.scheda_esercizi add column if not exists velocita             numeric;
alter table public.scheda_esercizi add column if not exists inclinazione         numeric;
alter table public.scheda_esercizi add column if not exists livello              integer;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'scheda_esercizi_tipo_check') then
    alter table public.scheda_esercizi add constraint scheda_esercizi_tipo_check check (tipo in ('forza','cardio'));
  end if;
end $$;

alter table public.scheda_giorni   add column if not exists nascosto_at  timestamptz;

alter table public.sessione_serie  add column if not exists durata_sec   integer;
alter table public.sessione_serie  add column if not exists velocita     numeric;
alter table public.sessione_serie  add column if not exists inclinazione numeric;
alter table public.sessione_serie  add column if not exists livello      integer;

-- ── Scheda per l'atleta ───────────────────────────────────────────────────────
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
              select e.id, e.nome, e.esercizio_id_int, e.serie, e.reps, e.rest_sec, e.ordine, e.note,
                     e.peso_iniziale, e.nome_atleta, e.carichi_serie, e.carichi_proposti_il,
                     e.tipo, e.durata_min, e.velocita, e.inclinazione, e.livello
              from public.scheda_esercizi e where e.giorno_id = g.id
            ) eq) as scheda_esercizi
          from public.scheda_giorni g where g.scheda_id = s.id and g.nascosto_at is null
        ) gq) as scheda_giorni,
        (select coalesce(json_agg(json_build_object('id', g.id, 'nome', g.nome, 'giorno_key', g.giorno_key) order by g.ordine), '[]'::json)
           from public.scheda_giorni g where g.scheda_id = s.id and g.nascosto_at is not null) as giorni_nascosti
      from public.schede s
      where s.atleta_id = v.id and s.attiva = true
      order by s.created_at desc
      limit 1
    ) q
  );
end;
$$;

-- ── Sessioni dell'atleta (+ valori cardio) ────────────────────────────────────
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
            'serie_numero', ss.serie_numero, 'reps', ss.reps, 'peso', ss.peso, 'nota', ss.nota,
            'durata_sec', ss.durata_sec, 'velocita', ss.velocita, 'inclinazione', ss.inclinazione, 'livello', ss.livello
          ) order by ss.nome_esercizio, ss.serie_numero), '[]'::json)
         from public.sessione_serie ss where ss.sessione_id = s.id) as sessione_serie
      from public.sessioni s where s.atleta_id = v.id
    ) sq
  );
end;
$$;

-- ── Valori cardio, dopo il salvataggio della sessione ─────────────────────────
-- p_valori: [{ "scheda_esercizio_id": uuid|null, "nome_esercizio": text,
--              "durata_sec": int, "velocita": num, "inclinazione": num, "livello": int }]
create or replace function public.atleta_set_cardio(p_token text, p_sessione_id uuid, p_valori jsonb)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare v public.atleti;
begin
  v := private.atleta_da_token(p_token);
  if not exists (select 1 from public.sessioni s where s.id = p_sessione_id and s.atleta_id = v.id) then
    raise exception 'sessione_non_trovata' using errcode = '22023';
  end if;
  update public.sessione_serie ss
     set durata_sec   = nullif(n->>'durata_sec','')::integer,
         velocita     = nullif(n->>'velocita','')::numeric,
         inclinazione = nullif(n->>'inclinazione','')::numeric,
         livello      = nullif(n->>'livello','')::integer
    from jsonb_array_elements(coalesce(p_valori, '[]'::jsonb)) n
   where ss.sessione_id = p_sessione_id
     and ss.serie_numero = 1
     and (
       (nullif(n->>'scheda_esercizio_id','') is not null and ss.esercizio_id = (n->>'scheda_esercizio_id')::uuid)
       or (nullif(n->>'scheda_esercizio_id','') is null and ss.nome_esercizio = n->>'nome_esercizio')
     );
end;
$$;

grant execute on function public.atleta_get_scheda(text)                to anon, authenticated;
grant execute on function public.atleta_get_sessioni(text)              to anon, authenticated;
grant execute on function public.atleta_set_cardio(text, uuid, jsonb)   to anon, authenticated;
