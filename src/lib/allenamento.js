// ── Logica della registrazione allenamento (pura, senza React) ────────────────
// Ogni sessione salvata ha una riga per serie: { esercizio_id, nome_esercizio,
// serie_numero, reps, peso, nota }. Qui la trasformiamo in strutture comode.
import { parseNum } from "../utils.js";
import { t, fmtNum, sepDecimale } from "../i18n/index.js";

// "8-10" → 8 · "12" → 12 · "30s" / "" → null
export function repsPrevisti(reps) {
  const m = String(reps ?? "").match(/^\s*(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

// Raggruppa le righe di una sessione per esercizio.
// → { [chiave]: { nome, esercizioId, serie:[{peso,reps}], nota } } con chiave = nome esercizio
export function serieDiSessione(sessione) {
  const out = {};
  [...(sessione?.sessione_serie || [])]
    .sort((a, b) => (a.serie_numero || 0) - (b.serie_numero || 0))
    .forEach(r => {
      const k = r.nome_esercizio;
      if (!k) return;
      const e = out[k] || (out[k] = { nome: k, esercizioId: r.esercizio_id || null, serie: [], nota: "" });
      e.serie.push({ peso: r.peso != null ? +r.peso : null, reps: r.reps != null ? +r.reps : null, durata_sec: r.durata_sec ?? null, velocita: r.velocita ?? null, inclinazione: r.inclinazione ?? null, livello: r.livello ?? null });
      if (r.nota) e.nota = r.nota;
    });
  return out;
}

const perSerie = (a, b) => (a.serie_numero || 0) - (b.serie_numero || 0);

// Righe di un esercizio della scheda in una sessione (per id della scheda o, se la riga non ha id, per nome).
// perNome = true → se per id non c'è niente, cerca anche per nome tra le righe con un id diverso
// (sessioni di una scheda vecchia o di un esercizio tolto e rimesso): stesso nome = stesso esercizio,
// come nei grafici. Se più esercizi con quel nome, si prende il primo. Solo per "ultima volta":
// per la sessione del giorno aperto resta il collegamento stretto (niente righe prese da un altro esercizio).
export function righeEsercizio(sessione, ex, perNome = false) {
  const tutte = sessione?.sessione_serie || [];
  const rows = tutte.filter(r =>
    r.esercizio_id ? r.esercizio_id === ex.exDbId : r.nome_esercizio === ex.name
  );
  if (rows.length || !perNome) return rows.sort(perSerie);
  const stessoNome = tutte.filter(r => r.esercizio_id && r.nome_esercizio === ex.name);
  if (!stessoNome.length) return [];
  const primo = stessoNome[0].esercizio_id;
  return stessoNome.filter(r => r.esercizio_id === primo).sort(perSerie);
}

// Righe di una sessione salvata che non appartengono a nessuno degli esercizi indicati
// (es. esercizio tolto o spostato dal PT dopo il salvataggio): vanno conservate se si risalva.
export function righeOrfane(sessione, esercizi) {
  const prese = new Set();
  (esercizi || []).forEach(ex => righeEsercizio(sessione, ex).forEach(r => prese.add(r)));
  return (sessione?.sessione_serie || []).filter(r => !prese.has(r)).sort(perSerie);
}

// Ultima volta che l'esercizio è stato fatto PRIMA di una certa data → { data, serie:[{peso,reps}], nota } | null
export function ultimaVolta(sessioni, ex, primaDi) {
  const prec = (sessioni || [])
    .filter(s => s.data < primaDi)
    .sort((a, b) => b.data.localeCompare(a.data));
  for (const s of prec) {
    const rows = righeEsercizio(s, ex, true);
    if (rows.length) {
      return {
        data: s.data,
        serie: rows.map(r => ({ peso: r.peso != null ? +r.peso : null, reps: r.reps != null ? +r.reps : null,
          durata_sec: r.durata_sec ?? null, velocita: r.velocita ?? null, inclinazione: r.inclinazione ?? null, livello: r.livello ?? null })),
        nota: rows.find(r => r.nota)?.nota || "",
      };
    }
  }
  return null;
}

const fmtKg = n => fmtNum(n);

// "62,5 kg × 8" se tutte le serie uguali, altrimenti "60×8 · 62,5×6 · 62,5×5"
export function riassuntoSerie(serie) {
  const valide = (serie || []).filter(s => s.peso != null || s.reps != null);
  if (!valide.length) return t("allenamento.corpoLibero");
  const uguali = valide.every(s => s.peso === valide[0].peso && s.reps === valide[0].reps);
  const una = s => s.peso != null ? `${fmtKg(s.peso)}${s.reps != null ? `×${s.reps}` : ""}` : `${s.reps ?? "?"} ${t("allenamento.rip")}`;
  const stessoPeso = valide.every(s => s.peso === valide[0].peso);
  if (!uguali && stessoPeso && valide[0].peso != null) {
    return `${fmtKg(valide[0].peso)} kg × ${valide.map(s => s.reps ?? "?").join(" · ")}`;
  }
  if (uguali) {
    const s = valide[0];
    const base = s.peso != null ? `${fmtKg(s.peso)} kg` : t("allenamento.corpoLibero");
    return s.reps != null ? `${base} × ${s.reps}` : base;
  }
  return valide.map(una).join(" · ");
}

// Carichi del piano del PT per serie (kg o null): carichi per serie se ci sono, altrimenti il carico iniziale.
export function caricoPiano(ex) {
  if (Array.isArray(ex.carichi) && ex.carichi.some(k => k != null)) return ex.carichi.map(k => (k == null ? null : Number(k)));
  return ex.pesoIniziale != null && ex.pesoIniziale !== "" ? [Number(ex.pesoIniziale)] : [];
}

// "Consiglia questi pesi": vale finché l'atleta non si allena di nuovo su quell'esercizio dopo il consiglio
export function consiglioAttivo(ex, ultima) {
  return !!ex.propostiIl && caricoPiano(ex).length > 0 && (!ultima || ultima.data < ex.propostiIl);
}

// Ripetizioni "strane" (B4: Willy 54 invece di 15, probabilmente il peso nel campo sbagliato).
// All'atleta si avvisa solo se sono più di 3 volte le previste e più di 20 (non disturba chi fa 12 invece di 10).
export function ripetizioniStrane(reps, previste) {
  const r = parseInt(reps, 10), p = repsPrevisti(previste);
  return p != null && Number.isFinite(r) && r > 3 * p && r > 20;
}
// Per il PT (Home, "Da controllare") la soglia è più bassa: almeno il doppio delle previste.
export function ripetizioniFuoriScala(reps, previste) {
  const r = parseInt(reps, 10), p = repsPrevisti(previste);
  return p != null && p > 0 && Number.isFinite(r) && r >= 2 * p;
}

// ── Cardio (tapis roulant, bici…) ─────────────────────────────────────────────
// Valori di una riga salvata. Righe vecchie (prima della migration 023): la durata stava nelle
// ripetizioni in secondi ("Cinta 1 × 900") → 15 min.
export function valoriCardio(r) {
  if (!r) return null;
  const sec = r.durata_sec ?? (r.reps != null && r.reps >= 60 ? r.reps : null);
  return { durata: sec != null ? Math.round(sec / 6) / 10 : null, velocita: r.velocita ?? null, inclinazione: r.inclinazione ?? null, livello: r.livello ?? null };
}
// "15 min · 4,5 km/h · 10 % · liv. 6"
export function riassuntoCardio(v) {
  if (!v) return "—";
  return [v.durata != null && v.durata !== "" ? `${fmtNum(v.durata)} min` : null,
    v.velocita != null && v.velocita !== "" ? `${fmtNum(parseNum(String(v.velocita)))} km/h` : null,
    v.inclinazione != null && v.inclinazione !== "" ? `${fmtNum(parseNum(String(v.inclinazione)))} %` : null,
    v.livello != null && v.livello !== "" ? `${t("card.liv")} ${v.livello}` : null].filter(Boolean).join(" · ") || "—";
}
const testoNum = v => (v == null || v === "" ? "" : String(v).replace(".", sepDecimale()));

function statoCardio(ex, salvate, ultima) {
  const da = salvate.length ? valoriCardio(salvate[0]) : ultima?.serie?.length ? valoriCardio(ultima.serie[0]) : null;
  const piano = { durata: ex.durataMin, velocita: ex.velocita, inclinazione: ex.inclinazione, livello: ex.livello };
  const v = k => testoNum(da?.[k] ?? piano[k]);
  return { modo: "cardio", durata: v("durata"), velocita: v("velocita"), inclinazione: v("inclinazione"), livello: v("livello"),
    nota: salvate.length ? (salvate.find(r => r.nota)?.nota || "") : "", salta: false, fatto: salvate.length > 0 };
}

// Stato iniziale della card di un esercizio.
// salvate = righe già salvate per questa data (o []), ultima = ultimaVolta(...)
export function statoIniziale(ex, salvate, ultima) {
  if (ex.tipo === "cardio") return statoCardio(ex, salvate, ultima);
  const nSerie = ex.sets || 3;
  const previsti = repsPrevisti(ex.reps);
  const daRighe = rows => Array.from({ length: nSerie }, (_, i) => {
    const r = rows[i] || rows[rows.length - 1] || {};
    return { peso: r.peso != null ? String(r.peso).replace(".", sepDecimale()) : "", reps: r.reps != null ? String(r.reps) : (previsti != null ? String(previsti) : "") };
  });
  // Sessione già salvata → valori salvati. Altrimenti: pesi dell'ultima volta, ripetizioni previste dalla scheda.
  // Primo allenamento (nessuna ultima volta): carico consigliato dal PT (B4), prima i pesi restavano vuoti.
  // Il PT ha consigliato dei pesi dopo l'ultima volta → si parte dai suoi.
  const sorgente = salvate.length
    ? salvate
    : consiglioAttivo(ex, ultima)
      ? caricoPiano(ex).map(kg => ({ peso: kg, reps: previsti }))
    : ultima?.serie?.length
      ? ultima.serie.map(r => ({ peso: r.peso, reps: previsti ?? r.reps }))
      : caricoPiano(ex).map(kg => ({ peso: kg, reps: previsti }));
  const serie = sorgente.length ? daRighe(sorgente) : daRighe([{ peso: null, reps: previsti }]);
  const tutteUguali = serie.every(s => s.peso === serie[0].peso && s.reps === serie[0].reps);
  return {
    modo: tutteUguali ? "fisso" : "serie",
    peso: serie[0].peso,
    reps: serie[0].reps,
    serie,
    nota: salvate.length ? (salvate.find(r => r.nota)?.nota || "") : "",
    salta: false,
    fatto: salvate.length > 0,   // già nella sessione salvata = fatto
    // sessione salvata con meno serie di quelle in scheda (es. 3 su 4): si risalva con 3, non 4
    ...(salvate.length > 0 && salvate.length < nSerie ? { serieSalvate: salvate.length, serieFatte: salvate.length } : {}),
  };
}

// Righe da inviare al salvataggio per una card
export function righeDaStato(ex, st) {
  if (st.salta) return [];
  if (st.modo === "cardio") {
    const durata = parseNum(st.durata);
    return [{ scheda_esercizio_id: ex.exDbId, nome_esercizio: ex.name, serie_numero: 1, reps: null, peso: null,
      durata_sec: durata != null && durata > 0 ? Math.round(durata * 60) : null,
      velocita: parseNum(st.velocita), inclinazione: parseNum(st.inclinazione),
      livello: parseNum(st.livello) != null ? Math.round(parseNum(st.livello)) : null }];
  }
  const nSerie = ex.sets || 3;
  const tutte = st.modo === "fisso"
    ? Array.from({ length: nSerie }, () => ({ peso: st.peso, reps: st.reps }))
    : st.serie;
  // serie davvero fatte (scelto dall'atleta quando il contatore era sotto il totale)
  const serie = st.serieSalvate > 0 && st.serieSalvate < tutte.length ? tutte.slice(0, st.serieSalvate) : tutte;
  return serie.map((s, i) => {
    const peso = parseNum(s.peso);
    const reps = parseInt(s.reps, 10);
    return {
      scheda_esercizio_id: ex.exDbId,
      nome_esercizio: ex.name,
      serie_numero: i + 1,
      reps: Number.isFinite(reps) && reps > 0 ? reps : null,
      peso: peso != null && peso > 0 ? peso : null,
    };
  });
}

// ── Metriche per i grafici ────────────────────────────────────────────────────
export const METRICHE = {
  max:    { label: "allenamento.pesoMassimo", unita: "kg", calcola: serie => { const v = serie.map(s => s.peso).filter(p => p > 0); return v.length ? Math.max(...v) : null; } },
  volume: { label: "allenamento.volume",       unita: "kg", calcola: serie => { const v = serie.filter(s => s.peso > 0 && s.reps > 0); return v.length ? Math.round(v.reduce((t, s) => t + s.peso * s.reps, 0)) : null; } },
};

// Riepilogo testuale di una sessione (storico del PT): [{nome, testo, nota}]
export function righeRiepilogo(sessione) {
  return Object.values(serieDiSessione(sessione)).map(e => ({ nome: e.nome, nota: e.nota,
    testo: e.serie[0]?.durata_sec != null ? riassuntoCardio(valoriCardio(e.serie[0])) : riassuntoSerie(e.serie) }));
}

// ── Costanza a settimane (barra in alto dell'atleta) ─────────────────────────
// Settimana = lunedì → domenica. Obiettivo = numero di giorni della scheda.
// "Di fila" = settimane consecutive con l'obiettivo raggiunto: le settimane chiuse a ritroso
// dalla scorsa, più quella in corso solo se è già raggiunto (così il lunedì la serie non va a 0).
// Più allenamenti nello stesso giorno contano una volta sola.
const giornoISO = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export function lunediDi(dataStr) {
  const d = new Date(dataStr + "T12:00");
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return giornoISO(d);
}
export function costanzaSettimanale(sessioni, obiettivo, oggiStr) {
  const ob = Math.max(1, obiettivo || 1);
  const perSettimana = {};
  new Set((sessioni || []).map(s => s.data).filter(d => d && d <= oggiStr))
    .forEach(d => { const w = lunediDi(d); perSettimana[w] = (perSettimana[w] || 0) + 1; });
  const questa = lunediDi(oggiStr);
  const fatti = perSettimana[questa] || 0;
  let diFila = 0;
  const w = new Date(questa + "T12:00");
  for (;;) {
    w.setDate(w.getDate() - 7);
    if ((perSettimana[giornoISO(w)] || 0) >= ob) diFila++; else break;
  }
  if (fatti >= ob) diFila++;
  return { fatti, obiettivo: ob, diFila };
}

// ── Etichette brevi dei giorni per il calendario ─────────────────────────────
// Nella cella c'è poco posto: se i nomi dei giorni iniziano con le stesse parole
// ("Full Body A" / "Full Body B", "Día 1" / "Día 2") si mostra solo la parte che cambia ("A", "B").
// nomi: { chiave: nome a schermo } → { chiave: etichetta breve }. Nomi diversi o un giorno solo → invariati.
export function etichetteBrevi(nomi) {
  const chiavi = Object.keys(nomi || {});
  if (chiavi.length < 2) return { ...nomi };
  const parole = chiavi.map(k => String(nomi[k] || "").trim().split(/\s+/));
  let comuni = 0;
  while (parole.every(p => p.length > comuni + 1 && p[comuni].toLowerCase() === parole[0][comuni].toLowerCase())) comuni++;
  return Object.fromEntries(chiavi.map((k, i) => [k, comuni ? parole[i].slice(comuni).join(" ") : nomi[k]]));
}
