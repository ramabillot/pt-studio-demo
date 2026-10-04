// ── Aggiornamento automatico ──────────────────────────────────────────────────
// L'app installata sul telefono (icona nella schermata Home) può restare aperta
// in memoria per giorni con la versione vecchia. Qui si confronta la versione
// in uso con /version.json online:
//  · all'apertura, o al ritorno dopo più di 30 minuti → ricarica da sola
//  · al ritorno dopo poco (es. tra una serie e l'altra) → solo un banner
//    "Aggiorna", per non perdere i pesi che si stanno inserendo
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const VERSIONE = import.meta.env.VITE_APP_VERSION || "dev";
const RITORNO_LUNGO_MS = 30 * 60 * 1000;
const MIN_TRA_CONTROLLI_MS = 60 * 1000;

async function versioneOnline() {
  try {
    const r = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
    if (!r.ok) return null;
    return (await r.json())?.v || null;
  } catch { return null; }
}

// Ricarica al massimo una volta per versione (evita loop se la CDN è in ritardo)
function ricaricaUnaVolta(v) {
  const k = `pts_ricarica_${v}`;
  try {
    if (sessionStorage.getItem(k)) return false;
    sessionStorage.setItem(k, "1");
  } catch { /* storage non disponibile: ricarica comunque */ }
  window.location.reload();
  return true;
}

export default function AggiornamentoApp() {
  const { t } = useTranslation();
  const [nuova, setNuova] = useState(false);

  useEffect(() => {
    if (VERSIONE === "dev") return;
    let ultimoControllo = 0;
    let nascostaDa = null;

    const controlla = async (puoRicaricare) => {
      if (Date.now() - ultimoControllo < MIN_TRA_CONTROLLI_MS) return;
      ultimoControllo = Date.now();
      const v = await versioneOnline();
      if (!v || v === VERSIONE) return;
      if (puoRicaricare && ricaricaUnaVolta(v)) return;
      setNuova(true);
    };

    const onVisibilita = () => {
      if (document.visibilityState === "hidden") { nascostaDa = Date.now(); return; }
      const lungo = nascostaDa !== null && Date.now() - nascostaDa > RITORNO_LUNGO_MS;
      nascostaDa = null;
      controlla(lungo);
    };

    controlla(true);
    document.addEventListener("visibilitychange", onVisibilita);
    return () => document.removeEventListener("visibilitychange", onVisibilita);
  }, []);

  if (!nuova) return null;
  return (
    <div className="aggiorna-banner" role="status">
      <span>{t("aggiorna.nuova")}</span>
      <button onClick={() => window.location.reload()}>{t("aggiorna.aggiorna")}</button>
    </div>
  );
}
