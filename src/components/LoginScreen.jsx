import React, { useState, useEffect, useRef } from "react";
import { ACCOUNTS } from "../data.js";
import { supabase } from "../supabase.js";

function buildUserObj(supaUser, profile) {
  return {
    supabaseId: supaUser.id,
    email: supaUser.email,
    name: profile
      ? (`${profile.nome} ${profile.cognome}`.trim() || supaUser.email)
      : supaUser.email,
    nome: profile?.nome || "",
    cognome: profile?.cognome || "",
    role: profile?.is_admin ? "admin" : "trainer",
    is_approved: profile?.is_approved ?? false,
    is_admin: profile?.is_admin ?? false,
    piano: profile?.piano ?? "base",
    max_atleti: profile?.max_atleti ?? 5,
    isSupabase: true,
    theme: { accent:"#e8ff47", accentFg:"#07070d", logo:["PT","Studio"] },
  };
}

export default function LoginScreen({onLogin}) {
  // mode: "login" | "register" | "forgot" | "registered"
  const [mode, setMode] = useState("login");
  // Login fields
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  // Register fields
  const [rNome, setRNome] = useState("");
  const [rCognome, setRCognome] = useState("");
  const [rEmail, setREmail] = useState("");
  const [rPass, setRPass] = useState("");
  const [rPass2, setRPass2] = useState("");
  // Forgot
  const [fEmail, setFEmail] = useState("");
  const [fMsg, setFMsg] = useState("");
  // Shared
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const canvasRef = useRef(null);

  const reset = () => { setErr(""); setLoading(false); };
  const goLogin = () => { setMode("login"); reset(); setFMsg(""); };

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
    const u = user.toLowerCase().trim();
    const acc = ACCOUNTS[u];
    // Demo auth (unchanged)
    if (acc && acc.password === pass) {
      onLogin({ username: u, ...acc });
      return;
    }
    if (!user.trim() || !pass) { setErr("Inserisci email e password"); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: user.trim(), password: pass });
    if (error) { setErr("Email o password non corretti"); setLoading(false); return; }
    const { data: profile, error: profileErr } = await supabase
      .from("profiles").select("*").eq("id", data.user.id).maybeSingle();
    console.log("[profile query] user.id:", data.user.id, "| profile:", profile, "| error:", profileErr);
    if (profileErr) { setErr("Errore nel caricamento del profilo. Riprova."); setLoading(false); return; }
    onLogin(buildUserObj(data.user, profile));
    setLoading(false);
  };

  const register = async () => {
    setErr("");
    if (!rNome.trim()||!rCognome.trim()||!rEmail.trim()||!rPass) { setErr("Compila tutti i campi"); return; }
    if (rPass !== rPass2) { setErr("Le password non coincidono"); return; }
    if (rPass.length < 6) { setErr("Password minimo 6 caratteri"); return; }
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

  const forgotPwd = async () => {
    setErr(""); setFMsg("");
    if (!fEmail.trim()) { setErr("Inserisci la tua email"); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(fEmail.trim(), {
      redirectTo: window.location.origin,
    });
    if (error) { setErr(error.message); }
    else { setFMsg("Email inviata! Controlla la tua casella."); }
    setLoading(false);
  };

  // ── Shared secondary link style ───────────────────────────────────────────
  const linkBtn = (onClick, label, color="var(--muted)") => (
    <button onClick={onClick} style={{background:"none",border:"none",color,fontSize:13,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",padding:0}}>
      {label}
    </button>
  );

  return (
    <div className="login-wrap">
      <canvas ref={canvasRef} className="login-canvas"/>
      <div style={{position:"relative",zIndex:1,width:"100%",maxWidth:420,display:"flex",flexDirection:"column",gap:12,padding:"0 16px"}}>

        {/* Demo info banner — only on login */}
        {mode==="login"&&(
          <div style={{background:"rgba(15,15,24,.75)",border:"1px solid var(--border)",borderRadius:12,padding:"14px 18px",backdropFilter:"blur(10px)",animation:"boxIn .6s cubic-bezier(.16,1,.3,1)"}}>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",color:"var(--accent)",marginBottom:5}}>Demo — PT Studio</div>
            <div style={{fontSize:13,color:"var(--muted)",lineHeight:1.6}}>
              Una piattaforma per personal trainer — gestisci atleti, crea schede di allenamento personalizzate ed esportale in PDF. Accedi con le credenziali demo per esplorare tutte le funzionalità.
            </div>
          </div>
        )}

        <div className="login-box" style={{margin:0}}>
          <div className="login-logo"><span>PT</span>Studio</div>

          {/* ── LOGIN ── */}
          {mode==="login"&&<>
            <div className="login-sub">Piattaforma per Personal Trainer</div>
            <div className="login-field">
              <label>Utente o email</label>
              <input className="login-input" type="text" placeholder="nome utente o email" value={user}
                onChange={e=>{setUser(e.target.value);setErr("");}}
                onKeyDown={e=>e.key==="Enter"&&submit()}/>
            </div>
            <div className="login-field">
              <label>Password</label>
              <input className="login-input" type="password" placeholder="••••••••" value={pass}
                onChange={e=>{setPass(e.target.value);setErr("");}}
                onKeyDown={e=>e.key==="Enter"&&submit()}/>
            </div>
            {err&&<div className="login-err">{err}</div>}
            <button className="login-btn" onClick={submit} disabled={loading}>
              {loading?"Accesso in corso…":"Accedi"}
            </button>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:14,flexWrap:"wrap",gap:8}}>
              {linkBtn(()=>{setMode("register");reset();},"Registrati →","var(--accent)")}
              {linkBtn(()=>{setMode("forgot");reset();},"Password dimenticata?")}
            </div>

            {/* Demo hints (invariato) */}
            <div className="login-hint">
              <div className="login-hint-block">
                <div className="login-hint-label">💪 Per accedere alla Demo 1, inserisci:</div>
                <div className="login-hint-creds">
                  <span className="login-hint-key">Utente:</span><span className="hint-badge">pt</span>
                  <span className="login-hint-key" style={{marginLeft:8}}>Password:</span><span className="hint-badge">pt</span>
                </div>
              </div>
              <details className="login-details">
                <summary>Altri accessi demo ▾</summary>
                <div className="login-details-inner">
                  <div className="login-hint-block" style={{borderColor:"rgba(164,127,254,.25)"}}>
                    <div className="login-hint-label" style={{color:"#a47ffe"}}>🟣 Demo 2 (FitPro)</div>
                    <div className="login-hint-creds">
                      <span className="login-hint-key">Utente:</span><span className="hint-badge">pt_pro</span>
                      <span className="login-hint-key" style={{marginLeft:8}}>Password:</span><span className="hint-badge">pt_pro</span>
                    </div>
                  </div>
                  <div className="login-hint-block">
                    <div className="login-hint-label">🛡️ Admin</div>
                    <div className="login-hint-creds">
                      <span className="login-hint-key">Utente:</span><span className="hint-badge">admin</span>
                      <span className="login-hint-key" style={{marginLeft:8}}>Password:</span><span className="hint-badge">admin</span>
                    </div>
                  </div>
                  <div className="login-hint-block" style={{borderColor:"rgba(71,255,232,.25)"}}>
                    <div className="login-hint-label" style={{color:"var(--accent2)"}}>👤 Atleta Demo</div>
                    <div className="login-hint-creds">
                      <span className="login-hint-key">Utente:</span><span className="hint-badge">atleta</span>
                      <span className="login-hint-key" style={{marginLeft:8}}>Password:</span><span className="hint-badge">atleta</span>
                    </div>
                  </div>
                </div>
              </details>
            </div>
          </>}

          {/* ── REGISTER ── */}
          {mode==="register"&&<>
            <div className="login-sub">Crea il tuo account PT</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
              <div className="login-field" style={{marginBottom:0}}>
                <label>Nome</label>
                <input className="login-input" type="text" placeholder="Marco" value={rNome}
                  onChange={e=>{setRNome(e.target.value);setErr("");}}/>
              </div>
              <div className="login-field" style={{marginBottom:0}}>
                <label>Cognome</label>
                <input className="login-input" type="text" placeholder="Rossi" value={rCognome}
                  onChange={e=>{setRCognome(e.target.value);setErr("");}}/>
              </div>
            </div>
            <div className="login-field">
              <label>Email</label>
              <input className="login-input" type="email" placeholder="marco@email.com" value={rEmail}
                onChange={e=>{setREmail(e.target.value);setErr("");}}/>
            </div>
            <div className="login-field">
              <label>Password</label>
              <input className="login-input" type="password" placeholder="min. 6 caratteri" value={rPass}
                onChange={e=>{setRPass(e.target.value);setErr("");}}/>
            </div>
            <div className="login-field">
              <label>Conferma password</label>
              <input className="login-input" type="password" placeholder="••••••••" value={rPass2}
                onChange={e=>{setRPass2(e.target.value);setErr("");}}
                onKeyDown={e=>e.key==="Enter"&&register()}/>
            </div>
            {err&&<div className="login-err">{err}</div>}
            <button className="login-btn" onClick={register} disabled={loading}>
              {loading?"Creazione account…":"Crea account"}
            </button>
            <div style={{textAlign:"center",marginTop:14}}>
              {linkBtn(goLogin,"← Torna al login")}
            </div>
          </>}

          {/* ── FORGOT PASSWORD ── */}
          {mode==="forgot"&&<>
            <div className="login-sub">Recupera la tua password</div>
            <div className="login-field">
              <label>La tua email</label>
              <input className="login-input" type="email" placeholder="marco@email.com" value={fEmail}
                onChange={e=>{setFEmail(e.target.value);setErr("");setFMsg("");}}
                onKeyDown={e=>e.key==="Enter"&&forgotPwd()}/>
            </div>
            {err&&<div className="login-err">{err}</div>}
            {fMsg
              ? <div style={{color:"var(--accent2)",fontSize:13,textAlign:"center",padding:"8px 0",lineHeight:1.6}}>{fMsg}</div>
              : <button className="login-btn" onClick={forgotPwd} disabled={loading}>
                  {loading?"Invio in corso…":"Invia email di recupero"}
                </button>
            }
            <div style={{textAlign:"center",marginTop:14}}>
              {linkBtn(goLogin,"← Torna al login")}
            </div>
          </>}

          {/* ── REGISTERED (success) ── */}
          {mode==="registered"&&(
            <div style={{textAlign:"center",padding:"8px 0 4px"}}>
              <div style={{fontSize:48,marginBottom:16}}>🎉</div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,letterSpacing:1.5,marginBottom:10}}>Account creato!</div>
              <div style={{fontSize:14,color:"var(--muted)",lineHeight:1.75,marginBottom:24}}>
                Il tuo account è in attesa di approvazione.<br/>
                Un amministratore ti darà accesso a breve.
              </div>
              <button className="btn-ghost" onClick={goLogin} style={{width:"100%",padding:11,fontSize:14}}>
                ← Torna al login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
