import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabase.js";
import { loginAtleta } from "../api/atleta.js";
import { store, LS_ATLETA_USERNAME } from "../utils.js";
import { useTranslation } from "react-i18next";
import { locale } from "../i18n/index.js";
import SelettoreLingua from "./SelettoreLingua.jsx";

function buildUserObj(supaUser, profile) {
  return {
    supabaseId: supaUser.id,
    email: supaUser.email,
    name: profile
      ? ((`${profile.nome || ""} ${profile.cognome || ""}`).trim() || supaUser.email)
      : supaUser.email,
    nome: profile?.nome || "",
    cognome: profile?.cognome || "",
    role: profile?.is_admin ? "admin" : "trainer",
    is_approved: profile?.is_approved ?? false,
    is_admin: profile?.is_admin ?? false,
    piano: profile?.piano ?? "base",
    max_atleti: profile?.max_atleti ?? 5,
    isSupabase: true,
  };
}

// ruolo: "atleta" (app /atleta/) o "pt" (app /pt/) — deciso dall'indirizzo, niente selettore
export default function LoginScreen({ruolo, onLogin}) {
  const { t } = useTranslation();
  // mode: "login" | "register" | "registered"
  const [mode, setMode] = useState("login");
  // Login fields — l'atleta arriva dal link del PT (/atleta/?u=username): username già compilato
  // (o dall'icona sulla Home, che apre /atleta/?u=…); altrimenti l'ultimo username usato qui
  const [user, setUser] = useState(()=> ruolo==="atleta" ? (new URLSearchParams(window.location.search).get("u") || store.get(LS_ATLETA_USERNAME) || "") : "");
  const [pass, setPass] = useState("");
  // Register fields
  const [rNome, setRNome] = useState("");
  const [rCognome, setRCognome] = useState("");
  const [rEmail, setREmail] = useState("");
  const [rPass, setRPass] = useState("");
  const [rPass2, setRPass2] = useState("");
  // Shared
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const canvasRef = useRef(null);

  const reset = () => { setErr(""); setLoading(false); };
  const goLogin = () => { setMode("login"); reset(); };

  // ── Canvas background animation (unchanged) ───────────────────────────────
  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return;
    const ctx=canvas.getContext("2d");
    let raf,W,H;
    const shapes=[];
    const resize=()=>{ W=canvas.width=canvas.offsetWidth; H=canvas.height=canvas.offsetHeight; };
    resize(); window.addEventListener("resize",resize);
    for(let i=0;i<18;i++) shapes.push({
      x:Math.random()*W, y:Math.random()*H,
      vx:(Math.random()-.5)*0.4, vy:(Math.random()-.5)*0.4,
      size:Math.random()*60+20, type:i%3,
      opacity:Math.random()*.12+.03,
      rot:Math.random()*Math.PI*2, rotV:(Math.random()-.5)*.005,
      color: i%3===0?"#e8ff47":i%3===1?"#47ffe8":"#ff47a3",
    });
    const draw=()=>{
      ctx.clearRect(0,0,W,H);
      shapes.forEach(s=>{
        s.x+=s.vx; s.y+=s.vy; s.rot+=s.rotV;
        if(s.x<-s.size) s.x=W+s.size; if(s.x>W+s.size) s.x=-s.size;
        if(s.y<-s.size) s.y=H+s.size; if(s.y>H+s.size) s.y=-s.size;
        ctx.save(); ctx.globalAlpha=s.opacity; ctx.strokeStyle=s.color; ctx.lineWidth=1.5;
        ctx.translate(s.x,s.y); ctx.rotate(s.rot); ctx.beginPath();
        if(s.type===0){ ctx.arc(0,0,s.size/2,0,Math.PI*2); }
        else if(s.type===1){ ctx.rect(-s.size/2,-s.size/2,s.size,s.size); }
        else { ctx.moveTo(0,-s.size/2); ctx.lineTo(s.size/2,s.size/2); ctx.lineTo(-s.size/2,s.size/2); ctx.closePath(); }
        ctx.stroke(); ctx.restore();
      });
      for(let i=0;i<shapes.length;i++) for(let j=i+1;j<shapes.length;j++){
        const dx=shapes[i].x-shapes[j].x, dy=shapes[i].y-shapes[j].y;
        const dist=Math.sqrt(dx*dx+dy*dy);
        if(dist<130){ ctx.save(); ctx.globalAlpha=(1-dist/130)*.06; ctx.strokeStyle="#e8ff47"; ctx.lineWidth=.5; ctx.beginPath(); ctx.moveTo(shapes[i].x,shapes[i].y); ctx.lineTo(shapes[j].x,shapes[j].y); ctx.stroke(); ctx.restore(); }
      }
      raf=requestAnimationFrame(draw);
    };
    draw();
    return ()=>{ cancelAnimationFrame(raf); window.removeEventListener("resize",resize); };
  },[]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const submit = async () => {
    setErr("");
    const u = user.trim();
    if (ruolo === "atleta") {
      if (!u || !pass) { setErr(t("login.errUsernamePin")); return; }
      setLoading(true);
      try {
        const r = await loginAtleta(u, pass);
        if (r.ok) { onLogin(r.atleta); return; }
        if (r.errore === "bloccato") {
          const ora = r.fino ? new Date(r.fino).toLocaleTimeString(locale(),{hour:"2-digit",minute:"2-digit"}) : "";
          setErr(ora ? t("login.bloccatoFino",{ora}) : t("login.bloccato"));
        } else {
          setErr(t("login.errCredAtleta"));
        }
      } catch {
        setErr(t("comune.errRete"));
      } finally {
        setLoading(false);
      }
      return;
    }
    // Personal Trainer / admin: email + password
    if (!u || !pass) { setErr(t("login.errEmailPass")); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: u, password: pass });
      if (error) { setErr(t("login.errCredPT")); return; }
      const { data: profile, error: profileErr } = await supabase
        .from("profiles").select("*").eq("id", data.user.id).maybeSingle();
      if (profileErr) { setErr(t("login.errProfilo")); return; }
      onLogin(buildUserObj(data.user, profile));
    } catch {
      setErr(t("comune.errRete"));
    } finally {
      setLoading(false);
    }
  };

  const register = async () => {
    setErr("");
    if (!rNome.trim()||!rCognome.trim()||!rEmail.trim()||!rPass) { setErr(t("login.errCampi")); return; }
    if (rPass !== rPass2) { setErr(t("login.errPassDiverse")); return; }
    if (rPass.length < 6) { setErr(t("login.errPassCorta")); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: rEmail.trim(),
      password: rPass,
      options: { data: { nome: rNome.trim(), cognome: rCognome.trim() } },
    });
    if (error) { setErr(error.message); setLoading(false); return; }
    setMode("registered");
    setLoading(false);
  };

  // ── Shared secondary link style ───────────────────────────────────────────
  const linkBtn = (onClick, label, color="var(--muted)") => (
    <button onClick={onClick} style={{background:"none",border:"none",color,fontSize:"0.8125rem",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",padding:0}}>
      {label}
    </button>
  );

  return (
    <div className="login-wrap">
      <canvas ref={canvasRef} className="login-canvas"/>
      <SelettoreLingua className="lingua-angolo"/>
      <div style={{position:"relative",zIndex:1,width:"100%",maxWidth:420,display:"flex",flexDirection:"column",gap:12,padding:"0 16px"}}>

        <div className="login-box" style={{margin:0}}>
          <div className="login-logo"><span>PT</span>Studio</div>

          {/* ── LOGIN ── */}
          {mode==="login"&&<>
            <div className="login-sub">{ruolo==="atleta"?t("login.subAtleta"):t("login.subPT")}</div>
            {ruolo==="atleta"?(<>
              <div className="login-field">
                <label htmlFor="login-user">{t("login.username")}</label>
                <input id="login-user" className="login-input" type="text" placeholder={t("login.phUsername")} value={user}
                  autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                  onChange={e=>{setUser(e.target.value);setErr("");}}
                  onKeyDown={e=>e.key==="Enter"&&submit()}/>
              </div>
              <div className="login-field">
                <label htmlFor="login-pin">PIN</label>
                <input id="login-pin" className="login-input login-pin" type="password" inputMode="numeric" pattern="[0-9]*"
                  maxLength={4} placeholder="••••" value={pass} autoComplete="current-password" autoFocus={!!user}
                  onChange={e=>{setPass(e.target.value.replace(/\D/g,""));setErr("");}}
                  onKeyDown={e=>e.key==="Enter"&&submit()}/>
              </div>
            </>):(<>
              <div className="login-field">
                <label htmlFor="login-email">Email</label>
                <input id="login-email" className="login-input" type="email" placeholder={t("login.phEmail")} value={user}
                  autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                  onChange={e=>{setUser(e.target.value);setErr("");}}
                  onKeyDown={e=>e.key==="Enter"&&submit()}/>
              </div>
              <div className="login-field">
                <label htmlFor="login-pass">{t("comune.password")}</label>
                <input id="login-pass" className="login-input" type="password" placeholder="••••••••" value={pass}
                  autoComplete="current-password"
                  onChange={e=>{setPass(e.target.value);setErr("");}}
                  onKeyDown={e=>e.key==="Enter"&&submit()}/>
              </div>
            </>)}
            {err&&<div className="login-err">{err}</div>}
            <button className="login-btn" onClick={submit} disabled={loading}>
              {loading?t("login.accesso"):t("login.accedi")}
            </button>
            {ruolo==="pt"?(
              <div style={{display:"flex",justifyContent:"space-between",marginTop:14,flexWrap:"wrap",gap:8}}>
                {linkBtn(()=>{setMode("register");reset();},t("login.registrati"),"var(--accent)")}
                {linkBtn(()=>setShowForgotModal(true),t("login.dimenticata"))}
              </div>
            ):(
              <div style={{textAlign:"center",marginTop:14,fontSize:"0.8125rem",color:"var(--muted)"}}>
                {t("login.notaAtleta")}
              </div>
            )}

          </>}

          {/* ── REGISTER ── */}
          {mode==="register"&&<>
            <div className="login-sub">{t("login.creaAccountPT")}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
              <div className="login-field" style={{marginBottom:0}}>
                <label>{t("comune.nome")}</label>
                <input className="login-input" type="text" placeholder={t("login.phNome")} value={rNome}
                  onChange={e=>{setRNome(e.target.value);setErr("");}}/>
              </div>
              <div className="login-field" style={{marginBottom:0}}>
                <label>{t("comune.cognome")}</label>
                <input className="login-input" type="text" placeholder={t("login.phCognome")} value={rCognome}
                  onChange={e=>{setRCognome(e.target.value);setErr("");}}/>
              </div>
            </div>
            <div className="login-field">
              <label>Email</label>
              <input className="login-input" type="email" placeholder={t("login.phEmailReg")} value={rEmail}
                onChange={e=>{setREmail(e.target.value);setErr("");}}/>
            </div>
            <div className="login-field">
              <label>{t("comune.password")}</label>
              <input className="login-input" type="password" placeholder={t("login.phMin6")} value={rPass}
                onChange={e=>{setRPass(e.target.value);setErr("");}}/>
            </div>
            <div className="login-field">
              <label>{t("login.confermaPass")}</label>
              <input className="login-input" type="password" placeholder="••••••••" value={rPass2}
                onChange={e=>{setRPass2(e.target.value);setErr("");}}
                onKeyDown={e=>e.key==="Enter"&&register()}/>
            </div>
            {err&&<div className="login-err">{err}</div>}
            <button className="login-btn" onClick={register} disabled={loading}>
              {loading?t("login.creazione"):t("login.creaAccount")}
            </button>
            <div style={{textAlign:"center",marginTop:14}}>
              {linkBtn(goLogin,t("login.tornaLogin"))}
            </div>
          </>}

          {/* ── REGISTERED (success) ── */}
          {mode==="registered"&&(
            <div style={{textAlign:"center",padding:"8px 0 4px"}}>
              <div style={{fontSize:"3rem",marginBottom:16}}>🎉</div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.5rem",letterSpacing:1.5,marginBottom:10}}>{t("login.accountCreato")}</div>
              <div style={{fontSize:"0.875rem",color:"var(--muted)",lineHeight:1.75,marginBottom:24}}>
                {t("login.inAttesa1")}<br/>
                {t("login.inAttesa2")}
              </div>
              <button className="btn-ghost" onClick={goLogin} style={{width:"100%",padding:11,fontSize:"0.875rem"}}>
                {t("login.tornaLogin")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal "contatta admin" per reset password ── */}
      {showForgotModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",backdropFilter:"blur(8px)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}
          onClick={()=>setShowForgotModal(false)}>
          <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:16,padding:"28px 28px 24px",maxWidth:380,width:"100%",animation:"slideUp .2s ease"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.375rem",letterSpacing:2,marginBottom:12}}>
              {t("login.resetTitolo")}
            </div>
            <div style={{fontSize:"0.875rem",color:"var(--muted)",lineHeight:1.7,marginBottom:24}}>
              {t("login.resetTesto")}{" "}
              <strong style={{color:"var(--text)"}}>ptstudio.admin@proton.me</strong>.
              <br/>{t("login.resetTesto2")}
            </div>
            <button
              className="login-btn"
              style={{marginTop:0}}
              onClick={()=>setShowForgotModal(false)}
            >{t("comune.hoCapito")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
