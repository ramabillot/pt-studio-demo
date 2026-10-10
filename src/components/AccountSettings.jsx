import { useState } from "react";
import { supabase } from "../supabase.js";
import { BackBtn } from "./Sidebar.jsx";
import { useTranslation } from "react-i18next";
import { LINGUE, cambiaLingua } from "../i18n/index.js";
import SceltaTesto from "./SceltaTesto.jsx";

export default function AccountSettings({ setView, user }) {
  const { t, i18n } = useTranslation();
  const [curPass, setCurPass]         = useState("");
  const [newPass, setNewPass]         = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [err, setErr]                 = useState("");
  const [success, setSuccess]         = useState(false);
  const [loading, setLoading]         = useState(false);

  const submit = async () => {
    setErr(""); setSuccess(false);
    if (!curPass)                  { setErr(t("account.errAttuale")); return; }
    if (newPass.length < 6)       { setErr(t("account.errCorta")); return; }
    if (newPass !== confirmPass)   { setErr(t("account.errDiverse")); return; }
    if (newPass === curPass)       { setErr(t("account.errUguale")); return; }
    setLoading(true);
    try {
      // Verifica della password attuale: senza, chiunque trovi il PC/telefono
      // con la sessione aperta potrebbe cambiare la password e prendersi l'account.
      const { error: authErr } = await supabase.auth.signInWithPassword({ email: user.email, password: curPass });
      if (authErr) { setErr(t("account.errSbagliata")); return; }
      const { error } = await supabase.auth.updateUser({ password: newPass });
      if (error) { setErr(error.message); return; }
      setSuccess(true);
      setCurPass(""); setNewPass(""); setConfirmPass("");
    } catch {
      setErr(t("comune.errRete"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <BackBtn setView={setView}/>
      <div className="page-head">
        <div className="page-title">{t("nav.account")}</div>
        <div className="page-sub">{user.email}</div>
      </div>

      <div style={{maxWidth:440}}>
        <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:14,padding:"22px 24px",marginBottom:16}}>
          <div style={{fontSize:"0.75rem",fontWeight:600,letterSpacing:1,textTransform:"uppercase",color:"var(--muted)",marginBottom:14}}>
            {t("account.lingua")}
          </div>
          <div className="lingua-scelta">
            {LINGUE.map(l=>(
              <button key={l.code} className={`login-role-btn${i18n.language===l.code?" active":""}`} onClick={()=>cambiaLingua(l.code)}>{l.nome}</button>
            ))}
          </div>
        </div>
        <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:14,padding:"22px 24px",marginBottom:16}}>
          <div style={{fontSize:"0.75rem",fontWeight:600,letterSpacing:1,textTransform:"uppercase",color:"var(--muted)",marginBottom:14}}>
            {t("impostazioni.testo")}
          </div>
          <SceltaTesto/>
          <div style={{fontSize:"0.8125rem",color:"var(--muted)",marginTop:10}}>{t("impostazioni.testoNota")}</div>
        </div>
        <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:14,padding:"22px 24px"}}>
          <div style={{fontSize:"0.75rem",fontWeight:600,letterSpacing:1,textTransform:"uppercase",color:"var(--muted)",marginBottom:18}}>
            {t("account.cambiaPassword")}
          </div>

          <label className="field-label">
            {t("account.attuale")}
            <input
              className="field-input"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={curPass}
              onChange={e=>{ setCurPass(e.target.value); setErr(""); setSuccess(false); }}
            />
          </label>

          <label className="field-label" style={{marginTop:12}}>
            {t("account.nuova")}
            <input
              className="field-input"
              type="password"
              placeholder={t("login.phMin6")}
              value={newPass}
              onChange={e=>{ setNewPass(e.target.value); setErr(""); setSuccess(false); }}
            />
          </label>

          <label className="field-label" style={{marginTop:12}}>
            {t("account.conferma")}
            <input
              className="field-input"
              type="password"
              placeholder="••••••••"
              value={confirmPass}
              onChange={e=>{ setConfirmPass(e.target.value); setErr(""); setSuccess(false); }}
              onKeyDown={e=>e.key==="Enter"&&submit()}
            />
          </label>

          {err&&(
            <div style={{color:"var(--danger)",fontSize:"0.8125rem",marginTop:12,lineHeight:1.5}}>{err}</div>
          )}
          {success&&(
            <div style={{color:"var(--accent2)",fontSize:"0.8125rem",marginTop:12,fontWeight:600}}>
              ✓ {t("account.aggiornata")}
            </div>
          )}

          <div style={{marginTop:18}}>
            <button
              className="btn-primary"
              style={{fontSize:"0.8125rem",padding:"9px 22px"}}
              onClick={submit}
              disabled={loading}
            >
              {loading?t("account.aggiornamento"):t("account.aggiornaPassword")}
            </button>
          </div>

          <div style={{marginTop:14,fontSize:"0.75rem",color:"var(--muted)",lineHeight:1.6,borderTop:"1px solid var(--border)",paddingTop:14}}>
            {t("account.nota")}
          </div>
        </div>
      </div>
    </div>
  );
}
