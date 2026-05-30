import React, { useState, useEffect } from "react";

export default function WelcomeScreen({user,onDone}) {
  const [leaving,setLeaving]=useState(false);
  useEffect(()=>{ const t=setTimeout(()=>{ setLeaving(true); setTimeout(onDone,500); },2600); return()=>clearTimeout(t); },[]);
  return (
    <div className={`welcome-screen${leaving?" leaving":""}`}>
      <div className="welcome-text">
        <div className="welcome-ciao">Bentornato</div>
        <div className="welcome-name"><span>{user.name.split(" ")[0]}</span> {user.name.split(" ").slice(1).join(" ")}</div>
      </div>
      <div className="lifter-wrap">
        <svg className="lifter-svg" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="60" cy="28" r="10" stroke="var(--accent)" strokeWidth="2.5"/>
          <line x1="60" y1="38" x2="60" y2="72" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="60" y1="72" x2="48" y2="95" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="60" y1="72" x2="72" y2="95" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round"/>
          <g className="arm-l"><line x1="60" y1="50" x2="36" y2="62" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round"/></g>
          <g className="arm-r"><line x1="60" y1="50" x2="84" y2="62" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round"/></g>
          <g className="bar-group">
            <line x1="24" y1="60" x2="96" y2="60" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round"/>
            <rect x="18" y="54" width="8" height="12" rx="2" fill="var(--accent)" opacity="0.7"/>
            <rect x="94" y="54" width="8" height="12" rx="2" fill="var(--accent)" opacity="0.7"/>
          </g>
        </svg>
      </div>
      <div className="welcome-dots">
        <div className="welcome-dot"/>
        <div className="welcome-dot"/>
        <div className="welcome-dot"/>
      </div>
    </div>
  );
}
