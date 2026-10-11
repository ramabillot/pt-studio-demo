// ── Impostazioni dell'app atleta: dimensione del testo, volume del bip, lingua, esci ──
// In un pannello a parte (icona ⚙ nell'intestazione) così le scelte non stanno sempre a schermo
// e non si toccano per sbaglio.
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { LINGUE, cambiaLingua } from "../../i18n/index.js";
import SceltaTesto from "../SceltaTesto.jsx";
import { VOLUMI, volumeBip, cambiaVolumeBip, bipProva } from "../../lib/cronometro.js";

export default function ImpostazioniAtleta({ onClose, onLogout }) {
  const { t, i18n } = useTranslation();
  const [volume, setVolume] = useState(volumeBip);
  const etichettaVol = { alto: "volAlto", medio: "volMedio", basso: "volBasso" };
  // Scelta del volume → si salva e si sente subito un bip di prova corto (il tocco sblocca l'audio)
  const scegliVolume = id => { cambiaVolumeBip(id); setVolume(id); bipProva(); };
  useEffect(() => {
    const esc = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  return (
    <div className="impost-overlay" onClick={onClose}>
      <div className="impost-pannello" role="dialog" aria-modal="true" aria-labelledby="impost-titolo" onClick={e => e.stopPropagation()}>
        <div className="impost-testa">
          <div id="impost-titolo" className="impost-titolo">{t("impostazioni.titolo")}</div>
          <button type="button" className="impost-chiudi" onClick={onClose} aria-label={t("comune.chiudi")}>✕</button>
        </div>

        <div className="impost-sezione">
          <div className="impost-etichetta">{t("impostazioni.testo")}</div>
          <SceltaTesto/>
          <div className="impost-anteprima">{t("impostazioni.anteprima")}</div>
          <div className="impost-nota">{t("impostazioni.testoNota")}</div>
        </div>

        <div className="impost-sezione">
          <div className="impost-etichetta">{t("impostazioni.volume")}</div>
          <div className="lingua-scelta" role="radiogroup" aria-label={t("impostazioni.volume")}>
            {VOLUMI.map(v => (
              <button key={v.id} type="button" role="radio" aria-checked={volume === v.id}
                className={`login-role-btn${volume === v.id ? " active" : ""}`} onClick={() => scegliVolume(v.id)}>
                {t(`impostazioni.${etichettaVol[v.id]}`)}
              </button>
            ))}
          </div>
          <div className="impost-nota">{t("impostazioni.volumeNota")}</div>
        </div>

        <div className="impost-sezione">
          <div className="impost-etichetta">{t("account.lingua")}</div>
          <div className="lingua-scelta">
            {LINGUE.map(l => (
              <button key={l.code} type="button" className={`login-role-btn${i18n.language === l.code ? " active" : ""}`} onClick={() => cambiaLingua(l.code)}>{l.nome}</button>
            ))}
          </div>
        </div>

        <button type="button" className="impost-esci" onClick={onLogout}>↩ {t("comune.esci")}</button>
      </div>
    </div>
  );
}
