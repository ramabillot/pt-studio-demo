-- ── PT Studio — Migration 015: disattiva le vecchie RPC atleta basate sull'ID ──
-- Da applicare SOLO dopo che il frontend con l'accesso a token (migration 014) è online.
--
-- Le vecchie funzioni accettavano solo l'ID dell'atleta, senza verifiche, e
-- login_atleta restituiva anche il PIN. Invece di eliminarle le sostituiamo con
-- versioni che rifiutano sempre la chiamata (stesse firme e tipi di ritorno).

create or replace function public.login_atleta(p_username text, p_pin text)
returns json language plpgsql security definer set search_path = public
as $$ begin raise exception 'funzione_dismessa: usare atleta_login'; end; $$;

create or replace function public.get_scheda_atleta(p_atleta_id uuid)
returns json language plpgsql security definer set search_path = public
as $$ begin raise exception 'funzione_dismessa: usare atleta_get_scheda'; end; $$;

create or replace function public.get_sessioni_atleta(p_atleta_id uuid)
returns json language plpgsql security definer set search_path = public
as $$ begin raise exception 'funzione_dismessa: usare atleta_get_sessioni'; end; $$;

create or replace function public.get_misurazioni_atleta(p_atleta_id uuid)
returns json language plpgsql security definer set search_path = public
as $$ begin raise exception 'funzione_dismessa: usare atleta_get_misurazioni'; end; $$;

create or replace function public.get_appuntamenti_atleta(p_atleta_id uuid)
returns json language plpgsql security definer set search_path = public
as $$ begin raise exception 'funzione_dismessa: usare atleta_get_appuntamenti'; end; $$;

create or replace function public.save_sessione_atleta(
  p_atleta_id uuid, p_pt_id uuid, p_scheda_id uuid, p_giorno_id uuid, p_data date, p_serie jsonb)
returns uuid language plpgsql security definer set search_path = public
as $$ begin raise exception 'funzione_dismessa: usare atleta_save_sessione'; end; $$;

create or replace function public.get_pt_name(p_pt_id uuid)
returns json language plpgsql security definer set search_path = public
as $$ begin raise exception 'funzione_dismessa: il nome del PT arriva da atleta_me'; end; $$;
