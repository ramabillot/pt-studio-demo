-- ── PT Studio — Migration 011: archiviazione atleti + eliminazione PT ─────────
-- 1. Colonna archived_at su atleti (soft delete / archiviazione)
-- 2. Aggiorna login_atleta: atleti archiviati non possono accedere
-- 3. RPC admin_delete_pt: elimina un PT da auth.users (cascade completo)
-- Append-only. Eseguire nel SQL Editor di Supabase.

-- ── 1. Soft delete ────────────────────────────────────────────────────────────
alter table public.atleti
  add column if not exists archived_at timestamptz;

-- ── 2. Aggiorna login_atleta ──────────────────────────────────────────────────
-- Aggiunge il controllo archived_at IS NULL alla guardia già presente su is_approved.
create or replace function public.login_atleta(p_username text, p_pin text)
returns json language plpgsql security definer as $$
declare
  atleta_row  public.atleti%rowtype;
  pt_approved boolean;
begin
  select * into atleta_row
  from public.atleti
  where username    = p_username
    and pin         = p_pin
    and archived_at is null;     -- atleti archiviati non possono loggarsi

  if atleta_row.id is null then
    return null;
  end if;

  select is_approved into pt_approved
  from public.profiles
  where id = atleta_row.pt_id;

  if not coalesce(pt_approved, false) then
    return null;
  end if;

  return row_to_json(atleta_row);
end;
$$;

grant execute on function public.login_atleta(text, text) to anon;

-- ── 3. RPC eliminazione PT ────────────────────────────────────────────────────
-- Elimina l'utente da auth.users → cascade verso profiles → atleti → tutto il resto.
-- security definer = gira come postgres (proprietario della funzione), che ha
-- accesso a auth.users. L'admin check all'interno evita escalation non autorizzata.
create or replace function public.admin_delete_pt(p_pt_id uuid)
returns void language plpgsql security definer as $$
begin
  if not coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  ) then
    raise exception 'Accesso non autorizzato';
  end if;

  -- Il delete su auth.users propaga in cascade:
  -- auth.users → profiles (on delete cascade) → atleti (on delete cascade)
  --           → schede → sessioni / misurazioni / appuntamenti
  delete from auth.users where id = p_pt_id;
end;
$$;

-- Solo utenti autenticati (l'admin è autenticato via Supabase Auth)
grant execute on function public.admin_delete_pt(uuid) to authenticated;
