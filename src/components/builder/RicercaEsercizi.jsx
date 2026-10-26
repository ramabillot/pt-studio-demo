// ── Builder: ricerca esercizi (catalogo + esercizi del PT) con "+ crea esercizio" ──
// Cerca nel nome nella lingua scelta, nel nome italiano e nei muscoli. Un elemento si aggiunge
// con ＋ (al giorno attivo) o trascinandolo su un giorno (PC). Nessun risultato → crea al volo.
import { useState } from "react";
import { EXERCISES, CATEGORIES, CAT_COLORS } from "../../data.js";
import { useTranslation } from "react-i18next";
import { nomeEsercizio, muscoliEsercizio, valore } from "../../i18n/index.js";

const norm = s => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function elencoEsercizi(custom, q, cat) {
  const qq = norm(q.trim());
  const miei = custom.map(c => ({ chiave: `c:${c.id}`, id: null, nome: c.nome, cat: c.categoria, mus: c.descrizione || "", mio: true }));
  const cat82 = EXERCISES.map(e => ({ chiave: String(e.id), id: e.id, name: e.name, nome: e.name, cat: e.cat, mus: e.muscles || "" }));
  return [...miei, ...cat82].filter(e => (cat === "Tutte" || e.cat === cat) &&
    (!qq || [e.nome, e.id ? nomeEsercizio(e.nome, e.id) : "", e.mus, e.id ? muscoliEsercizio(EXERCISES.find(x => x.id === e.id)) : ""].some(s => norm(s).includes(qq))));
}

export default function RicercaEsercizi({ custom, onAggiungi, onCrea, onDragStart, sostituisci, onChiudi }) {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Tutte");
  const [creaCat, setCreaCat] = useState("");
  const [creando, setCreando] = useState(false);
  const lista = elencoEsercizi(custom, q, cat);
  const visibili = lista.slice(0, 80);
  const esatto = lista.some(e => norm(e.id ? nomeEsercizio(e.nome, e.id) : e.nome) === norm(q.trim()) || norm(e.nome) === norm(q.trim()));

  const crea = async () => {
    if (!q.trim() || !creaCat) return;
    setCreando(true);
    try { await onCrea(q.trim(), creaCat); setQ(""); setCreaCat(""); } finally { setCreando(false); }
  };

  return (
    <div className="b2-ricerca">
      {(sostituisci || onChiudi) && (
        <div className="b2-ricerca-testa">
          <span>{sostituisci ? t("builder2.sceltaSostituisci") : t("builder2.aggiungiEsercizio")}</span>
          {onChiudi && <button type="button" className="b2-x" onClick={onChiudi} aria-label={t("comune.chiudi")}>✕</button>}
        </div>
      )}
      <input id="b2-cerca" className="field-input b2-cerca" type="search" placeholder={t("builder2.cercaEsercizio")} value={q}
        onChange={e => setQ(e.target.value)} autoComplete="off" aria-label={t("builder2.cercaEsercizio")}/>
      <div className="b2-cat">
        {CATEGORIES.map(c => (
          <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)}>{valore("categoria", c)}</button>
        ))}
      </div>
      <div className="b2-suggerimento">{t("builder2.trascinaOPremi")}</div>
      <div className="b2-lista">
        {visibili.map(e => {
          const nome = e.id ? nomeEsercizio(e.nome, e.id) : e.nome;
          return (
            <div key={e.chiave} className="b2-lib" draggable={!!onDragStart}
              onDragStart={ev => onDragStart && onDragStart(ev, e)}>
              <span className="b2-pallino" style={{ background: CAT_COLORS[e.cat] || "var(--muted)" }}/>
              <span className="b2-lib-nome">
                {nome}{e.mio && <span className="b2-mio">{t("builder2.mio")}</span>}
                <small>{e.mio ? valore("categoria", e.cat) : (muscoliEsercizio(EXERCISES.find(x => x.id === e.id)) || "").split(",")[0]}</small>
              </span>
              <button type="button" className="b2-piu" onClick={() => onAggiungi(e)} aria-label={`${sostituisci ? t("builder2.usaQuesto") : t("builder2.aggiungi")}: ${nome}`}>
                {sostituisci ? "⇄" : "＋"}
              </button>
            </div>
          );
        })}
        {!visibili.length && <div className="b2-vuoto">{t("builder2.nessunEsercizio")}</div>}
      </div>
      {q.trim() && !esatto && (
        <div className="b2-crea">
          <b>{t("builder2.creaEsercizio", { nome: q.trim() })}</b>
          <div className="b2-crea-riga">
            <select className="field-select" value={creaCat} onChange={e => setCreaCat(e.target.value)} aria-label={t("comune.categoria")}>
              <option value="">{t("comune.categoria")}…</option>
              {CATEGORIES.slice(1).map(c => <option key={c} value={c}>{valore("categoria", c)}</option>)}
            </select>
            <button type="button" className="btn-primary" disabled={!creaCat || creando} onClick={crea}>
              {creando ? t("comune.salvataggio") : t("builder2.creaEAggiungi")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
