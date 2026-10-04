// ── Selettore lingua (IT / ES / EN) ── select nativo: sul telefono apre il selettore di sistema
import { useTranslation } from "react-i18next";
import { LINGUE, cambiaLingua } from "../i18n/index.js";

export default function SelettoreLingua({ className="" }) {
  const { t, i18n } = useTranslation();
  const attuale = LINGUE.find(l=>l.code===i18n.language)?.code || "it";
  return (
    <label className={`lingua-sel ${className}`.trim()} title={t("lingua.aria")}>
      <span className="lingua-sel-testo" aria-hidden>{attuale.toUpperCase()} ▾</span>
      <select value={attuale} onChange={e=>cambiaLingua(e.target.value)} aria-label={t("lingua.aria")}>
        {LINGUE.map(l=><option key={l.code} value={l.code}>{l.nome}</option>)}
      </select>
    </label>
  );
}
