# PT Studio — Conoscenza del Progetto

## Chi sono
Ramiro, 28 anni, ingegnere biomedico argentino, abito ad Agrate Brianza (Italia).
Conoscenza intermedia di programmazione — ho bisogno di guida passo per passo.
Voglio imparare capendo cosa si sta facendo, non solo copiando codice.

## Come lavoro con Claude
- Claude fa il massimo del lavoro, mi spiega tutto, mi fa il minimo di domande
- Output sempre come file completo da sostituire direttamente, mai patch parziali
- Spiegare sempre il perché delle scelte architetturali, non ogni riga di codice
- Progetto gira su Windows (cmd)
- Mix libero italiano/inglese

## Cos'è PT Studio
App web per personal trainer per gestire esercizi, schede clienti e appuntamenti.
Obiettivo attuale: validare l'idea con una demo da mostrare a PT reali nella zona Milano/Monza.

## Stack tecnico (fisso)
- React + Vite (localhost:5173 o :5174)
- jsPDF per export PDF (già installato)
- Vercel per hosting — https://pt-studio-demo.vercel.app (o simile)
- GitHub: https://github.com/ramabillot/pt-studio-demo
- Tutto in un file solo: src/App.jsx — zero dipendenze extra oltre jsPDF

## Preferenze di design (fisse)
- Dark elegante — riferimento Whoop, Linear, MyFitnessPal Pro
- NON stile gaming, NON corporate generico
- Font: Bebas Neue (titoli) + DM Sans (testo)
- Colori categoria: Braccia #e8ff47, Spalle #47ffe8, Schiena #ff9f47, Gambe #ff47a3

## Stato attuale della demo (aggiornato)
La demo è live su Vercel. Funzionalità implementate:

**Login simulato** (niente backend reale)
- Credenziali: demo/demo (trainer), admin/admin (admin)
- Animazione geometrica minimalista nel login
- Transizione con omino SVG animato che solleva pesi

**Sezioni trainer:**
- Dashboard con stat card e navigazione rapida
- Libreria 20 esercizi (4 categorie) con ricerca, filtri, thumbnail, modal video YouTube
- Builder scheda con giorni configurabili (1-7, lettere A-G), profilo cliente, riepilogo
- Export PDF con jsPDF: copertina, immagini con clipping nativo PDF, note per il trainer
- Sezione Clienti con lista, avatar, form aggiunta cliente, dettaglio schede
- Calendario con appuntamenti colorati per tipo, form aggiunta

**Sezioni admin (separate dal trainer):**
- Dashboard admin con stat card diverse
- Statistiche: 3 grafici SVG puri (line + bar chart)
- I miei PT: top esercizi, feed attività, tabella PT con nomi visibili
- Calendario admin: appuntamenti con i PT (Riunione, Call, Visita, Onboarding)

**Immagini esercizi**
- Cartella: public/exercises-custom/{slug}.jpg
- Mappa slug in EX_IMAGES[] nell'App.jsx
- Fallback emoji 💪 se immagine mancante

## Decisioni già prese (non riaprire)
- Specializzazione per nicchia: beauty/parrucchieri + personal trainer
- Niente LinkedIn, niente video con la faccia
- Go-to-market: free trial 2 settimane poi abbonamento mensile
- Login simulato nel frontend, niente backend ancora
- Un file solo App.jsx per tutta la demo

## Prossimi step possibili
- Migliorare le immagini degli esercizi
- Aggiungere Google Analytics per tracciare chi usa la demo
- Aggiungere schermata login simulato per white-label (ogni PT vede il suo logo)
- Quando arriva il primo cliente pagante: valutare backend reale con Supabase
