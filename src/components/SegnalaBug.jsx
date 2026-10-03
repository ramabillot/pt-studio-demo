// ── Segnala bug / idea (beta) ─────────────────────────────────────────────────
// Bottone flottante sempre visibile (PT e atleta). Salva in public.segnalazioni
// tramite la RPC segnala() (migration 017) con il contesto raccolto in automatico.
import { useState, useRef } from "react";
import { supabase } from "../supabase.js";
import { getToken } from "../api/atleta.js";
import { erroriRecenti } from "../lib/erroriRecenti.js";

const MAX_LATO = 1280;   // px: la foto viene ridotta e compressa prima dell'invio

// Foto → jpeg ridotto, in base64 senza prefisso "data:"
function comprimiFoto(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, MAX_LATO / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.75));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Foto non leggibile")); };
    img.src = url;
  });
}

// Cosa c'era a schermo: vista + elementi "attivi" (tab, giorno, voce di menu)
function raccogliContesto(user, view) {
  const attivi = [...document.querySelectorAll(".active")]
    .map(el => (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40))
    .filter(Boolean);
  return {
    ruolo: user?.role,
    vista: view || null,
    attivi: [...new Set(attivi)].slice(0, 8),
    url: window.location.href,
    versione: import.meta.env.VITE_APP_VERSION || "dev",
    schermo: `${window.innerWidth}x${window.innerHeight}`,
    dispositivo: navigator.userAgent,
    ora_locale: new Date().toString(),
    errori: erroriRecenti(),
  };
}

export default function SegnalaBug({ user, view }) {
  const [aperto, setAperto] = useState(false);
  const [tipo, setTipo] = useState("bug");
  const [testo, setTesto] = useState("");
  const [foto, setFoto] = useState(null);       // dataURL jpeg
  const [stato, setStato] = useState("idle");   // idle | invio | ok
  const [errore, setErrore] = useState("");
  const fileRef = useRef(null);
  const contestoRef = useRef(null);

  const apri = () => {
    contestoRef.current = raccogliContesto(user, view);   // fotografa lo stato PRIMA della modale
    setErrore(""); setStato("idle"); setAperto(true);
  };
  const chiudi = () => { if (stato !== "invio") setAperto(false); };

  const scegliFoto = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try { setFoto(await comprimiFoto(f)); setErrore(""); }
    catch (err) { setErrore(err.message); }
  };

  const invia = async () => {
    if (!testo.trim()) { setErrore("Scrivi due parole su cosa è successo."); return; }
    setStato("invio"); setErrore("");
    const { error } = await supabase.rpc("segnala", {
      p_tipo: tipo,
      p_testo: testo.trim(),
      p_contesto: contestoRef.current || raccogliContesto(user, view),
      p_foto_b64: foto ? foto.split(",")[1] : null,
      p_token: user?.role === "atleta" ? getToken() : null,
    });
    if (error) {
      setStato("idle");
      setErrore("Invio non riuscito. Riprova tra poco (il testo resta qui).");
      return;
    }
    setStato("ok");
    setTesto(""); setFoto(null); setTipo("bug");
    setTimeout(() => { setAperto(false); setStato("idle"); }, 1600);
  };

  const sopraNav = user?.role !== "atleta";   // PT su mobile: sopra la barra di navigazione

  return (
    <>
      <button className={`segnala-fab${sopraNav ? " sopra-nav" : ""}`} onClick={apri}
        aria-label="Segnala un bug o un'idea" title="Segnala un bug o un'idea">🐞</button>

      {aperto && (
        <div className="overlay segnala-overlay" onClick={chiudi}>
          <div className="modal segnala-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Segnala</div>
              <button className="modal-close" onClick={chiudi} aria-label="Chiudi">✕</button>
            </div>

            {stato === "ok" ? (
              <div className="segnala-ok">✓ Grazie! Segnalazione inviata.</div>
            ) : (
              <div className="modal-body segnala-body">
                <div className="segnala-tipo">
                  <button className={`login-role-btn${tipo === "bug" ? " active" : ""}`} onClick={() => setTipo("bug")}>🐞 Bug</button>
                  <button className={`login-role-btn${tipo === "idea" ? " active" : ""}`} onClick={() => setTipo("idea")}>💡 Idea</button>
                </div>

                <textarea className="segnala-testo" rows={5} maxLength={4000} autoFocus
                  value={testo} onChange={e => setTesto(e.target.value)}
                  placeholder={tipo === "bug"
                    ? "Cosa è successo? Cosa ti aspettavi invece?"
                    : "Cosa ti piacerebbe avere o cambiare?"} />

                <input ref={fileRef} type="file" accept="image/*" hidden onChange={scegliFoto} />
                {foto ? (
                  <div className="segnala-foto">
                    <img src={foto} alt="Foto allegata" />
                    <button className="btn-ghost" onClick={() => setFoto(null)}>Togli foto</button>
                  </div>
                ) : (
                  <button className="btn-ghost segnala-add-foto" onClick={() => fileRef.current?.click()}>📷 Aggiungi foto / screenshot</button>
                )}

                <div className="segnala-nota">Inviamo in automatico anche schermata, dispositivo e versione dell'app.</div>
                {errore && <div className="login-err" style={{ textAlign: "left" }}>{errore}</div>}

                <button className="login-btn" onClick={invia} disabled={stato === "invio"}>
                  {stato === "invio" ? "Invio…" : "Invia"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
