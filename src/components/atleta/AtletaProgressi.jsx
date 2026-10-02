import ProgressiEsercizi from "../ProgressiEsercizi.jsx";
import { MisureSection } from "../MisureSection.jsx";

// ── Progressi screen (atleta view) ────────────────────────────────────────────
export default function AtletaProgressi({scheda, sessioni, misurazioni}) {
  const ordine=scheda?Object.values(scheda.giorni).flat().map(ex=>ex.name):[];
  return (
    <div className="cliente-body">
      <div className="prog-section">
        <div className="prog-section-head">Esercizi</div>
        <ProgressiEsercizi sessioni={sessioni||[]} ordine={ordine} vuoto="Registra i tuoi allenamenti per vedere i progressi."/>
      </div>
      <div className="prog-section" style={{marginTop:8}}>
        <div className="prog-section-head">📏 Le mie misurazioni</div>
        <MisureSection readOnly={true} externalMisure={misurazioni||[]}/>
      </div>
    </div>
  );
}
