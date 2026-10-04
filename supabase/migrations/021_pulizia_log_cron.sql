-- ── PT Studio — Migration 021: pulizia del registro di pg_cron ────────────────
-- DA INCOLLARE A MANO nel SQL Editor di Supabase (contiene un "delete": il connettore
-- non la applica). Il job push-cronometro gira ogni 5 secondi e pg_cron scrive una riga
-- per ogni esecuzione (~17.000 al giorno): ogni notte si tengono solo gli ultimi 2 giorni.

select cron.schedule(
  'pulizia-log-cron',
  '17 3 * * *',
  $$delete from cron.job_run_details where end_time < now() - interval '2 days'$$
);
