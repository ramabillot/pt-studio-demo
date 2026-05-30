import React from "react";
import { ADMIN_PT, CAT_COLORS } from "../data.js";
import { BackBtn } from "./Sidebar.jsx";

export default function AdminPT({setView}) {
  const topExercises=[
    {name:"Squat con bilanciere", uses:47, cat:"Gambe"  },
    {name:"Stacco da terra",      uses:38, cat:"Schiena"},
    {name:"Curl con bilanciere",  uses:34, cat:"Braccia"},
    {name:"Alzate laterali",      uses:29, cat:"Spalle" },
    {name:"Trazioni alla sbarra", uses:26, cat:"Schiena"},
  ];
  const maxUses=topExercises[0].uses;
  const feed=[
    {pt:"Andrea Rossi",   action:"ha creato una nuova scheda",  time:"2 min fa",    icon:"📋"},
    {pt:"Marta Savi",     action:"ha aggiunto un nuovo atleta",  time:"18 min fa",   icon:"👤"},
    {pt:"Giulia Moretti", action:"ha esportato un PDF",          time:"1 ora fa",    icon:"📄"},
    {pt:"Andrea Rossi",   action:"ha effettuato l'accesso",      time:"2 ore fa",    icon:"🔑"},
    {pt:"Paolo Crespi",   action:"ha creato una nuova scheda",   time:"ieri, 18:30", icon:"📋"},
    {pt:"Lorenzo De Luca",action:"ha aggiunto un nuovo atleta",  time:"ieri, 15:10", icon:"👤"},
  ];
  return (
    <div>
      <BackBtn setView={setView}/>
      <div className="page-head"><div className="page-title">I miei PT</div><div className="page-sub">Personal trainer registrati sulla piattaforma</div></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:20}}>
        <div className="chart-card">
          <div className="chart-title">Top 5 Esercizi più usati</div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {topExercises.map((ex,i)=>{
              const cc=CAT_COLORS[ex.cat]||"#e8ff47";
              const pct=Math.round((ex.uses/maxUses)*100);
              return (
                <div key={i}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                    <span style={{fontSize:13,color:"var(--text)",fontWeight:500}}>{ex.name}</span>
                    <span style={{fontSize:12,color:"var(--muted)"}}>{ex.uses} schede</span>
                  </div>
                  <div style={{height:5,background:"var(--border)",borderRadius:100,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${pct}%`,background:cc,borderRadius:100,transition:"width .6s ease"}}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="chart-card">
          <div className="chart-title">Attività recente</div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {feed.map((f,i)=>(
              <div key={i} style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                <div style={{width:32,height:32,borderRadius:8,background:"var(--card2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>{f.icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,color:"var(--text)",lineHeight:1.4}}><strong style={{color:"var(--accent)"}}>{f.pt}</strong> {f.action}</div>
                  <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>{f.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="pt-table">
        <div className="pt-table-head" style={{gridTemplateColumns:"2fr 1fr 1fr"}}>
          <div>Personal Trainer</div><div>Ultimo accesso</div><div>Schede create</div>
        </div>
        {ADMIN_PT.map((pt,i)=>(
          <div className="pt-table-row" key={i} style={{gridTemplateColumns:"2fr 1fr 1fr"}}>
            <div style={{fontWeight:600}}>{i<2&&<span className="online-dot"/>}{pt.name}</div>
            <div style={{color:"var(--muted)",fontSize:13}}>{pt.lastLogin}</div>
            <div><span className="badge badge2">{pt.schede}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}
