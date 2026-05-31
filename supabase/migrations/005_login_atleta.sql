-- ── PT Studio — Migration 005: funzione login atleta ─────────────────────────
-- Funzione security definer per autenticare atleti via username + PIN.
-- Chiamata da client anon (senza sessione Supabase Auth).
-- Idempotente. Eseguire nel SQL Editor di Supabase.

create or replace function public.login_atleta(p_username text, p_pin text)
returns json language plpgsql security definer as $$
declare
  atleta_row public.atleti%rowtype;
begin
  select * into atleta_row
  from public.atleti
  where username = p_username and pin = p_pin
  limit 1;

  if atleta_row.id is null then
    return null;
  end if;

  return row_to_json(atleta_row);
end;
$$;

-- Permette al client anonimo (non autenticato) di chiamare la funzione
grant execute on function public.login_atleta(text, text) to anon;
