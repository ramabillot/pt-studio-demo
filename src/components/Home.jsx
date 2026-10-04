// ── Home (/) — non installabile: cos'è PT Studio + accesso alle due app ──
// Versione minima per la beta; quella disegnata bene arriva col restyling.
import { URL_ATLETA, URL_PT } from "../lib/app.js";
import { useTranslation } from "react-i18next";
import SelettoreLingua from "./SelettoreLingua.jsx";

export default function Home() {
  const { t } = useTranslation();
  return (
    <main className="home-wrap">
      <SelettoreLingua className="lingua-angolo"/>
      <div className="home-box">
        <div className="login-logo home-logo"><span>PT</span>Studio</div>
        <p className="home-claim">{t("home.claim1")}<br/>{t("home.claim2")}</p>
        <div className="home-azioni">
          <a className="login-btn home-btn" href={URL_ATLETA}>{t("home.atleta")}</a>
          <a className="btn-ghost home-btn" href={URL_PT}>{t("home.pt")}</a>
        </div>
      </div>
    </main>
  );
}
