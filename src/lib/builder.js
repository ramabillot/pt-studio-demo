// ── Builder 2.0: modello della scheda e piano di salvataggio (puro, senza React) ──
// Il Builder lavora su un modello semplice:
//   { schedaId, obiettivo, livello, giorni:[{ key, nome, dbId, nascosto, righe:[riga] }] }
//   riga = { uid, dbId, id, nome, alias, sets, reps, rest, pesoIniziale, carichi, propostiIl,
//            nota, tipo, durata, velocita, inclinazione, livello }
// Salvare = confrontare il modello con quello che c'è nel DB e fare solo update/insert;
// i giorni non si cancellano mai (si nascondono: B7), gli esercizi tolti sì
// (le serie salvate restano, collegate per nome).
import { EXERCISES, ALL_DAYS } from "../data.js";
import { parseNum } from "../utils.js";

let contatore = 0;
export const nuovoUid = () => `r${Date.now().toString(36)}${(++contatore).toString(36)}`;

const numOVuoto = v => (v === null || v === undefined || v === "" ? "" : String(v).replace(".", ","));
const numDB = v => { const n = parseNum(String(v ?? "")); return n == null ? null : n; };

// ── DB → modello ──────────────────────────────────────────────────────────────
export function rigaDaDB(e) {
  const carichi = Array.isArray(e.carichi_serie) && e.carichi_serie.length
    ? e.carichi_serie.map(c => numOVuoto(c?.kg)) : null;
  return {
    uid: nuovoUid(), dbId: e.id,
    id: e.esercizio_id_int || null,
    nome: e.nome || EXERCISES.find(x => x.id === e.esercizio_id_int)?.name || "",
    alias: e.nome_atleta || "",
    sets: e.serie || 3,
    reps: e.reps || "10",
    rest: e.rest_sec ?? 90,
    pesoIniziale: numOVuoto(e.peso_iniziale),
    carichi,
    propostiIl: e.carichi_proposti_il || null,
    nota: e.note || "",
    tipo: e.tipo === "cardio" ? "cardio" : "forza",
    durata: numOVuoto(e.durata_min ?? (e.tipo === "cardio" ? secondiDaReps(e.reps) / 60 || "" : "")),
    velocita: numOVuoto(e.velocita),
    inclinazione: numOVuoto(e.inclinazione),
    livello: numOVuoto(e.livello),
  };
}
const secondiDaReps = reps => { const m = String(reps || "").match(/^\s*(\d+)\s*s\s*$/i); return m ? +m[1] : 0; };

export function modelloDaDB(scheda) {
  if (!scheda) return { schedaId: null, obiettivo: "", livello: "", giorni: [] };
  const giorni = [...(scheda.scheda_giorni || [])]
    .sort((a, b) => a.ordine - b.ordine)
    .map((g, i) => ({
      key: g.giorno_key || ALL_DAYS[i] || `G${i}`,
      nome: g.nome || "",
      dbId: g.id,
      nascosto: !!g.nascosto_at,
      righe: [...(g.scheda_esercizi || [])].sort((a, b) => a.ordine - b.ordine).map(rigaDaDB),
    }));
  return { schedaId: scheda.id, obiettivo: scheda.obiettivo || "", livello: scheda.livello || "", giorni };
}

// Scheda vuota con n giorni (A, B, C…)
export function modelloVuoto(n = 3) {
  return { schedaId: null, obiettivo: "", livello: "", giorni: ALL_DAYS.slice(0, n).map(key => ({ key, nome: "", dbId: null, nascosto: false, righe: [] })) };
}

// Riga nuova da un esercizio del catalogo ({id,name,cat}) o libero/custom ({nome,cat})
export function nuovaRiga(ex) {
  return {
    uid: nuovoUid(), dbId: null, id: ex.id || null, nome: ex.name || ex.nome || "",
    alias: "", sets: 3, reps: "10", rest: 90, pesoIniziale: "", carichi: null, propostiIl: null, nota: "",
    tipo: "forza", durata: "", velocita: "", inclinazione: "", livello: "",
  };
}

