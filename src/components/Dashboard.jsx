import React from "react";
import { ADMIN_PT } from "../data.js";

export default function Dashboard({user,setView}) {
  const oggi=new Date().toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long"});

  if(user.role==="admin") {
    const adminStats=[
      {icon:"👥",val:String(ADMIN_PT.length),label:"PT attivi"},
      {icon:"📋",val:"39",                   label:"Schede totali create"},
      {icon:"🟢",val:"99.8%",                label:"Uptime sistema"},
      {icon:"✨",val:"2",                    label:"Nuovi PT questo mese"},
    ];
    const adminNav=[
      {id:"admin-stats",    icon:"📊",label:"Statistiche",  desc:"Grafici e metriche"},
      {id:"admin-pt",       icon:"👥",label:"I miei PT",    desc:"Gestisci i PT registrati"},
    ];
    return (
      <div>
        <div className="page-head">
          <div className="page-title">Pannello di Controllo 🛡️</div>
          <div className="page-sub" style={{textTransform:"capitalize"}}>{oggi}</div>
        </div>
        <div className="stats-grid">
          {adminStats.map((s,i)=>(
            <div className="stat-card" key={i} style={{animationDelay:`${i*.07}s`}}>
              <div className="stat-glow"/>
              <div className="stat-icon">{s.icon}</div>
              <div className="stat-val">{s.val}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{marginBottom:16}}><div className="page-sub" style={{fontSize:13,letterSpacing:1,textTransform:"uppercase",fontWeight:600}}>Vai a</div></div>
        <div className="quick-nav" style={{gridTemplateColumns:"1fr 1fr"}}>
          {adminNav.map((q,i)=>(
            <div className="quick-card" key={q.id} onClick={()=>setView(q.id)} style={{animationDelay:`${i*.07+.2}s`}}>
              <div className="quick-card-icon">{q.icon}</div>
              <div className="quick-card-label">{q.label}</div>
              <div className="quick-card-desc">{q.desc}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const stats=[
    {icon:"👥",val:"4",label:"Atleti attivi"},
    {icon:"📋",val:"6",label:"Schede create"},
    {icon:"📅",val:"Oggi 10:00",label:"Prossimo appuntamento"},
    {icon:"💪",val:"20",label:"Esercizi in libreria"},
  ];
  const quickNav=[
    {id:"library", icon:"📚",label:"Libreria",  desc:"Sfoglia 20 esercizi"},
    {id:"builder", icon:"📋",label:"Builder",   desc:"Crea schede"},
    {id:"atleti",  icon:"👥",label:"Atleti",    desc:"Gestisci i tuoi atleti"},
    {id:"calendar",icon:"📅",label:"Calendario",desc:"Organizza gli appuntamenti"},
  ];
  return (
    <div>
      <div className="page-head">
        <div className="page-title">Ciao, {user.name.split(" ")[0]} 👋</div>
        <div className="page-sub" style={{textTransform:"capitalize"}}>{oggi}</div>
      </div>
      <div className="stats-grid">
        {stats.map((s,i)=>(
          <div className="stat-card" key={i} style={{animationDelay:`${i*.07}s`}}>
            <div className="stat-glow"/>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-val">{s.val}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{marginBottom:16}}><div className="page-sub" style={{fontSize:13,letterSpacing:1,textTransform:"uppercase",fontWeight:600}}>Vai a</div></div>
      <div className="quick-nav">
        {quickNav.map((q,i)=>(
          <div className="quick-card" key={q.id} onClick={()=>setView(q.id)} style={{animationDelay:`${i*.07+.2}s`}}>
            <div className="quick-card-icon">{q.icon}</div>
            <div className="quick-card-label">{q.label}</div>
            <div className="quick-card-desc">{q.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
