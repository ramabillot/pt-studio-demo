-- ── PT Studio — Migration 024: modelli di scheda ─────────────────────────────
-- Il PT salva una scheda come modello e la riusa ("Copia da…" nel Builder).
-- payload = { giorni:[{ key, nome, righe:[…campi del Builder…] }] } (vedi lib/builder.js payloadModello).
-- pt_id senza foreign key (come segnalazioni): così non blocca la cancellazione di un PT
-- e la migration passa dal connettore. Solo aggiunte. "Elimina" nell'app = archiviato_at.
create table if not exists public.modelli_scheda (
  id          uuid primary key default gen_random_uuid(),
  pt_id       uuid not null default auth.uid(),
  nome        text not null,
  obiettivo   text not null default '',
  livello     text not null default '',
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  archiviato_at timestamptz             -- "Elimina" dall'app = archiviato (niente cancellazioni via API)
);
create index if not exists idx_modelli_scheda_pt on public.modelli_scheda (pt_id);
alter table public.modelli_scheda enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'modelli_scheda' and policyname = 'pt owns modelli_scheda') then
    create policy "pt owns modelli_scheda" on public.modelli_scheda for all
      using (auth.uid() = pt_id) with check (auth.uid() = pt_id);
  end if;
end $$;

grant select, insert, update on public.modelli_scheda to authenticated;