// ── modello → righe del DB ────────────────────────────────────────────────────
export function rigaVersoDB(r, giornoId, ordine, ptId) {
  const cardio = r.tipo === "cardio";
  const durata = numDB(r.durata);
  const carichi = !cardio && r.carichi ? r.carichi.slice(0, Math.max(1, +r.sets || 1)).map(k => ({ kg: numDB(k) })) : null;
  const primo = carichi ? carichi[0]?.kg : numDB(r.pesoIniziale);
  return {
    giorno_id: giornoId,
    pt_id: ptId,
    nome: r.nome,
    esercizio_id_int: r.id || null,
    nome_atleta: (r.alias || "").trim() || null,
    serie: cardio ? 1 : Math.max(1, parseInt(r.sets, 10) || 1),
    // cardio: anche "900s" nelle ripetizioni, così le app non ancora aggiornate mostrano il ▶ col tempo giusto
    reps: cardio ? (durata ? `${Math.round(durata * 60)}s` : "") : String(r.reps || "10"),
    rest_sec: Math.max(0, parseInt(r.rest, 10) || 0),
    peso_iniziale: cardio ? null : (primo ?? null),
    carichi_serie: carichi,
    carichi_proposti_il: cardio ? null : (r.propostiIl || null),
    note: (r.nota || "").trim() || null,
    tipo: cardio ? "cardio" : "forza",
    durata_min: cardio ? durata : null,
    velocita: cardio ? numDB(r.velocita) : null,
    inclinazione: cardio ? numDB(r.inclinazione) : null,
    livello: cardio ? (numDB(r.livello) != null ? Math.round(numDB(r.livello)) : null) : null,
    ordine,
  };
}

// Chiave per capire se una riga è cambiata (stessi campi che vanno nel DB)
const firma = (r) => JSON.stringify({ ...rigaVersoDB(r, "", 0, "") });

// ── Differenze tra la scheda caricata e quella nel Builder ────────────────────
// → { tolti:[nome], nuovi:[nome], cambiati:n, spostati:n, riordinati:n, giorniNascosti:[nome], giorniNuovi:[nome], giorniRimessi:[nome], totale }
export function differenze(orig, att) {
  const o = new Map(), a = new Map();
  (orig?.giorni || []).forEach(g => g.righe.forEach((r, i) => o.set(r.dbId, { r, g, i })));
  (att?.giorni || []).forEach(g => g.righe.forEach((r, i) => { if (r.dbId) a.set(r.dbId, { r, g, i }); }));
  const tolti = [...o.values()].filter(x => !a.has(x.r.dbId)).map(x => x.r.alias || x.r.nome);
  const nuovi = (att?.giorni || []).flatMap(g => g.righe.filter(r => !r.dbId).map(r => r.alias || r.nome));
  let cambiati = 0, spostati = 0;
  for (const [id, x] of a) {
    const y = o.get(id); if (!y) continue;
    if (y.g.key !== x.g.key) spostati++;
    else if (firma(y.r) !== firma(x.r)) cambiati++;
  }
  // ordine cambiato dentro un giorno (contando solo le righe rimaste nello stesso giorno)
  let riordinati = 0;
  (att?.giorni || []).forEach(g => {
    const prima = (orig?.giorni || []).find(x => x.key === g.key); if (!prima) return;
    const ids = new Set(g.righe.map(r => r.dbId).filter(Boolean));
    const seqPrima = prima.righe.map(r => r.dbId).filter(id => ids.has(id)).join();
    const seqOra = g.righe.map(r => r.dbId).filter(id => id && prima.righe.some(p => p.dbId === id)).join();
    if (seqPrima !== seqOra) riordinati++;
  });
  const og = new Map((orig?.giorni || []).map(g => [g.key, g]));
  const giorniNascosti = [], giorniNuovi = [], giorniRimessi = [];
  let giorniCambiati = 0;
  (att?.giorni || []).forEach(g => {
    const prima = og.get(g.key);
    if (!prima || !g.dbId) { if (!g.nascosto) giorniNuovi.push(g.nome || g.key); return; }
    if (g.nascosto && !prima.nascosto) giorniNascosti.push(g.nome || g.key);
    else if (!g.nascosto && prima.nascosto) giorniRimessi.push(g.nome || g.key);
    else if ((g.nome || "") !== (prima.nome || "")) giorniCambiati++;
  });
  const ordineGiorni = (orig?.giorni || []).map(g => g.key).join() !== (att?.giorni || []).filter(g => g.dbId).map(g => g.key).join();
  const totale = tolti.length + nuovi.length + cambiati + spostati + giorniNascosti.length + giorniNuovi.length + giorniRimessi.length + giorniCambiati
    + ((orig?.obiettivo || "") !== (att?.obiettivo || "") || (orig?.livello || "") !== (att?.livello || "") ? 1 : 0) + (ordineGiorni ? 1 : 0);
  return { tolti, nuovi, cambiati, spostati, riordinati, giorniNascosti, giorniNuovi, giorniRimessi, giorniCambiati, totale: totale + riordinati };
}

