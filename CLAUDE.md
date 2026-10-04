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
├── index.html             ← Home (/) non installabile → src/home.jsx
├── atleta/index.html      ← app atleta (/atleta/) → src/main.jsx, manifest public/atleta/
├── pt/index.html          ← app PT/admin (/pt/) → src/main.jsx, manifest public/pt/
├── public/exercises-custom/ ← 20 foto esercizi .jpg (→ Supabase Storage in futuro)
├── supabase/migrations/   ← migration numerate, append-only
└── src/
    ├── main.jsx           ← entry delle due app (/atleta/ e /pt/)
    ├── home.jsx           ← entry della Home (leggera: niente Supabase)
    ├── lib/app.js         ← APP = "atleta" | "pt" dall'indirizzo, link di accesso atleta
    ├── lib/installa.js    ← prompt di installazione Android + rilevamento iPhone/standalone
    ├── App.jsx            ← shell: sessione, fasi, routing; viste caricate con React.lazy
    ├── styles/app.css     ← CSS globale + token colore (:root)
    ├── index.css          ← CSS template Vite (da rimuovere nel restyling)
    ├── data.js            ← EXERCISES (82, id stabili), CATEGORIES, CAT_COLORS, ecc.
    ├── utils.js           ← date, numeri, localStorage sicuro, PDF (jsPDF on-demand)
    ├── api/atleta.js      ← client RPC atleta (token di sessione)
    ├── lib/allenamento.js ← logica registrazione allenamento (ultima volta, serie, riepiloghi)
    ├── lib/appuntamenti.js← colori per tipo appuntamento
    └── components/
        ├── Home, LoginScreen, WelcomeScreen, PendingApproval, Sidebar (Sidebar, MobileNav, BackBtn), InvitoInstalla
        ├── Dashboard, Library (VideoModal), Builder (AtletaSearchField), Atleti, Calendar (CalendarView)
        ├── AdminStats, AdminPanel, AccountSettings
        ├── AtletaView         ← vista atleta (scheda, registrazione, calendario)
        ├── atleta/            ← AtletaProgressi, MonthCalendar, Cronometro
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

## Tre indirizzi, due app installabili (2026-10-04)

