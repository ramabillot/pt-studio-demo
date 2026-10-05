-- ── PT Studio — Migration 022: note del PT visibili all'atleta ─────────────────
-- Applicata il 2026-10-05 via connettore Supabase.
--  · atleta_get_scheda restituisce anche scheda_esercizi.note (prima solo lato PT)
--  · stessa funzione della 014, cambia solo la lista dei campi degli esercizi

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
              select e.id, e.nome, e.esercizio_id_int, e.serie, e.reps, e.rest_sec, e.ordine, e.note
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
