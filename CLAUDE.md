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
Styling:      CSS-in-JS inline + CSS variables
PDF:          jsPDF
Hosting:      Vercel
Backend:      Supabase (Postgres + Auth + Storage)   ← in migrazione da localStorage (Fase 1)
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
├── package.json
├── vite.config.js
├── eslint.config.js
├── index.html
├── download-images.mjs    ← script one-shot per scaricare le foto esercizi
├── public/
│   ├── exercises-custom/  ← 20 foto esercizi .jpg (→ migrare a Supabase Storage, Fase 1)
│   └── exercises/         ← foto esercizi formato alternativo
└── src/
    ├── main.jsx           ← entry point React
    ├── App.jsx            ← shell: CSS globale + routing/stato top-level (~640 righe)
    ├── App.css
    ├── index.css
    ├── assets/            ← hero.png, react.svg, vite.svg
    ├── data.js            ← costanti statiche: EXERCISES, ACCOUNTS, THEME_MAP, CAT_COLORS, ecc.
    ├── utils.js           ← helper: date, PDF (buildPDF), storage, DEMO_EVENTS, FAKE_SESSIONS, ecc.
    └── components/        ← 12 componenti
        ├── LoginScreen.jsx
        ├── WelcomeScreen.jsx
        ├── ResetDemoDialog.jsx    ← usa ReactDOM.createPortal; doppio click logo
        ├── Sidebar.jsx            ← esporta: Sidebar, MobileNav, BackBtn
        ├── Dashboard.jsx
        ├── Library.jsx            ← esporta: VideoModal (usato da AtletaView)
        ├── Builder.jsx            ← esporta: AtletaSearchField, SchedaDemoSection
        ├── Atleti.jsx
        ├── Calendar.jsx           ← esporta: typeColor, typeBg, CalendarView, AdminCalendar
        ├── AtletaView.jsx         ← esporta: MisureSection, ProgressiSectionPT
        ├── AdminStats.jsx
        └── AdminPT.jsx
```

---

## Modello dati

> In migrazione da localStorage → Supabase (Postgres). Entità principali:

| Entità | Note |
|---|---|
| **users / PT** | email + password (Supabase Auth). Si registra da solo. |
| **atleti** | username + PIN 4 cifre numerico. Creato e gestito dal PT. Profilo esteso: altezza, data nascita, sesso, note PT. |
| **schede** | giorni con nomi personalizzabili (Push, Gambe, Pull…). Default `Giorno A/B/C`. Payload include i nomi giorno. |
| **sessioni** | log allenamenti. Pesi esercizi: ogni entry ha una data, si accumula nel tempo. |
| **misurazioni** | tracker temporale: peso, vita + avanzati (fianchi, petto, braccio, grasso %, FC). Ogni entry datata. |
| **appuntamenti** | calendario. Condiviso PT→Atleta (`pt_calendar_shared`). L'atleta vede solo i propri (filtro per nome). |

**Convenzione fondamentale:** si dice **"Atleta"**, mai "Cliente". Ovunque — UI, variabili, commenti.

**Credenziali demo** (in-memory, niente dati reali):
```
pt/pt          pt_pro/pt_pro       atleta/atleta       admin/admin
```
> Vecchie credenziali deprecate: demo/demo, fitpro/fitpro, demo_cliente/demo_cliente.
> ⚠️ Decisione aperta: quali di questi account restano in-memory dopo la migrazione Supabase (sub-task 1.5). Confermare in DECISIONS.md.

---

## Sistema temi (per-account)

Temi completi per-account via CSS variables, senza toccare il CSS base:
- `THEME_MAP` — mappa account → tema
- `THEME_DEFAULTS` — valori di default delle CSS variables

Tema attivo: **FitExpress** per l'account `pt_pro` → giallo `#FFD600` su nero, logo "FitExpress Pro" (palestre franchise, potenziale cliente).

Per aggiungere un tema: estendere `THEME_MAP`, NON duplicare CSS.

---

## Convenzioni & pattern noti

- **Grafici progressi:** colori per *indice* via `LINE_COLORS`, indipendenti dalla categoria (più esercizi della stessa categoria devono restare leggibili).
- **Reset demo:** doppio click sul logo (lato PT e lato Atleta) → dialog via `createPortal`. Nascosto di proposito per evitare click accidentali. Serve prima delle presentazioni.
- **Builder:** "Modifica nel Builder" deve **pre-compilare** il builder con la scheda esistente, non ripartire da zero.
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

- **Fase 1** — Backend reale (Supabase). Migrazione da localStorage in corso.
- Per lo stato preciso e i sub-task → `STATUS.md` nel project knowledge.
