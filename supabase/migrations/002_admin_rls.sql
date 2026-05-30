-- ── PT Studio — Migration 002: admin RLS policy + grants ────────────────────
-- Idempotente — sicuro da eseguire anche se 001 è già stato eseguito.
-- Eseguire nel SQL Editor di Supabase se AdminPanel mostra 0 PT.

-- 1. Permessi tabella per utenti autenticati (necessario per query client-side)
grant select, insert, update on public.profiles to authenticated;

-- 2. Helper is_admin() — security definer bypassa RLS per leggere is_admin
--    senza generare reference circolare nelle policy.
create or replace function public.is_admin()
returns boolean language sql security definer as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- 3. Policy: admin legge tutti i profili (necessaria per AdminPanel)
--    Senza questa policy l'admin vede solo il proprio profilo → 0 PT nella lista.
drop policy if exists "admin read all" on public.profiles;
create policy "admin read all"
  on public.profiles for select
  using (public.is_admin());

-- 4. Policy: admin aggiorna tutti i profili (necessaria per Approva/Blocca, piano, max_atleti)
drop policy if exists "admin update all" on public.profiles;
create policy "admin update all"
  on public.profiles for update
  using (public.is_admin());
