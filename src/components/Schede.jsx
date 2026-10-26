// ── Voce di menu "Schede": Builder (schede degli atleti) · Modelli · Esercizi (ex Libreria) ──
import { useState, useEffect, lazy, Suspense } from "react";
import { supabase } from "../supabase.js";
import { useTranslation } from "react-i18next";
import Builder from "./Builder.jsx";
const Library = lazy(() => import("./Library.jsx"));

function Modelli({ user }) {
  const { t } = useTranslation();
  const [modelli, setModelli] = useState(null);
  const [togli, setTogli] = useState(null);
  const carica = () => supabase.from("modelli_scheda").select("*").is("archiviato_at", null).order("created_at", { ascending: false })
    .then(({ data, error }) => setModelli(error ? [] : (data || [])));
  useEffect(() => { carica(); }, [user?.supabaseId]);
  // "Elimina" = archiviato (i modelli non si cancellano via API)
  const elimina = async id => { await supabase.from("modelli_scheda").update({ archiviato_at: new Date().toISOString() }).eq("id", id); setTogli(null); carica(); };
  if (modelli === null) return <div className="b2-inizio">{t("comune.caricamento")}</div>;
  return (
    <div className="modelli">
      <p className="b2-aiuto">{t("schede.modelliAiuto")}</p>
      {!modelli.length && <div className="b2-inizio">{t("schede.nessunModello")}</div>}
      {modelli.map(m => {
        const giorni = m.payload?.giorni || [];
        const es = giorni.reduce((s, g) => s + (g.righe || []).length, 0);
        return (
          <div key={m.id} className="modello-riga">
            <div><b>{m.nome}</b><small>{t("schede.modelloInfo", { g: giorni.length, e: es })}</small></div>
            {togli === m.id
              ? <span className="modello-conf"><button className="btn-ghost" onClick={() => setTogli(null)}>{t("comune.annulla")}</button><button className="btn-primary b2-pericolo" onClick={() => elimina(m.id)}>{t("comune.elimina")}</button></span>
              : <button className="btn-ghost" onClick={() => setTogli(m.id)}>{t("comune.elimina")}</button>}
          </div>
        );
      })}
    </div>
  );
}

export default function Schede({ setView, preload, setPreload, user, tabIniziale = "atleti" }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState(tabIniziale);
  return (
    <div>
      <div className="schede-testa">
        <div className="page-title">{t("nav.schede")}</div>
        <div className="schede-tab" role="tablist">
          {[["atleti", "schede.tabAtleti"], ["modelli", "schede.tabModelli"], ["esercizi", "schede.tabEsercizi"]].map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{t(l)}</button>
          ))}
        </div>
      </div>
      {/* il Builder resta montato: cambiando linguetta non si perdono le modifiche */}
      <div hidden={tab !== "atleti"}><Builder preload={preload} setPreload={setPreload} user={user}/></div>
      {tab === "modelli" && <Modelli user={user}/>}
      {tab === "esercizi" && <Suspense fallback={null}><Library setView={setView} user={user} incorporata/></Suspense>}
    </div>
  );
}
