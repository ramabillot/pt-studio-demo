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
      e.serie.push({ peso: r.peso != null ? +r.peso : null, reps: r.reps != null ? +r.reps : null });
      if (r.nota) e.nota = r.nota;
    });
  return out;
}

// Righe di un esercizio della scheda in una sessione (per id della scheda o, in mancanza, per nome)
export function righeEsercizio(sessione, ex) {
  const rows = (sessione?.sessione_serie || []).filter(r =>
    r.esercizio_id ? r.esercizio_id === ex.exDbId : r.nome_esercizio === ex.name
  );
  return rows.sort((a, b) => (a.serie_numero || 0) - (b.serie_numero || 0));
}

// Ultima volta che l'esercizio è stato fatto PRIMA di una certa data → { data, serie:[{peso,reps}], nota } | null
export function ultimaVolta(sessioni, ex, primaDi) {
  const prec = (sessioni || [])
    .filter(s => s.data < primaDi)
    .sort((a, b) => b.data.localeCompare(a.data));
  for (const s of prec) {
    const rows = righeEsercizio(s, ex);
    if (rows.length) {
      return {
        data: s.data,
        serie: rows.map(r => ({ peso: r.peso != null ? +r.peso : null, reps: r.reps != null ? +r.reps : null })),
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

// Stato iniziale della card di un esercizio.
// salvate = righe già salvate per questa data (o []), ultima = ultimaVolta(...)
export function statoIniziale(ex, salvate, ultima) {
  const nSerie = ex.sets || 3;
  const previsti = repsPrevisti(ex.reps);
  const daRighe = rows => Array.from({ length: nSerie }, (_, i) => {
    const r = rows[i] || rows[rows.length - 1] || {};
    return { peso: r.peso != null ? String(r.peso).replace(".", sepDecimale()) : "", reps: r.reps != null ? String(r.reps) : (previsti != null ? String(previsti) : "") };
  });
  // Sessione già salvata → valori salvati. Altrimenti: pesi dell'ultima volta, ripetizioni previste dalla scheda.
  const sorgente = salvate.length
    ? salvate
    : (ultima?.serie || []).map(r => ({ peso: r.peso, reps: previsti ?? r.reps }));
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
  };
}

// Righe da inviare al salvataggio per una card
export function righeDaStato(ex, st) {
  if (st.salta) return [];
  const nSerie = ex.sets || 3;
  const serie = st.modo === "fisso"
    ? Array.from({ length: nSerie }, () => ({ peso: st.peso, reps: st.reps }))
    : st.serie;
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
  return Object.values(serieDiSessione(sessione)).map(e => ({ nome: e.nome, testo: riassuntoSerie(e.serie), nota: e.nota }));
}
