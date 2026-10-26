// ── Pezzi comuni del lato PT: avatar, pillola dello stato, testo "ultimo allenamento" ──
import { useTranslation } from "react-i18next";
import { getInitials, fmtDateShort } from "../../utils.js";
import { nomeGiorno } from "../../i18n/index.js";

export function Avatar({ atleta, grande = false }) {
  return <span className={`pt-av${grande ? " grande" : ""}`} style={{ background: atleta.color || "var(--accent)" }}>{getInitials(atleta.nome, atleta.cognome)}</span>;
}

export function PillolaStato({ stato }) {
  const { t } = useTranslation();
  return <span className={`pt-pill ${stato}`}>{t(`pt.stato.${stato}`)}</span>;
}

// "Ultimo: oggi · Día A" / "Ultimo: lun 10 ott · Día C" / "Mai allenato"
export function UltimoAllenamento({ atleta, oggi }) {
  const { t } = useTranslation();
  if (!atleta.ultimo) return <>{t("pt.mai")}</>;
  const d = atleta.ultimo.data === oggi ? t("comune.oggi").toLowerCase() : fmtDateShort(atleta.ultimo.data);
  const g = atleta.ultimoGiorno || atleta.ultimoKey ? ` · ${nomeGiorno(atleta.ultimoGiorno, atleta.ultimoKey)}` : "";
  return <>{t("pt.ultimo", { quando: d })}{g}</>;
}
