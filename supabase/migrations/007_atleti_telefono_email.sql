-- ── PT Studio — Migration 007: telefono ed email su atleti ──────────────────
-- Aggiunge due colonne opzionali alla tabella atleti.
-- Idempotente. Eseguire nel SQL Editor di Supabase.

alter table public.atleti add column if not exists telefono text;
alter table public.atleti add column if not exists email     text;
