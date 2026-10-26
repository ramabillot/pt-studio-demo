// ── Home del PT = feed della settimana (pensata per il telefono, su PC due colonne) ──
// Chi è fermo (7+ giorni), chi è sotto l'obiettivo della settimana scorsa, chi è in regola;
// poi note degli atleti, esercizi saltati e ripetizioni fuori scala. Tocco su un atleta → suo dettaglio.
import { useState, useEffect } from "react";
import { supabase } from "../supabase.js";
import { fmtDate, fmtDateShort } from "../utils.js";
import { useTranslation } from "react-i18next";
import { locale, nomeEsercizio, maiuscola } from "../i18n/index.js";
import { caricaPanoramica } from "../lib/panoramica.js";
import { eventiRecenti, ORDINE_STATO, FERMO_DOPO_GIORNI } from "../lib/settimana.js";
import { lunediDi } from "../lib/allenamento.js";
import { Avatar, UltimoAllenamento } from "./pt/Pezzi.jsx";

const telWa = tel => { const t = (tel || "").replace(/[^\d+]/g, "").replace(/^00/, "+"); return t.startsWith("+") ? t.slice(1) : (t ? `39${t}` : ""); };

export default function HomePT({ user, apriAtleta }) {
  const { t } = useTranslation();
  const oggi = fmtDate(new Date());
  const [dati, setDati] = useState(null);
  const [errore, setErrore] = useState(false);
  const [copiato, setCopiato] = useState(null);

  useEffect(() => {
    let vivo = true;
    caricaPanoramica(supabase, user.supabaseId, oggi)
      .then(d => { if (vivo) setDati(d); })
      .catch(e => { console.error("[home pt]", e); if (vivo) setErrore(true); });
    return () => { vivo = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.supabaseId]);

  const lun = lunediDi(oggi);
  const dom = (() => { const d = new Date(lun + "T12:00"); d.setDate(d.getDate() + 6); return fmtDate(d); })();
  const range = `${new Date(lun + "T12:00").toLocaleDateString(locale(), { day: "numeric", month: "short" })} – ${new Date(dom + "T12:00").toLocaleDateString(locale(), { day: "numeric", month: "short" })}`;

  if (errore) return <div className="home-pt"><div className="page-title">{t("home.titolo")}</div><div className="b2-errore">{t("home.errore")}</div></div>;
  if (!dati) return <div className="home-pt"><div className="page-title">{t("home.titolo")}</div><div className="page-sub">{t("comune.caricamento")}</div></div>;

  const atleti = [...dati.atleti].sort((a, b) => ORDINE_STATO[a.stato] - ORDINE_STATO[b.stato] || (a.ultimo?.data || "").localeCompare(b.ultimo?.data || ""));
  const per = s => atleti.filter(a => a.stato === s);
  const fermi = per("fermo"), sotto = per("sotto"), ok = per("ok"), senza = per("senzaScheda");
  const conScheda = atleti.filter(a => a.stato !== "senzaScheda");
  const scorsaOk = conScheda.filter(a => a.scorsa.fatti >= a.scorsa.ob);
  const ev = eventiRecenti(dati.sessioni, dati.esPerGiorno, oggi);
  const nome = id => dati.atleti.find(a => a.id === id);
  const nomeEs = (n, tec) => n && n !== tec ? n : nomeEsercizio(tec || n);
  const data = d => d === oggi ? t("comune.oggi") : maiuscola(fmtDateShort(d));

  const messaggio = a => t("home.msgWhatsapp", { nome: a.nome, n: a.giorniDa ?? FERMO_DOPO_GIORNI });
  const scrivi = (e, a) => {
    e.stopPropagation();
    const n = telWa(a.telefono);
    if (n) { window.open(`https://wa.me/${n}?text=${encodeURIComponent(messaggio(a))}`, "_blank", "noopener"); return; }
    navigator.clipboard?.writeText(messaggio(a)).then(() => { setCopiato(a.id); setTimeout(() => setCopiato(null), 1800); }).catch(() => {});
  };

  const riga = (a, destra) => (
    <button key={a.id} type="button" className={`feed-atleta ${a.stato}`} onClick={() => apriAtleta(a.id)}>
      <Avatar atleta={a}/>
      <span className="feed-testo">
        <b>{a.nome} {a.cognome}</b>
        <span><UltimoAllenamento atleta={a} oggi={oggi}/>{a.diFila > 1 ? ` · 🔥 ${a.diFila}` : ""}</span>
        {a.stato === "fermo" && a.giorniDa != null && <span className="feed-fermo">{t("home.fermoDa", { count: a.giorniDa })}</span>}
      </span>
      {destra}
    </button>
  );

  const sezione = (cls, titolo, lista, destra) => lista.length > 0 && (
    <section className="feed-sez">
      <h2><span className={`feed-dot ${cls}`}/>{titolo} <span className="feed-n">{lista.length}</span></h2>
      {lista.map(a => riga(a, destra(a)))}
    </section>
  );

  return (
    <div className="home-pt">
      <div className="home-testa">
        <div className="page-title">{t("home.titolo")}</div>
        <div className="page-sub">{range} · {t("home.riepilogo", { ok: ok.length, tot: conScheda.length })}{fermi.length ? ` · ${t("home.nFermi", { count: fermi.length })}` : ""}</div>
      </div>
      {conScheda.length > 0 && <div className="feed-scorsa">{t("home.settimanaScorsa", { ok: scorsaOk.length, tot: conScheda.length })}</div>}
      {!atleti.length && <div className="b2-inizio">{t("home.nessunAtleta")}</div>}
      <div className="home-griglia">
        <div>
          {sezione("fermo", t("home.daSentire"), fermi, a => (
            <span className="feed-wa" role="button" tabIndex={0} onClick={e => scrivi(e, a)} onKeyDown={e => e.key === "Enter" && scrivi(e, a)}>
              {copiato === a.id ? `✓ ${t("home.copiato")}` : t("home.whatsapp")}
            </span>))}
          {sezione("sotto", t("home.sottoObiettivo"), sotto, a => <span className="feed-num"><b>{a.scorsa.fatti}/{a.scorsa.ob}</b><small>{t("home.settScorsa")}</small></span>)}
          {sezione("ok", t("home.inRegola"), ok, a => <span className="feed-num"><b>{a.sett.fatti}/{a.sett.ob}</b><small>{t("home.questaSett")}</small></span>)}
          {sezione("senza", t("home.senzaScheda"), senza, () => <span className="feed-num"><small>{t("home.creaScheda")}</small></span>)}
        </div>
        <div>
          <section className="feed-sez">
            <h2>📝 {t("home.noteAtleti")}</h2>
            {ev.note.length ? ev.note.slice(0, 12).map((n, i) => (
              <button key={i} type="button" className="feed-nota" onClick={() => apriAtleta(n.atletaId)}>
                <span className="feed-meta"><b>{nome(n.atletaId)?.nome}</b> · {data(n.data)}{n.nome ? ` · ${nomeEs(n.nome, n.nomeTecnico)}` : ""}</span>
                <q>{n.nota}</q>
              </button>
            )) : <div className="feed-vuoto">{t("home.nessunaNota")}</div>}
          </section>
          <section className="feed-sez">
            <h2>⏭ {t("home.saltati")}</h2>
            {ev.saltati.length ? ev.saltati.slice(0, 12).map((s, i) => (
              <button key={i} type="button" className="feed-nota" onClick={() => apriAtleta(s.atletaId)}>
                <span className="feed-meta"><b>{nome(s.atletaId)?.nome}</b> · {data(s.data)}</span>{nomeEs(s.nome)}
              </button>
            )) : <div className="feed-vuoto">✓ {t("home.nessunSaltato")}</div>}
          </section>
          {ev.strani.length > 0 && (
            <section className="feed-sez">
              <h2>⚠ {t("home.daControllare")}</h2>
              {ev.strani.slice(0, 12).map((s, i) => (
                <button key={i} type="button" className="feed-nota feed-strano" onClick={() => apriAtleta(s.atletaId)}>
                  <span className="feed-meta"><b>{nome(s.atletaId)?.nome}</b> · {data(s.data)}</span>
                  {t("home.ripFuoriScala", { nome: nomeEs(s.nome, s.nomeTecnico), r: s.reps, p: s.previste })}
                </button>
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
