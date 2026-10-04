// ── Pillola del cronometro in basso: tempo, +15, chiudi. Appare solo quando è attivo ──
import { useEffect, useRef, useState } from "react";
import { leggi, scrivi, ascolta, bip, vibra, fmtMMSS } from "../../lib/cronometro.js";
import { appInSecondoPiano, appASchermo } from "../../lib/notifiche.js";

const NASCONDI_DOPO_MS = 10 * 60 * 1000;   // a 10 min dalla fine sparisce da solo
const APPENA_MS = 2000;                    // suona solo se la fine è "adesso" (non se si torna dopo)

export default function Cronometro() {
  const [t, setT] = useState(leggi);
  const [ora, setOra] = useState(() => Date.now());
  const fatto = useRef(new Set());          // suoni già fatti, per non ripeterli

  useEffect(() => ascolta(() => { setT(leggi()); setOra(Date.now()); }), []);

  // Notifiche solo quando l'app non è a schermo (schermo bloccato, altra app)
  useEffect(() => {
    const cambio = () => document.visibilityState === "hidden" ? appInSecondoPiano(leggi()) : appASchermo();
    const via = () => appInSecondoPiano(leggi());
    document.addEventListener("visibilitychange", cambio);
    window.addEventListener("pagehide", via);
    appASchermo();   // all'apertura: via eventuali avvisi rimasti
    return () => { document.removeEventListener("visibilitychange", cambio); window.removeEventListener("pagehide", via); };
  }, []);

  useEffect(() => {
    if (!t) return;
    const tick = () => setOra(Date.now());
    const id = setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", tick); };
  }, [t]);

  // Suoni e passaggi di stato
  useEffect(() => {
    if (!t) return;
    const visibile = document.visibilityState === "visible";
    const una = (k, fn) => { const key = `${t.fine}:${k}`; if (!fatto.current.has(key)) { fatto.current.add(key); fn(); } };

    if (t.tipo === "tempo" && ora < t.inizio) {
      const n = Math.ceil((t.inizio - ora) / 1000);
      una(`p${n}`, () => visibile && bip(660, 0.1));
      return;
    }
    if (t.tipo === "tempo") una("via", () => visibile && ora - t.inizio < APPENA_MS && bip(990, 0.25));

    if (ora >= t.fine) {
      una("fine", () => {
        if (visibile && ora - t.fine < APPENA_MS) { bip(880, 0.18, 3); vibra([200, 100, 200, 100, 300]); }
        if (t.tipo === "tempo" && t.recupero > 0)
          scrivi({ tipo: "recupero", nome: t.nome, inizio: t.fine, fine: t.fine + t.recupero * 1000 });
      });
      if (ora - t.fine > NASCONDI_DOPO_MS) scrivi(null);
    }
  }, [ora, t]);

  if (!t) return null;

  const prep = t.tipo === "tempo" && ora < t.inizio;
  const finito = ora >= t.fine;
  const totale = Math.max(1, t.fine - t.inizio);
  const quota = prep || finito ? 0 : (t.fine - ora) / totale;

  const etichetta = prep ? "Pronti" : finito ? (t.tipo === "tempo" ? "Fatto" : "Recupero finito") : (t.tipo === "tempo" ? t.nome : "Recupero");
  const tempo = prep ? String(Math.ceil((t.inizio - ora) / 1000))
    : finito ? `+${fmtMMSS((ora - t.fine) / 1000)}`
    : fmtMMSS((t.fine - ora) / 1000);

  return (
    <div className={`crono${finito ? " finito" : ""}`} role="timer">
      <span className="crono-label">{etichetta}</span>
      <span className="crono-tempo">{tempo}</span>
      {!finito && !prep && <button className="crono-btn" onClick={() => scrivi({ ...t, fine: t.fine + 15000 })}>+15</button>}
      <button className="crono-btn" aria-label="Chiudi cronometro" onClick={() => scrivi(null)}>✕</button>
      {!finito && !prep && <span className="crono-bar" style={{ transform: `scaleX(${quota})` }}/>}
    </div>
  );
}