// ── Salvataggio ───────────────────────────────────────────────────────────────
// db = client Supabase. Aggiorna SUL POSTO: stessi scheda_giorni (anche se nascosti), esercizi per dbId.
// Ritorna l'id della scheda.
export async function salvaScheda(db, { modello, atleta, ptId, oggi }) {
  const ok = ({ error, data }) => { if (error) throw error; return data; };
  let sid = modello.schedaId;
  if (sid) {
    ok(await db.from("schede").update({ obiettivo: modello.obiettivo || "", livello: modello.livello || "" }).eq("id", sid));
  } else {
    sid = ok(await db.from("schede").insert({
      pt_id: ptId, atleta_id: atleta.id, nome: `${atleta.nome} ${atleta.cognome}`.trim(),
      obiettivo: modello.obiettivo || "", livello: modello.livello || "", attiva: true, assegnata_il: oggi,
    }).select().single()).id;
  }

  // Giorni: abbinati per dbId, poi per lettera; i tolti si nascondono (mai cancellati: le sessioni restano nel calendario)
  const esistenti = ok(await db.from("scheda_giorni").select("id,giorno_key,nascosto_at").eq("scheda_id", sid)) || [];
  const perKey = Object.fromEntries(esistenti.map(g => [g.giorno_key, g]));
  const idGiorno = {};
  for (const [ordine, g] of modello.giorni.entries()) {
    const ex = (g.dbId && esistenti.find(e => e.id === g.dbId)) || perKey[g.key];
    const dati = { nome: g.nome || "", ordine, nascosto_at: g.nascosto ? (ex?.nascosto_at || new Date().toISOString()) : null };
    if (ex) { ok(await db.from("scheda_giorni").update(dati).eq("id", ex.id)); idGiorno[g.key] = ex.id; }
    else if (!g.nascosto) {
      idGiorno[g.key] = ok(await db.from("scheda_giorni").insert({ scheda_id: sid, pt_id: ptId, giorno_key: g.key, ...dati }).select("id").single()).id;
    }
  }
  // Giorni nel DB che il Builder non conosce più (es. scheda copiata con meno giorni): nascosti
  const usati = new Set(Object.values(idGiorno));
  for (const g of esistenti) {
    if (!usati.has(g.id) && !g.nascosto_at) ok(await db.from("scheda_giorni").update({ nascosto_at: new Date().toISOString() }).eq("id", g.id));
  }

  // Esercizi: update per dbId (anche spostati di giorno), insert dei nuovi, poi via i tolti
  const tuttiGiorni = esistenti.map(g => g.id).concat(Object.values(idGiorno).filter(id => !esistenti.some(e => e.id === id)));
  const exEsistenti = tuttiGiorni.length ? (ok(await db.from("scheda_esercizi").select("id").in("giorno_id", tuttiGiorni)) || []) : [];
  const idsEsistenti = new Set(exEsistenti.map(e => e.id));
  const tenuti = new Set(), nuovi = [];
  for (const g of modello.giorni) {
    const gid = idGiorno[g.key]; if (!gid) continue;
    for (const [ordine, r] of g.righe.entries()) {
      const row = rigaVersoDB(r, gid, ordine, ptId);
      if (r.dbId && idsEsistenti.has(r.dbId)) { tenuti.add(r.dbId); ok(await db.from("scheda_esercizi").update(row).eq("id", r.dbId)); }
      else nuovi.push(row);
    }
  }
  if (nuovi.length) ok(await db.from("scheda_esercizi").insert(nuovi));
  const daTogliere = [...idsEsistenti].filter(id => !tenuti.has(id));
  if (daTogliere.length) ok(await db.from("scheda_esercizi").delete().in("id", daTogliere));
  return sid;
}

