# CLAUDE.md — PT Studio (repo tecnico)

> File tecnico per Claude Code. Letto automaticamente all'apertura del progetto.
> Definisce stack, struttura, modello dati e convenzioni di **PT Studio**.
> Le decisioni strategiche/di prodotto NON stanno qui — stanno nel project knowledge su claude.ai (ROADMAP / STATUS / DECISIONS).

---

## Cos'è PT Studio

Web app per **personal trainer**. Il PT gestisce i propri atleti, crea schede di allenamento, traccia sessioni, misurazioni e appuntamenti. L'atleta accede con credenziali consegnate dal PT e vede solo i propri dati.

Tre ruoli:
- **PT** — si registra da solo (email + password). Gestisce i propri atleti.
- **Atleta** — NON si registra. Lo crea il PT, che gli consegna `username + PIN numerico 4 cifre`. Vede solo i propri dati.
- **Admin** — vista franchisor: vede tutti i PT sotto di lui (es. catena di palestre).

---

## Stack

```
OS sviluppo:  Windows (PowerShell, NON bash)
Frontend:     React + Vite
Styling:      src/styles/app.css (token in :root) + stili inline nei componenti
PDF:          jsPDF
Hosting:      Vercel
Backend:      Supabase (Postgres + Auth + Storage)
AI:           Anthropic API — SOLO da backend, MAI da frontend (chiave esposta + costo non controllabile)
Repo:         github.com/ramabillot/pt-studio-demo
```

---

## Comandi (Windows / PowerShell)

```powershell
npm install       # installa dipendenze
npm run dev       # dev server Vite (localhost:5173)
npm run build     # build di produzione
npm run preview   # preview della build
npm run lint      # ESLint
```

---

## Struttura del progetto

```
pt-studio-demo/
├── CLAUDE.md
├── README.md
├── index.html             ← font Google (Bebas Neue + DM Sans) caricati qui
├── public/exercises-custom/ ← 20 foto esercizi .jpg (→ Supabase Storage in futuro)
├── supabase/migrations/   ← migration numerate, append-only
└── src/
    ├── main.jsx           ← entry point React
    ├── App.jsx            ← shell: sessione, fasi, routing; viste caricate con React.lazy
    ├── styles/app.css     ← CSS globale + token colore (:root)
    ├── index.css          ← CSS template Vite (da rimuovere nel restyling)
    ├── data.js            ← EXERCISES (82, id stabili), CATEGORIES, CAT_COLORS, ecc.
    ├── utils.js           ← date, numeri, localStorage sicuro, PDF (jsPDF on-demand)
    ├── api/atleta.js      ← client RPC atleta (token di sessione)
    ├── lib/allenamento.js ← logica registrazione allenamento (ultima volta, serie, riepiloghi)
    ├── lib/appuntamenti.js← colori per tipo appuntamento
    └── components/
        ├── LoginScreen, WelcomeScreen, PendingApproval, Sidebar (Sidebar, MobileNav, BackBtn)
        ├── Dashboard, Library (VideoModal), Builder (AtletaSearchField), Atleti, Calendar (CalendarView)
        ├── AdminStats, AdminPanel, AccountSettings
        ├── AtletaView         ← vista atleta (scheda, registrazione, calendario)
        ├── atleta/            ← AtletaProgressi, MonthCalendar
        ├── MisureSection      ← misurazioni (atleta e PT)
        ├── EsercizioCard, ProgressiEsercizi (ProgressiMultiChart), AllenamentiAtletaPT
```

---

## Modello dati

> Supabase (Postgres). Entità principali:

| Entità | Note |
|---|---|
| **users / PT** | email + password (Supabase Auth). Si registra da solo. |
| **atleti** | username + PIN 4 cifre numerico. Creato e gestito dal PT. Profilo esteso: altezza, data nascita, sesso, note PT. |
| **schede** | giorni con nomi personalizzabili (Push, Gambe, Pull…). Default `Giorno A/B/C`. Payload include i nomi giorno. |
| **sessioni** | log allenamenti. Pesi esercizi: ogni entry ha una data, si accumula nel tempo. |
| **misurazioni** | tracker temporale: peso, vita + avanzati (fianchi, petto, braccio, grasso %, FC). Ogni entry datata. |
| **appuntamenti** | calendario del PT, collegati all'atleta (`atleta_id`). L'atleta vede solo i propri. |

**Convenzione fondamentale:** si dice **"Atleta"**, mai "Cliente". Ovunque — UI, variabili, commenti.

**Modalità demo rimossa (2026-10):** salvata nel tag git `demo-v1`. Il codice usa solo dati reali Supabase.

---

## Accesso atleta (token di sessione)

