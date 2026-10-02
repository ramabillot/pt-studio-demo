# PT Studio

Web app per personal trainer: il PT gestisce atleti, schede, calendario e misurazioni;
l'atleta registra gli allenamenti dal telefono e vede i suoi progressi.

- **Frontend:** React + Vite, deploy su Vercel (push su `main` = pubblicazione)
- **Backend:** Supabase (Postgres + Auth + RLS). Migration in `supabase/migrations/` (append-only)
- **Accesso atleta:** username + PIN → token di sessione (`src/api/atleta.js`)

## Sviluppo (Windows / PowerShell)

```powershell
npm install
npm run dev      # http://localhost:5173 — serve .env.local con VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm run build
npm run lint
```

Dettagli tecnici e convenzioni: `CLAUDE.md`.
