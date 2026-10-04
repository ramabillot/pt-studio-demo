-- ── PT Studio — Migration 020: avviso "silenzioso" ────────────────────────────
-- Applicata il 2026-10-04 via connettore Supabase.
-- "Recupero · finisce alle…" (appena si blocca lo schermo) non deve suonare né vibrare;
-- solo "Recupero finito" avvisa. L'app manda { "silenziosa": true } nell'avviso.

alter table public.push_programmate add column if not exists silenziosa boolean not null default false;

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
      insert into public.push_programmate (atleta_id, invia_at, titolo, corpo, silenziosa)
      values (v.id, now() + make_interval(secs => (a->>'tra_sec')::int), a->>'titolo', left(a->>'corpo', 200),
              coalesce((a->>'silenziosa')::boolean, false));
    end if;
  end loop;
end;
$$;
