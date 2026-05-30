import React, { useState, useEffect, useRef } from "react";
import { ACCOUNTS } from "../data.js";

export default function LoginScreen({onLogin}) {
  const [user,setUser]=useState("");
  const [pass,setPass]=useState("");
  const [err,setErr]=useState("");
  const canvasRef=useRef(null);

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

  const submit=()=>{
    const acc=ACCOUNTS[user.toLowerCase().trim()];
    if(!acc||acc.password!==pass){ setErr("Utente o password non corretti"); return; }
    onLogin({username:user.toLowerCase().trim(),...acc});
  };

  return (
    <div className="login-wrap">
      <canvas ref={canvasRef} className="login-canvas"/>
      <div style={{position:"relative",zIndex:1,width:"100%",maxWidth:420,display:"flex",flexDirection:"column",gap:12,padding:"0 16px"}}>
        <div style={{background:"rgba(15,15,24,.75)",border:"1px solid var(--border)",borderRadius:12,padding:"14px 18px",backdropFilter:"blur(10px)",animation:"boxIn .6s cubic-bezier(.16,1,.3,1)"}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",color:"var(--accent)",marginBottom:5}}>Demo — PT Studio</div>
          <div style={{fontSize:13,color:"var(--muted)",lineHeight:1.6}}>
            Una piattaforma per personal trainer — gestisci atleti, crea schede di allenamento personalizzate ed esportale in PDF. Accedi con le credenziali demo per esplorare tutte le funzionalità.
          </div>
        </div>
        <div className="login-box" style={{margin:0}}>
          <div className="login-logo"><span>PT</span>Studio</div>
          <div className="login-sub">Piattaforma per Personal Trainer</div>
          <div className="login-field">
            <label>Utente</label>
            <input className="login-input" type="text" placeholder="nome utente" value={user} onChange={e=>{setUser(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&submit()}/>
          </div>
          <div className="login-field">
            <label>Password</label>
            <input className="login-input" type="password" placeholder="••••••••" value={pass} onChange={e=>{setPass(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&submit()}/>
          </div>
          {err && <div className="login-err">{err}</div>}
          <button className="login-btn" onClick={submit}>Accedi</button>

          <div className="login-hint">
            <div className="login-hint-block">
              <div className="login-hint-label">💪 Per accedere alla Demo 1, inserisci:</div>
              <div className="login-hint-creds">
                <span className="login-hint-key">Utente:</span>
                <span className="hint-badge">pt</span>
                <span className="login-hint-key" style={{marginLeft:8}}>Password:</span>
                <span className="hint-badge">pt</span>
              </div>
            </div>

            <details className="login-details">
              <summary>Altri accessi demo ▾</summary>
              <div className="login-details-inner">
                <div className="login-hint-block" style={{borderColor:"rgba(164,127,254,.25)"}}>
                  <div className="login-hint-label" style={{color:"#a47ffe"}}>🟣 Per accedere alla Demo 2 (FitPro), inserisci:</div>
                  <div className="login-hint-creds">
                    <span className="login-hint-key">Utente:</span>
                    <span className="hint-badge">pt_pro</span>
                    <span className="login-hint-key" style={{marginLeft:8}}>Password:</span>
                    <span className="hint-badge">pt_pro</span>
                  </div>
                </div>
                <div className="login-hint-block">
                  <div className="login-hint-label">🛡️ Per accedere come Admin, inserisci:</div>
                  <div className="login-hint-creds">
                    <span className="login-hint-key">Utente:</span>
                    <span className="hint-badge">admin</span>
                    <span className="login-hint-key" style={{marginLeft:8}}>Password:</span>
                    <span className="hint-badge">admin</span>
                  </div>
                </div>
                <div className="login-hint-block" style={{borderColor:"rgba(71,255,232,.25)"}}>
                  <div className="login-hint-label" style={{color:"var(--accent2)"}}>👤 Per accedere come Atleta Demo, inserisci:</div>
                  <div className="login-hint-creds">
                    <span className="login-hint-key">Utente:</span>
                    <span className="hint-badge">atleta</span>
                    <span className="login-hint-key" style={{marginLeft:8}}>Password:</span>
                    <span className="hint-badge">atleta</span>
                  </div>
                </div>
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
