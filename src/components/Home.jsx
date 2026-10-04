// ── Home (/) — non installabile: cos'è PT Studio + accesso alle due app ──
// Versione minima per la beta; quella disegnata bene arriva col restyling.
import { URL_ATLETA, URL_PT } from "../lib/app.js";

export default function Home() {
  return (
    <main className="home-wrap">
      <div className="home-box">
        <div className="login-logo home-logo"><span>PT</span>Studio</div>
        <p className="home-claim">Schede, allenamenti e progressi.<br/>Il personal trainer e i suoi atleti, in un'app sola.</p>
        <div className="home-azioni">
          <a className="login-btn home-btn" href={URL_ATLETA}>Accedi come Atleta</a>
          <a className="btn-ghost home-btn" href={URL_PT}>Accedi come Personal Trainer</a>
        </div>
      </div>
    </main>
  );
}
