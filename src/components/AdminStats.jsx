import React from "react";
import { ADMIN_PT } from "../data.js";
import { BackBtn } from "./Sidebar.jsx";

function LineChart({data,color="#e8ff47"}) {
  const W=300,H=100,pad=10;
  const max=Math.max(...data.map(d=>d.v),1);
  const pts=data.map((d,i)=>{ const x=pad+(i/(data.length-1))*(W-pad*2); const y=H-pad-(d.v/max)*(H-pad*2); return `${x},${y}`; });
  const area=`M${pts[0]} ${pts.slice(1).map(p=>`L${p}`).join(" ")} L${W-pad},${H-pad} L${pad},${H-pad} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"100%"}}>
      <defs>
        <linearGradient id="lg1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={area} fill="url(#lg1)"/>
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {data.map((d,i)=>{
        const x=pad+(i/(data.length-1))*(W-pad*2);
        const y=H-pad-(d.v/max)*(H-pad*2);
        return <g key={i}><circle cx={x} cy={y} r="3" fill={color}/><text x={x} y={H-1} textAnchor="middle" fill="#5a5a78" fontSize="8">{d.l}</text></g>;
      })}
    </svg>
  );
}

function BarChart({data,color="#47ffe8"}) {
  const W=300,H=100,pad=10;
  const max=Math.max(...data.map(d=>d.v),1);
  const bw=(W-pad*2)/data.length*0.6;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"100%"}}>
      {data.map((d,i)=>{
        const x=pad+(i/(data.length))*(W-pad*2)+(W-pad*2)/data.length*0.2;
        const bh=(d.v/max)*(H-pad*2);
        const y=H-pad-bh;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={bh} rx="3" fill={color} opacity="0.7"/>
            <text x={x+bw/2} y={H-1} textAnchor="middle" fill="#5a5a78" fontSize="8">{d.l}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function AdminStats({setView}) {
  const lineData=[{l:"Gen",v:1},{l:"Feb",v:2},{l:"Mar",v:2},{l:"Apr",v:3},{l:"Mag",v:4},{l:"Giu",v:5}];
  const barData=[{l:"Lun",v:3},{l:"Mar",v:7},{l:"Mer",v:5},{l:"Gio",v:9},{l:"Ven",v:6},{l:"Sab",v:2},{l:"Dom",v:1}];
  const actData=[{l:"28",v:2},{l:"29",v:4},{l:"30",v:3},{l:"31",v:5},{l:"1",v:4},{l:"2",v:3},{l:"3",v:5}];
  const sysCards=[
    {label:"Uptime",    val:"99.8%",      icon:"🟢", sub:"ultimi 30 giorni"},
    {label:"Versione",  val:"v1.2.0",      icon:"📦", sub:"ultimo deploy 2gg fa"},
    {label:"Ambiente",  val:"Production",  icon:"🚀", sub:"Vercel — EU West"},
    {label:"PT attivi", val:String(ADMIN_PT.length), icon:"👥", sub:"questo mese"},
  ];
  return (
    <div>
      <BackBtn setView={setView}/>
      <div className="page-head"><div className="page-title">Statistiche</div><div className="page-sub">Metriche e andamento della piattaforma</div></div>
      <div className="admin-banner">
        <span className="admin-badge">Admin</span>
        <div><div style={{fontSize:15,fontWeight:600}}>Stato sistema</div><div style={{fontSize:13,color:"var(--muted)",marginTop:2}}>Dati simulati — aggiornati in tempo reale</div></div>
      </div>
      <div className="stats-grid" style={{marginBottom:28}}>
        {sysCards.map((c,i)=>(
          <div className="stat-card" key={i} style={{animationDelay:`${i*.06}s`}}>
            <div className="stat-glow"/>
            <div className="stat-icon">{c.icon}</div>
            <div className="stat-val" style={{fontSize:24}}>{c.val}</div>
            <div className="stat-label">{c.label}</div>
            <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>{c.sub}</div>
          </div>
        ))}
      </div>
      <div className="charts-grid">
        <div className="chart-card"><div className="chart-title">PT Registrati — ultimi 6 mesi</div><div className="chart-area"><LineChart data={lineData} color="#e8ff47"/></div></div>
        <div className="chart-card"><div className="chart-title">Schede create — questa settimana</div><div className="chart-area"><BarChart data={barData} color="#47ffe8"/></div></div>
        <div className="chart-card"><div className="chart-title">Login giornalieri — ultimi 7 giorni</div><div className="chart-area"><BarChart data={actData} color="#ff47a3"/></div></div>
      </div>
    </div>
  );
}
