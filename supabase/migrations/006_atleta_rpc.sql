-- ── PT Studio — Migration 006: RPC atleta (accesso anon) ────────────────────
-- Security definer functions per atleti non-Auth.
-- Idempotente. Eseguire nel SQL Editor di Supabase.

-- ── Scheda attiva assegnata all'atleta ───────────────────────────────────────
create or replace function public.get_scheda_atleta(p_atleta_id uuid)
returns json language plpgsql security definer as $$
begin
  return (
    select row_to_json(q)
    from (
      select s.id, s.nome, s.obiettivo, s.livello, s.assegnata_il, s.atleta_id, s.pt_id,
        (
          select coalesce(json_agg(gq order by gq.ordine), '[]'::json)
          from (
            select g.id, g.nome, g.giorno_key, g.ordine,
              (
                select coalesce(json_agg(eq order by eq.ordine), '[]'::json)
                from (
                  select e.id, e.nome, e.esercizio_id_int, e.serie, e.reps, e.rest_sec, e.ordine
                  from public.scheda_esercizi e
                  where e.giorno_id = g.id
                ) eq
              ) as scheda_esercizi
            from public.scheda_giorni g
            where g.scheda_id = s.id
          ) gq
        ) as scheda_giorni
      from public.schede s
      where s.atleta_id = p_atleta_id and s.attiva = true
      limit 1
    ) q
  );
end;
$$;
grant execute on function public.get_scheda_atleta(uuid) to anon;

-- ── Sessioni con serie ────────────────────────────────────────────────────────
create or replace function public.get_sessioni_atleta(p_atleta_id uuid)
returns json language plpgsql security definer as $$
begin
  return (
    select coalesce(json_agg(sq order by sq.data), '[]'::json)
    from (
      select s.id, s.data, s.giorno_id,
        (
          select coalesce(json_agg(row_to_json(ss)), '[]'::json)
          from public.sessione_serie ss
          where ss.sessione_id = s.id
        ) as sessione_serie
      from public.sessioni s
      where s.atleta_id = p_atleta_id
    ) sq
  );
end;
$$;
grant execute on function public.get_sessioni_atleta(uuid) to anon;

-- ── Salva sessione (upsert: delete + insert) ──────────────────────────────────
create or replace function public.save_sessione_atleta(
  p_atleta_id  uuid,
  p_pt_id      uuid,
  p_scheda_id  uuid,
  p_giorno_id  uuid,
  p_data       date,
  p_serie      jsonb
) returns uuid language plpgsql security definer as $$
declare
  v_id uuid;
begin
  delete from public.sessioni
  where atleta_id = p_atleta_id and data = p_data and giorno_id = p_giorno_id;

  insert into public.sessioni (pt_id, atleta_id, scheda_id, giorno_id, data)
  values (p_pt_id, p_atleta_id, p_scheda_id, p_giorno_id, p_data)
  returning id into v_id;

  insert into public.sessione_serie (sessione_id, pt_id, nome_esercizio, serie_numero, peso, completata)
  select v_id, p_pt_id,
    s->>'nome_esercizio',
    (s->>'serie_numero')::integer,
    (s->>'peso')::numeric,
    true
  from jsonb_array_elements(p_serie) s
  where s->>'nome_esercizio' is not null;

  return v_id;
end;
$$;
grant execute on function public.save_sessione_atleta(uuid, uuid, uuid, uuid, date, jsonb) to anon;

-- ── Misurazioni (inserite dal PT, lette dall'atleta) ─────────────────────────
create or replace function public.get_misurazioni_atleta(p_atleta_id uuid)
returns json language plpgsql security definer as $$
begin
  return (
    select coalesce(json_agg(row_to_json(m) order by m.data), '[]'::json)
    from public.misurazioni m
    where m.atleta_id = p_atleta_id
  );
end;
$$;
grant execute on function public.get_misurazioni_atleta(uuid) to anon;

-- ── Appuntamenti ──────────────────────────────────────────────────────────────
create or replace function public.get_appuntamenti_atleta(p_atleta_id uuid)
returns json language plpgsql security definer as $$
begin
  return (
    select coalesce(json_agg(row_to_json(a) order by a.data, a.ora), '[]'::json)
    from public.appuntamenti a
    where a.atleta_id = p_atleta_id
  );
end;
$$;
grant execute on function public.get_appuntamenti_atleta(uuid) to anon;
