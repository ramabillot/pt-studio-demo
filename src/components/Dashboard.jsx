import { useState, useEffect } from "react";
import { supabase } from "../supabase.js";
import { useTranslation } from "react-i18next";
import { locale, maiuscola } from "../i18n/index.js";
import HomePT from "./HomePT.jsx";

export default function Dashboard({user,setView,apriAtleta}) {
  const { t } = useTranslation();
  const oggi=maiuscola(new Date().toLocaleDateString(locale(),{weekday:"long",day:"numeric",month:"long"}));
  const [ptStats,setPtStats]=useState(null);

  useEffect(()=>{
    if(user.role!=="admin") return;
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
    const adminStats = ptStats ? [
      {icon:"👥",val:String(ptStats.total),    label:t("dash.ptRegistrati")},
      {icon:"✅",val:String(ptStats.approved), label:t("dash.ptApprovati")},
      {icon:"⏳",val:String(ptStats.pending),  label:t("dash.inAttesa")},
      {icon:"✨",val:String(ptStats.newMonth), label:t("dash.nuoviMese")},
    ] : [];
    const adminNav=[
      {id:"admin-stats",    icon:"📊",label:t("nav.statistiche"),  desc:t("dash.descStatistiche")},
      {id:"admin-pt",       icon:"👥",label:t("nav.mieiPT"),    desc:t("dash.descMieiPT")},
    ];
    return (
      <div>
        <div className="page-head">
          <div className="page-title">{t("dash.pannello")} 🛡️</div>
          <div className="page-sub">{oggi}</div>
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
        <div style={{marginBottom:16}}><div className="page-sub" style={{fontSize:"0.8125rem",letterSpacing:1,textTransform:"uppercase",fontWeight:600}}>{t("dash.vaiA")}</div></div>
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

  // PT: Home = feed della settimana (Lato PT 2.0). Tolti i numeri e le card "Vai a" che ripetevano il menu.
  return <HomePT user={user} apriAtleta={apriAtleta||(()=>setView("atleti"))}/>;
}
