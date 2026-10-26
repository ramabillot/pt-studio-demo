// ── Lato PT: come vanno gli atleti (Home, lista atleti, dettaglio) — puro, senza React ──
// Settimana lun→dom come costanzaSettimanale(). Obiettivo = numero di giorni visibili della scheda.
import { costanzaSettimanale, lunediDi, ripetizioniFuoriScala, repsPrevisti } from "./allenamento.js";

export const FERMO_DOPO_GIORNI = 7;   // nessun allenamento da 7+ giorni = "fermo"

const giorni = (da, a) => Math.round((new Date(a + "T12:00") - new Date(da + "T12:00")) / 86400000);
const piuGiorni = (d, n) => { const x = new Date(d + "T12:00"); x.setDate(x.getDate() + n); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };

// Obiettivo settimanale dalla scheda (giorni visibili); senza scheda = 0
export const obiettivoScheda = scheda => (scheda?.scheda_giorni || []).filter(g => !g.nascosto_at).length;

// → { ultimo:{data,giornoId}|null, giorniDa, sett:{fatti,ob}, scorsa:{fatti,ob}, diFila, stato, settimane:[{lunedi,fatti,ob,inCorso}] }
// stato: "fermo" (7+ giorni o mai) · "sotto" (settimana scorsa sotto l'obiettivo) · "ok" · "senzaScheda"
export function statoAtleta(sessioni, obiettivo, oggi, nSettimane = 5) {
  const ss = [...(sessioni || [])].filter(s => s.data <= oggi).sort((a, b) => b.data.localeCompare(a.data));
  const ultimo = ss[0] ? { data: ss[0].data, giornoId: ss[0].giorno_id } : null;
  const ob = Math.max(0, obiettivo || 0);
  const c = costanzaSettimanale(ss, ob || 1, oggi);
  const lunedi = lunediDi(oggi);
  const conta = lun => new Set(ss.filter(s => lunediDi(s.data) === lun).map(s => s.data)).size;
  const settimane = Array.from({ length: nSettimane }, (_, i) => {
    const lun = piuGiorni(lunedi, -7 * (nSettimane - 1 - i));
    return { lunedi: lun, fatti: conta(lun), ob, inCorso: lun === lunedi };
  });
  const scorsa = { fatti: conta(piuGiorni(lunedi, -7)), ob };
  const giorniDa = ultimo ? giorni(ultimo.data, oggi) : null;
  const stato = !ob ? "senzaScheda" : (!ultimo || giorniDa >= FERMO_DOPO_GIORNI) ? "fermo" : scorsa.fatti < ob ? "sotto" : "ok";
  return { ultimo, giorniDa, sett: { fatti: c.fatti, ob }, scorsa, diFila: ob ? c.diFila : 0, stato, settimane };
}
export const ORDINE_STATO = { fermo: 0, sotto: 1, ok: 2, senzaScheda: 3 };

// Esercizi della scheda per giorno: { giornoId: [{id,nome,serie,reps,tipo,alias}] }
export function eserciziPerGiorno(schede) {
  const out = {};
  (schede || []).forEach(s => (s.scheda_giorni || []).forEach(g => {
    out[g.id] = (g.scheda_esercizi || []).slice().sort((a, b) => a.ordine - b.ordine)
      .map(e => ({ id: e.id, nome: e.nome, serie: e.serie || 1, reps: e.reps, tipo: e.tipo, alias: e.nome_atleta || "" }));
  }));
  return out;
}

// Una sessione confrontata con il suo giorno di scheda: esercizi/serie fatti, saltati, ripetizioni fuori scala.
// (Confronto con la scheda di oggi: se il PT l'ha cambiata dopo, i numeri sono indicativi.)
export function riepilogoSessione(sessione, esGiorno) {
  const righe = sessione.sessione_serie || [];
  const fatto = e => righe.some(r => (r.esercizio_id && r.esercizio_id === e.id) || (!r.esercizio_id && r.nome_esercizio === e.nome) || r.nome_esercizio === e.nome);
  const es = esGiorno || [];
  const fatti = es.filter(fatto), saltati = es.filter(e => !fatto(e));
  const serieFatte = es.reduce((s, e) => s + righe.filter(r => r.esercizio_id === e.id || (!r.esercizio_id && r.nome_esercizio === e.nome)).length, 0);
  const seriePrev = es.reduce((s, e) => s + (e.serie || 1), 0);
  const strani = [];
  es.forEach(e => {
    if (e.tipo === "cardio") return;
    const mie = righe.filter(r => r.esercizio_id === e.id || (!r.esercizio_id && r.nome_esercizio === e.nome));
    const max = Math.max(0, ...mie.map(r => r.reps || 0));
    if (max && ripetizioniFuoriScala(max, e.reps)) strani.push({ nome: e.alias || e.nome, nomeTecnico: e.nome, reps: max, previste: repsPrevisti(e.reps) });
  });
  const note = righe.filter(r => r.nota).map(r => ({ nome: es.find(e => e.id === r.esercizio_id)?.alias || r.nome_esercizio, nomeTecnico: r.nome_esercizio, nota: r.nota }));
  if (sessione.note) note.push({ nome: null, nota: sessione.note });
  return { esFatti: fatti.length, esPrev: es.length, serieFatte, seriePrev, saltati: saltati.map(e => e.alias || e.nome), note, strani };
}

// Feed della Home: note, saltati e valori fuori scala negli ultimi N giorni, più nuovi sopra
export function eventiRecenti(sessioni, esPerGiorno, oggi, { giorniNote = 7, giorniSaltati = 14 } = {}) {
  const note = [], saltati = [], strani = [];
  [...(sessioni || [])].sort((a, b) => b.data.localeCompare(a.data)).forEach(s => {
    const da = giorni(s.data, oggi); if (da < 0) return;
    const r = riepilogoSessione(s, esPerGiorno[s.giorno_id]);
    if (da <= giorniNote) r.note.forEach(n => note.push({ atletaId: s.atleta_id, data: s.data, ...n }));
    if (da <= giorniSaltati) {
      r.saltati.forEach(nome => saltati.push({ atletaId: s.atleta_id, data: s.data, nome }));
      r.strani.forEach(x => strani.push({ atletaId: s.atleta_id, data: s.data, ...x }));
    }
  });
  return { note, saltati, strani };
}
