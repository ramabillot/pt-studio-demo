// ── Scelta della dimensione del testo (A / A+ / A++) ── usata in Impostazioni (atleta) e Account (PT)
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { SCALE, sceltaTesto, cambiaTesto, ascoltaTesto } from "../lib/testo.js";

export default function SceltaTesto() {
  const { t } = useTranslation();
  const [scelta, setScelta] = useState(sceltaTesto);
  useEffect(() => ascoltaTesto(() => setScelta(sceltaTesto())), []);
  return (
    <div className="lingua-scelta testo-scelta" role="radiogroup" aria-label={t("impostazioni.testo")}>
      {SCALE.map((s, i) => (
        <button key={s.id} type="button" role="radio" aria-checked={scelta === s.id}
          className={`login-role-btn${scelta === s.id ? " active" : ""}`} onClick={() => cambiaTesto(s.id)}>
          <span style={{ fontSize: `${1 + i * 0.25}em` }}>{s.etichetta}</span>
        </button>
      ))}
    </div>
  );
}
