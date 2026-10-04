// ── Invito a installare l'app (dopo il login, solo su telefono, solo se non è già installata) ──
// Una volta chiuso non ricompare su quel dispositivo.
import { useEffect, useState } from "react";
import { APP } from "../lib/app.js";
import { store } from "../utils.js";
import { useTranslation, Trans } from "react-i18next";
import { ascoltaInstallazione, puoInstallareAndroid, installaAndroid, isStandalone, isIOS, isIOSSafari, isMobile } from "../lib/installa.js";

const KEY = `ptstudio_invito_installa_${APP}`;
const NOME = APP === "atleta" ? "PT Studio" : "PT Coach";

export default function InvitoInstalla() {
  const { t } = useTranslation();
  const [chiuso, setChiuso] = useState(() => !!store.get(KEY) || isStandalone() || !isMobile());
  const [android, setAndroid] = useState(puoInstallareAndroid);
  const [visibile, setVisibile] = useState(false);

  useEffect(() => ascoltaInstallazione(() => setAndroid(puoInstallareAndroid())), []);
  useEffect(() => { const t = setTimeout(() => setVisibile(true), 1500); return () => clearTimeout(t); }, []);

  const chiudi = () => { store.set(KEY, "1"); setChiuso(true); };
  if (chiuso || !visibile) return null;
  if (!android && !isIOS()) return null;   // Android senza prompt (es. già installata): niente

  return (
    <div className={`invito-installa${APP==="pt"?" sopra-nav":""}`} role="dialog" aria-label={t("installa.aria",{nome:NOME})}>
      <img src={APP === "atleta" ? "/icons/icon-192.png" : "/icons/coach/icon-192.png"} alt="" className="invito-icona"/>
      <div className="invito-testo">
        <strong>{t("installa.titolo",{nome:NOME})}</strong>
        {android && <span>{t("installa.android")}</span>}
        {!android && isIOSSafari() && <span><Trans i18nKey="installa.iphone" components={{b:<b/>, share:<span className="invito-share" aria-hidden/>}}/></span>}
        {!android && !isIOSSafari() && <span><Trans i18nKey="installa.soloSafari" components={{b:<b/>}}/></span>}
      </div>
      <div className="invito-azioni">
        {android && <button className="crono-btn invito-si" onClick={async () => { if (await installaAndroid()) chiudi(); }}>{t("installa.installa")}</button>}
        <button className="crono-btn" onClick={chiudi}>{android ? t("installa.nonOra") : t("comune.ok")}</button>
      </div>
    </div>
  );
}