- **`/`** = Home (`index.html` → `src/home.jsx` → `components/Home.jsx`): cos'è + "Accedi come Atleta / PT". **Nessun manifest** → non installabile. Non carica Supabase.
- **`/atleta/`** = app atleta "PT Studio": manifest **dinamico** dalla funzione Vercel `api/manifest-atleta.js` (rewrite di `/atleta/manifest.webmanifest`); `id`/`scope` = `/atleta/`, `start_url` = `/atleta/?u=<username>[&c=<codice>]`. Il `<link rel=manifest>` lo scrive l'inline script in `atleta/index.html` (da `?u`/`?c` dell'URL o dall'ultimo username salvato `ptstudio_atleta_username`). Icone `public/icons/`, `apple-touch-icon.png`.
- **iPhone senza secondo login** (migration 018): su iPhone l'icona sulla Home non condivide i dati con Safari. In Safari (non installata), dopo il login o all'apertura, `preparaIconaIPhone` in `App.jsx` crea un codice monouso (`atleta_crea_codice_installa`, 7 giorni) e ricarica su `/atleta/?u=…&c=…` → finisce nello `start_url` dell'icona → al primo avvio senza token `atleta_login_codice` lo scambia con un token. Codice già usato/scaduto → login con username precompilato.
- **`/pt/`** = app PT/admin "PT Studio Coach" (short name "PT Coach"): `public/pt/manifest.webmanifest` (`/pt/`), icone `public/icons/coach/` (logo con "COACH" al posto di "STUDIO", sorgente `public/icons/coach/logo.svg`).
- Vite multi-pagina (`build.rollupOptions.input` in `vite.config.js`); stesso `main.jsx`/`App.jsx` per le due app, `APP` (da `lib/app.js`) decide quale.
- **Sessioni indipendenti** (Android: stesso storage per le due app): app atleta = solo token `ptstudio_atleta_token`, client Supabase con `persistSession:false` (non legge la sessione del PT); app PT = solo Supabase Auth. Il logout esce solo dall'app aperta.
- Login senza selettore: il ruolo viene dall'indirizzo. `/atleta/?u=<username>` precompila lo username (link del messaggio WhatsApp generato in `Atleti.jsx`, con PIN).
- `InvitoInstalla`: dopo il login, solo su telefono e se non già installata → Android bottone "Installa" (`beforeinstallprompt`), iPhone istruzioni Safari. Chiuso una volta, non ricompare (`ptstudio_invito_installa_<app>`).
- `vercel.json`: rewrite `/atleta/manifest.webmanifest` → `/api/manifest-atleta`; redirect `/atleta`→`/atleta/`, `/pt`→`/pt/`, `/admin`→`/pt/`; no-cache su HTML, manifest e `version.json`.
- CSS: `home.jsx` importa `index.css` prima di `app.css` come le app, così il CSS condiviso resta in un solo file nello stesso ordine (altrimenti il template Vite sovrascrive i token).
- Logo: "PT" (Bebas Neue, `#e8ff47`) con "STUDIO"/"COACH" piccolo sotto, largo esattamente come "PT". Favicon `favicon.svg` (solo "PT") + `favicon-32.png`. Icone generate dai glifi del font (testo convertito in tracciati).
- Versione = commit Vercel (`VITE_APP_VERSION`); il plugin in `vite.config.js` scrive `dist/version.json`. `components/AggiornamentoApp.jsx` lo confronta: all'apertura o al ritorno dopo >30 min ricarica da sola (una volta per versione), al ritorno dopo poco mostra il banner "Aggiorna" (non perdere i pesi in inserimento).
- Nessun service worker (niente offline) per ora. Le notifiche push del cronometro (STATUS #2c) aggiungeranno un service worker solo-notifiche con scope `/atleta/`.

---

## Segnalazioni beta (bug / idee)

- Bottone flottante 🐞 (`components/SegnalaBug.jsx`) visibile a PT, admin e atleta quando sono dentro l'app.
- Salva con la RPC `segnala(tipo, testo, contesto, foto_b64, token)` (migration 017) nella tabella `segnalazioni`: PT = `auth.uid()`, atleta = token.
- Contesto automatico: ruolo, vista, elementi `.active` a schermo, URL, versione (`VITE_APP_VERSION` = commit Vercel), schermo, user agent, ultimi 5 errori JS (`lib/erroriRecenti.js`).
- Foto opzionale: ridotta a 1280px jpeg nel browser e salvata come `bytea` (niente bucket Storage aperto agli anonimi).
- Tabella senza policy RLS: si legge solo da Claude (connettore Supabase) o dal SQL Editor. Campi di gestione: `stato` (aperta | in_corso | risolta | scartata), `risposta`, `aggiornata_at`.

## Cronometro (atleta)

- `lib/cronometro.js` (logica, audio, localStorage `ptstudio_cronometro`) + `components/atleta/Cronometro.jsx` (pillola in basso, montata in `AtletaView`).
- Chip ⏱ (recupero `rest_sec`) e ▶ Ns (se `reps` = "30s") nella riga meta di `EsercizioCard`. Un solo cronometro alla volta.
- Si salva l'**ora di fine**, non i secondi rimasti: a schermo bloccato / ricaricamento il tempo resta giusto; dopo la fine mostra `+m:ss` e sparisce dopo 10 min.
- Suona/vibra solo se la fine avviene con l'app visibile (audio sbloccato dal tocco sul chip; iPhone non vibra). Niente notifiche (servirebbe il service worker).

---

## Convenzioni & pattern noti

- **supabase-js ≥ 2.117** (senza lock di sessione): con la 2.106 un login dopo il logout restava appeso. In `onAuthStateChange` mai `await` di chiamate Supabase: rimandarle con `setTimeout`.

- **Grafici progressi:** colori per *indice* via `LINE_COLORS`, indipendenti dalla categoria (più esercizi della stessa categoria devono restare leggibili).
- **Builder:** "Modifica nel Builder" pre-compila con la scheda esistente e salva **sul posto** (stessi `scheda_giorni`, esercizi aggiornati per `dbId`): mai cancellare e ricreare la scheda, altrimenti le sessioni perdono il `giorno_id`.
- **Ripetizioni:** `reps` è testo (accetta intervalli "8-10" e secondi "30s" per gli esercizi a tempo).
- **Sessioni:** si salvano tutti gli esercizi del giorno (anche corpo libero, peso null), una riga per serie, con `esercizio_id` = id `scheda_esercizi`.
- **PIN atleta:** `inputMode="numeric"` per tastiera numerica automatica su mobile. Reset PIN dal pannello PT.
- **Mobile:** layout già fixati a 2x2 (dashboard PT, sezione "VAI A"). Testare sempre su viewport stretto.

---

## Design

- Dark, elegante. Riferimenti: **Whoop, Linear, MyFitnessPal Pro**.
- NON gaming, NON corporate generico.
- Font: **Bebas Neue** (titoli) + **DM Sans** (testo).

---

## ⚠️ MUST: mai far reinstallare l'app

Nessuna modifica deve richiedere agli utenti di cancellare e reinstallare l'app (icona sulla Home). Tutto deve arrivare con l'aggiornamento automatico (`AggiornamentoApp`). In pratica **non cambiare mai**:
- gli indirizzi `/atleta/` e `/pt/` (e `/` come Home);
- `id` e `scope` dei manifest (`api/manifest-atleta.js`, `public/pt/manifest.webmanifest`);
- le chiavi salvate sul telefono (`ptstudio_atleta_token`, `ptstudio_atleta_username`, sessione Supabase): se servono nuove chiavi, leggere anche le vecchie e migrare.

Se una modifica sembra richiedere la reinstallazione: **fermarsi**, cercare un'alternativa e, solo se è davvero l'unica strada, spiegarlo a Ramiro prima di farla. (Decisione 2026-10-04 in DECISIONS.md; durante la beta è stata fatta un'eccezione per la separazione /atleta/ /pt/.)

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
- Migration fino alla 018 in `supabase/migrations/`.
- Lint: 0 errori; `react-hooks/set-state-in-effect` è warning (da sistemare quando si tocca il componente).
