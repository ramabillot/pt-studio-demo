import { useState, useEffect } from "react";
import { EXERCISES } from "../data.js";
import { fmtDate } from "../utils.js";
import { supabase } from "../supabase.js";
import { useTranslation } from "react-i18next";
import { locale, maiuscola } from "../i18n/index.js";

export default function Dashboard({user,setView}) {
  const { t } = useTranslation();
  const oggi=maiuscola(new Date().toLocaleDateString(locale(),{weekday:"long",day:"numeric",month:"long"}));
  const [ptStats,setPtStats]=useState(null);
  const [trainerStats,setTrainerStats]=useState(null);

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

  useEffect(()=>{
    if(user.role==="admin") return;
    const uid=user.supabaseId;
    Promise.all([
      supabase.from("atleti").select("id",{count:"exact",head:true}).eq("pt_id",uid),
      supabase.from("schede").select("id",{count:"exact",head:true}).eq("pt_id",uid),
      supabase.from("appuntamenti").select("data,ora_inizio")
        .eq("pt_id",uid)
        .gte("data",fmtDate(new Date()))
        .order("data").order("ora_inizio").limit(1),
    ]).then(([atlRes,schedRes,apptRes])=>{
      const nextAppt=apptRes.data?.[0];
      let apptLabel=null;   // {oggi, ora} — il testo lo fa il render (segue la lingua)
      if(nextAppt){
        const d=new Date(nextAppt.data+"T12:00");
        const today=new Date(); today.setHours(0,0,0,0);
        apptLabel={oggi:d.toDateString()===today.toDateString(), ora:nextAppt.ora_inizio?.slice(0,5)||""};
      }
      setTrainerStats({atleti:atlRes.count??0, schede:schedRes.count??0, appt:apptLabel});
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

  const stats = [
    {icon:"👥",val:trainerStats?String(trainerStats.atleti):"…",label:t("dash.atletiAttivi")},
    {icon:"📋",val:trainerStats?String(trainerStats.schede):"…",label:t("dash.schedeCreate")},
    {icon:"📅",val:!trainerStats?"…":trainerStats.appt?`${trainerStats.appt.oggi?t("comune.oggi")+" ":""}${trainerStats.appt.ora}`:"—", label:t("dash.prossimoAppuntamento")},
    {icon:"💪",val:String(EXERCISES.length),                      label:t("dash.eserciziLibreria")},
  ];
  const quickNav=[
    {id:"library", icon:"📚",label:t("nav.libreria"),  desc:t("dash.descLibreria",{n:EXERCISES.length})},
    {id:"builder", icon:"📋",label:t("nav.builder"),   desc:t("dash.descBuilder")},
    {id:"atleti",  icon:"👥",label:t("nav.atleti"),    desc:t("dash.descAtleti")},
    {id:"calendar",icon:"📅",label:t("nav.calendario"),desc:t("dash.descCalendario")},
  ];
  return (
    <div>
      <div className="page-head">
        <div className="page-title">{t("dash.ciao",{nome:user.nome || user.email.split("@")[0]})} 👋</div>
        <div className="page-sub">{oggi}</div>
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
      <div style={{marginBottom:16}}><div className="page-sub" style={{fontSize:"0.8125rem",letterSpacing:1,textTransform:"uppercase",fontWeight:600}}>{t("dash.vaiA")}</div></div>
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
