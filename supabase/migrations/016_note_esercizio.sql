-- ── PT Studio — Migration 016: note per esercizio nella sessione ───────────────
-- Applicata il 2026-10-02 via connettore Supabase.
--  · sessione_serie.nota: la nota dell'atleta su un esercizio (salvata sulla serie 1)
--  · atleta_get_sessioni restituisce anche la nota
--  · atleta_set_note(token, sessione_id, note[]) scrive le note dopo il salvataggio
--    (funzione separata per non dover ricreare atleta_save_sessione)

alter table public.sessione_serie add column if not exists nota text;

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
            'serie_numero', ss.serie_numero, 'reps', ss.reps, 'peso', ss.peso, 'nota', ss.nota
          ) order by ss.nome_esercizio, ss.serie_numero), '[]'::json)
         from public.sessione_serie ss where ss.sessione_id = s.id) as sessione_serie
      from public.sessioni s where s.atleta_id = v.id
    ) sq
  );
end;
$$;

-- p_note: [{ "scheda_esercizio_id": uuid|null, "nome_esercizio": text, "nota": text }]
create or replace function public.atleta_set_note(p_token text, p_sessione_id uuid, p_note jsonb)
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
     set nota = nullif(trim(n->>'nota'), '')
    from jsonb_array_elements(coalesce(p_note, '[]'::jsonb)) n
   where ss.sessione_id = p_sessione_id
     and ss.serie_numero = 1
     and (
       (nullif(n->>'scheda_esercizio_id','') is not null and ss.esercizio_id = (n->>'scheda_esercizio_id')::uuid)
       or (nullif(n->>'scheda_esercizio_id','') is null and ss.nome_esercizio = n->>'nome_esercizio')
     );
end;
$$;
