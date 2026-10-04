// ── Invito a installare l'app (dopo il login, solo su telefono, solo se non è già installata) ──
// Una volta chiuso non ricompare su quel dispositivo.
import { useEffect, useState } from "react";
import { APP } from "../lib/app.js";
import { store } from "../utils.js";
import { ascoltaInstallazione, puoInstallareAndroid, installaAndroid, isStandalone, isIOS, isIOSSafari, isMobile } from "../lib/installa.js";

const KEY = `ptstudio_invito_installa_${APP}`;
const NOME = APP === "atleta" ? "PT Studio" : "PT Coach";

export default function InvitoInstalla() {
  const [chiuso, setChiuso] = useState(() => !!store.get(KEY) || isStandalone() || !isMobile());
  const [android, setAndroid] = useState(puoInstallareAndroid);
  const [visibile, setVisibile] = useState(false);

  useEffect(() => ascoltaInstallazione(() => setAndroid(puoInstallareAndroid())), []);
  useEffect(() => { const t = setTimeout(() => setVisibile(true), 1500); return () => clearTimeout(t); }, []);

  const chiudi = () => { store.set(KEY, "1"); setChiuso(true); };
  if (chiuso || !visibile) return null;
  if (!android && !isIOS()) return null;   // Android senza prompt (es. già installata): niente

  return (
    <div className={`invito-installa${APP==="pt"?" sopra-nav":""}`} role="dialog" aria-label={`Installa ${NOME}`}>
      <img src={APP === "atleta" ? "/icons/icon-192.png" : "/icons/coach/icon-192.png"} alt="" className="invito-icona"/>
      <div className="invito-testo">
        <strong>Installa {NOME} sul telefono</strong>
        {android && <span>Si apre come un'app, a schermo intero.</span>}
        {!android && isIOSSafari() && <span>Tocca <b>Condividi</b> <span className="invito-share" aria-hidden>⬆︎</span>, poi <b>“Aggiungi alla schermata Home”</b> e <b>Aggiungi</b>.</span>}
        {!android && !isIOSSafari() && <span>Apri questo link in <b>Safari</b>: solo da lì l'iPhone può installare l'app.</span>}
      </div>
      <div className="invito-azioni">
        {android && <button className="crono-btn invito-si" onClick={async () => { if (await installaAndroid()) chiudi(); }}>Installa</button>}
        <button className="crono-btn" onClick={chiudi}>{android ? "Non ora" : "Ok"}</button>
      </div>
    </div>
  );
}
