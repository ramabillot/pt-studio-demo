import React, { useState } from "react";
import { supabase } from "../supabase.js";
import { BackBtn } from "./Sidebar.jsx";

export default function AccountSettings({ setView, user }) {
  const [curPass, setCurPass]         = useState("");
  const [newPass, setNewPass]         = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [err, setErr]                 = useState("");
  const [success, setSuccess]         = useState(false);
  const [loading, setLoading]         = useState(false);

  const submit = async () => {
    setErr(""); setSuccess(false);
    if (!curPass)                  { setErr("Inserisci la password attuale"); return; }
    if (newPass.length < 6)       { setErr("La password deve essere di almeno 6 caratteri"); return; }
    if (newPass !== confirmPass)   { setErr("Le due password non coincidono"); return; }
    if (newPass === curPass)       { setErr("La nuova password deve essere diversa da quella attuale"); return; }
    setLoading(true);
    try {
      // Verifica della password attuale: senza, chiunque trovi il PC/telefono
      // con la sessione aperta potrebbe cambiare la password e prendersi l'account.
      const { error: authErr } = await supabase.auth.signInWithPassword({ email: user.email, password: curPass });
      if (authErr) { setErr("La password attuale non è corretta"); return; }
      const { error } = await supabase.auth.updateUser({ password: newPass });
      if (error) { setErr(error.message); return; }
      setSuccess(true);
      setCurPass(""); setNewPass(""); setConfirmPass("");
    } catch {
      setErr("Connessione non riuscita. Riprova.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <BackBtn setView={setView}/>
      <div className="page-head">
        <div className="page-title">Account</div>
        <div className="page-sub">{user.email}</div>
      </div>

      <div style={{maxWidth:440}}>
        <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:14,padding:"22px 24px"}}>
          <div style={{fontSize:12,fontWeight:600,letterSpacing:1,textTransform:"uppercase",color:"var(--muted)",marginBottom:18}}>
            Cambia password
          </div>

          <label className="field-label">
            Password attuale
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
            Nuova password
            <input
              className="field-input"
              type="password"
              placeholder="min. 6 caratteri"
              value={newPass}
              onChange={e=>{ setNewPass(e.target.value); setErr(""); setSuccess(false); }}
            />
          </label>

          <label className="field-label" style={{marginTop:12}}>
            Conferma nuova password
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
            <div style={{color:"var(--danger)",fontSize:13,marginTop:12,lineHeight:1.5}}>{err}</div>
          )}
          {success&&(
            <div style={{color:"var(--accent2)",fontSize:13,marginTop:12,fontWeight:600}}>
              ✓ Password aggiornata
            </div>
          )}

          <div style={{marginTop:18}}>
            <button
              className="btn-primary"
              style={{fontSize:13,padding:"9px 22px"}}
              onClick={submit}
              disabled={loading}
            >
              {loading?"Aggiornamento…":"Aggiorna password"}
            </button>
          </div>

          <div style={{marginTop:14,fontSize:12,color:"var(--muted)",lineHeight:1.6,borderTop:"1px solid var(--border)",paddingTop:14}}>
            Per sicurezza serve la password attuale. Se non la ricordi, esci e usa "Password dimenticata?" nella schermata di accesso.
          </div>
        </div>
      </div>
    </div>
  );
}
