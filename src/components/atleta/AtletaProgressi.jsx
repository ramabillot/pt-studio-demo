import ProgressiEsercizi from "../ProgressiEsercizi.jsx";
import { MisureSection } from "../MisureSection.jsx";
import { useTranslation } from "react-i18next";

// ── Progressi screen (atleta view) ────────────────────────────────────────────
export default function AtletaProgressi({scheda, sessioni, misurazioni}) {
  const { t } = useTranslation();
  const ordine=scheda?Object.values(scheda.giorni).flat().map(ex=>ex.name):[];
  // nome per l'atleta scelto dal PT: lo storico resta raggruppato per nome tecnico, cambia solo l'etichetta
  const etichette=scheda?Object.fromEntries(Object.values(scheda.giorni).flat().filter(ex=>ex.alias).map(ex=>[ex.name,ex.alias])):{};
  return (
    <div className="cliente-body">
      <div className="prog-section">
        <div className="prog-section-head">{t("progressi.esercizi")}</div>
        <ProgressiEsercizi sessioni={sessioni||[]} ordine={ordine} etichette={etichette} vuoto={t("progressi.vuotoAtleta")}/>
      </div>
      <div className="prog-section" style={{marginTop:8}}>
        <div className="prog-section-head">📏 {t("progressi.mieMisurazioni")}</div>
        <MisureSection readOnly={true} externalMisure={misurazioni||[]}/>
      </div>
    </div>
  );
}