// ── Copia da un'altra scheda o da un modello ──────────────────────────────────
// Le righe diventano nuove (senza dbId); i giorni dell'atleta di destinazione restano gli stessi
// per lettera (stesso dbId → le sue sessioni restano collegate), quelli in più si nascondono.
export function copiaInModello(attuale, sorgente, { conCarichi = true } = {}) {
  const src = (sorgente.giorni || []).filter(g => !g.nascosto);
  const giorni = src.map((g, i) => {
    const key = ALL_DAYS[i] || g.key;
    const dest = attuale.giorni.find(d => d.key === key);
    return {
      key, nome: g.nome, dbId: dest?.dbId || null, nascosto: false,
      righe: g.righe.map(r => ({ ...r, uid: nuovoUid(), dbId: null, propostiIl: null,
        ...(conCarichi ? {} : { pesoIniziale: "", carichi: null }) })),
    };
  });
  // giorni dell'atleta che la copia non usa: restano nascosti (non cancellati)
  attuale.giorni.filter(d => d.dbId && !giorni.some(g => g.key === d.key))
    .forEach(d => giorni.push({ ...d, nascosto: true, righe: [] }));
  return { ...attuale, obiettivo: sorgente.obiettivo || attuale.obiettivo, livello: sorgente.livello || attuale.livello, giorni };
}

// Modello salvabile (tabella modelli_scheda): niente id del DB
export function payloadModello(modello, { conCarichi = false } = {}) {
  return {
    giorni: modello.giorni.filter(g => !g.nascosto).map(g => ({
      key: g.key, nome: g.nome,
      righe: g.righe.map(r => {
        const resto = { ...r };
        delete resto.uid; delete resto.dbId; delete resto.propostiIl;
        return conCarichi ? resto : { ...resto, pesoIniziale: "", carichi: null };
      }),
    })),
  };
}
export function modelloDaPayload(p, meta = {}) {
  return {
    schedaId: null, obiettivo: meta.obiettivo || "", livello: meta.livello || "",
    giorni: (p?.giorni || []).map(g => ({ key: g.key, nome: g.nome || "", dbId: null, nascosto: false,
      righe: (g.righe || []).map(r => ({ ...nuovaRiga({}), ...r, uid: nuovoUid(), dbId: null })) })),
  };
}

// Prossima lettera libera (anche i giorni nascosti la occupano)
export const prossimaLettera = giorni => ALL_DAYS.find(k => !giorni.some(g => g.key === k)) || null;

// Per il PDF: { A:[esercizi nel formato vecchio], … } + nomi, solo giorni visibili
export function perPDF(modello) {
  const giorni = {}, dayNames = {};
  modello.giorni.filter(g => !g.nascosto).forEach(g => {
    dayNames[g.key] = g.nome;
    giorni[g.key] = g.righe.map(r => {
      const ex = EXERCISES.find(e => e.id === r.id) || {};
      return { ...ex, id: r.id, name: r.nome, alias: r.alias, sets: r.tipo === "cardio" ? 1 : r.sets, reps: r.tipo === "cardio" ? `${r.durata || "?"} min` : r.reps,
        rest: Math.max(0, parseInt(r.rest, 10) || 0), cat: ex.cat || "", carichi: r.carichi, pesoIniziale: r.pesoIniziale, nota: r.nota, tipo: r.tipo,
        velocita: r.velocita, inclinazione: r.inclinazione, livello: r.livello, durataMin: r.durata || null };
    });
  });
  return { giorni, dayNames };
}
