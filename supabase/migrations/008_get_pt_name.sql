-- ── PT Studio — Migration 008: get_pt_name (accesso anon) ───────────────────
-- Permette agli atleti (ruolo anon) di leggere il nome del PT dalla tabella
-- profiles, che è protetta da RLS. Security definer bypassa RLS.
-- Idempotente. Eseguire nel SQL Editor di Supabase.

create or replace function public.get_pt_name(p_pt_id uuid)
returns json language plpgsql security definer as $$
begin
  return (
    select row_to_json(q)
    from (
      select nome, cognome from public.profiles where id = p_pt_id limit 1
    ) q
  );
end;
$$;
grant execute on function public.get_pt_name(uuid) to anon;
