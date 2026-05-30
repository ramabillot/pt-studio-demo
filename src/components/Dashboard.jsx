import React, { useState, useEffect } from "react";
import { ADMIN_PT } from "../data.js";
import { supabase } from "../supabase.js";

export default function Dashboard({user,setView}) {
  const oggi=new Date().toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long"});
  const [ptStats,setPtStats]=useState(null);

  useEffect(()=>{
    if(user.role!=="admin"||!user.isSupabase) return;
    supabase.from("profiles").select("id,is_approved,created_at").eq("is_admin",false)
      .then(({data:pts})=>{
        if(!pts) return;
        const som=new Date(); som.setDate(1); som.setHours(0,0,0,0);
        setPtStats({
          total:    pts.length,
          approved: pts.filter(p=>p.is_approved).length,
          pending:  pts.filter(p=>!p.is_approved).length,
          newMonth: pts.filter(p=>new Date(p.created_at)>=som).length,
        });
      });
  },[user]);

  if(user.role==="admin" || user.is_admin) {
    const adminStats = user.isSupabase && ptStats ? [
      {icon:"👥",val:String(ptStats.total),    label:"PT registrati"},
      {icon:"✅",val:String(ptStats.approved), label:"PT approvati"},
      {icon:"⏳",val:String(ptStats.pending),  label:"In attesa"},
      {icon:"✨",val:String(ptStats.newMonth), label:"Nuovi questo mese"},
    ] : !user.isSupabase ? [
      {icon:"👥",val:String(ADMIN_PT.length),label:"PT attivi"},
      {icon:"📋",val:"39",                   label:"Schede totali create"},
      {icon:"🟢",val:"99.8%",                label:"Uptime sistema"},
      {icon:"✨",val:"2",                    label:"Nuovi PT questo mese"},
    ] : [];
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

  const stats = user.isSupabase ? [
    {icon:"👥",val:"0",  label:"Atleti attivi"},
    {icon:"📋",val:"0",  label:"Schede create"},
    {icon:"📅",val:"—",  label:"Prossimo appuntamento"},
    {icon:"💪",val:"20", label:"Esercizi in libreria"},
  ] : [
    {icon:"👥",val:"4",         label:"Atleti attivi"},
    {icon:"📋",val:"6",         label:"Schede create"},
    {icon:"📅",val:"Oggi 10:00",label:"Prossimo appuntamento"},
    {icon:"💪",val:"20",        label:"Esercizi in libreria"},
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
        <div className="page-title">Ciao, {user.nome || (user.isSupabase ? user.email : user.name.split(" ")[0])} 👋</div>
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