- Login atleta: RPC `atleta_login(username, pin)` → token casuale salvato in `localStorage` (`ptstudio_atleta_token`); nel DB solo l'hash (`atleta_sessioni`). Valido 180 giorni, rinnovato con l'uso.
- Tutte le funzioni atleta prendono il token: `atleta_me`, `atleta_get_scheda/sessioni/misurazioni/appuntamenti`, `atleta_save_sessione`, `atleta_logout`. Client in `src/api/atleta.js`.
- Blocco 15 minuti dopo 5 PIN sbagliati. Helper SQL nello schema `private` (non esposto).
- Le vecchie RPC con ID (`login_atleta`, `get_*_atleta`, `save_sessione_atleta`, `get_pt_name`) sono dismesse (migration 015).

---

## App installabile + aggiornamento automatico

- `public/manifest.webmanifest` (nome "PT Studio", standalone, colore `#07070d`) + meta iOS in `index.html` (`apple-touch-icon`, `apple-mobile-web-app-*`).
- Logo: "PT" (Bebas Neue, `#e8ff47`) con "STUDIO" piccolo sotto, largo esattamente come "PT". Sorgente vettoriale `public/icons/logo.svg`; icone PNG in `public/icons/` (192, 512, maskable 512), `public/apple-touch-icon.png` (180), favicon `favicon.svg` (solo "PT") + `favicon-32.png`. Generate dai glifi del font (testo convertito in tracciati).
- Versione = commit Vercel (`VITE_APP_VERSION`); il plugin in `vite.config.js` scrive `dist/version.json`. `components/AggiornamentoApp.jsx` lo confronta: all'apertura o al ritorno dopo >30 min ricarica da sola (una volta per versione), al ritorno dopo poco mostra il banner "Aggiorna" (non perdere i pesi in inserimento).
- Nessun service worker (niente offline) per ora.

---

## Segnalazioni beta (bug / idee)

- Bottone flottante 🐞 (`components/SegnalaBug.jsx`) visibile a PT, admin e atleta quando sono dentro l'app.
- Salva con la RPC `segnala(tipo, testo, contesto, foto_b64, token)` (migration 017) nella tabella `segnalazioni`: PT = `auth.uid()`, atleta = token.
- Contesto automatico: ruolo, vista, elementi `.active` a schermo, URL, versione (`VITE_APP_VERSION` = commit Vercel), schermo, user agent, ultimi 5 errori JS (`lib/erroriRecenti.js`).
- Foto opzionale: ridotta a 1280px jpeg nel browser e salvata come `bytea` (niente bucket Storage aperto agli anonimi).
- Tabella senza policy RLS: si legge solo da Claude (connettore Supabase) o dal SQL Editor. Campi di gestione: `stato` (aperta | in_corso | risolta | scartata), `risposta`, `aggiornata_at`.

---

## Convenzioni & pattern noti

- **Grafici progressi:** colori per *indice* via `LINE_COLORS`, indipendenti dalla categoria (più esercizi della stessa categoria devono restare leggibili).
- **Builder:** "Modifica nel Builder" pre-compila con la scheda esistente e salva **sul posto** (stessi `scheda_giorni`, esercizi aggiornati per `dbId`): mai cancellare e ricreare la scheda, altrimenti le sessioni perdono il `giorno_id`.
- **Ripetizioni:** `reps` è testo (accetta intervalli "8-10").
- **Sessioni:** si salvano tutti gli esercizi del giorno (anche corpo libero, peso null), una riga per serie, con `esercizio_id` = id `scheda_esercizi`.
- **PIN atleta:** `inputMode="numeric"` per tastiera numerica automatica su mobile. Reset PIN dal pannello PT.
- **Mobile:** layout già fixati a 2x2 (dashboard PT, sezione "VAI A"). Testare sempre su viewport stretto.

---

## Design

- Dark, elegante. Riferimenti: **Whoop, Linear, MyFitnessPal Pro**.
- NON gaming, NON corporate generico.
- Font: **Bebas Neue** (titoli) + **DM Sans** (testo).

---

## Regole di lavoro per Claude Code

1. **Output:** file completo pronto da sostituire, non patch parziali (se non richiesto diversamente).
2. **Anthropic API mai dal frontend.** Qualsiasi chiamata AI passa da backend.
3. **Spiega solo le scelte architetturali importanti**, non ogni riga.
4. **Comandi sempre per Windows/PowerShell**, non bash.
5. **Sincronizzazione:** ogni decisione **architetturale** presa qui (cambio schema DB, nuova libreria, ristrutturazione cartelle) va riportata in `DECISIONS.md` / `STATUS.md` nel project knowledge. I dettagli di implementazione restano qui.

---

## Stato attuale

- Beta personale (Ramiro PT + atleta, Marta atleta). Stato e punti aperti → `STATUS.md` nel project knowledge.
- Migration fino alla 017 in `supabase/migrations/`.
- Lint: 0 errori; `react-hooks/set-state-in-effect` è warning (da sistemare quando si tocca il componente).
