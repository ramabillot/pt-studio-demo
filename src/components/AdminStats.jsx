import React, { useState, useEffect } from "react";
import { supabase } from "../supabase.js";
import { MONTHS_IT } from "../data.js";
import { BackBtn } from "./Sidebar.jsx";

function LineChart({data, color="#e8ff47"}) {
  const W=300, H=100, pad=10;
  if (!data || data.length < 2) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",color:"var(--muted)",fontSize:12}}>
      Dati insufficienti
    </div>
  );
  const max = Math.max(...data.map(d=>d.v), 1);
  const pts = data.map((d,i)=>{
    const x = pad + (i/(data.length-1))*(W-pad*2);
    const y = H - pad - (d.v/max)*(H-pad*2);
    return `${x},${y}`;
  });
  const area = `M${pts[0]} ${pts.slice(1).map(p=>`L${p}`).join(" ")} L${W-pad},${H-pad} L${pad},${H-pad} Z`;
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
        const x = pad+(i/(data.length-1))*(W-pad*2);
        const y = H-pad-(d.v/max)*(H-pad*2);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r="3" fill={color}/>
            <text x={x} y={H-1} textAnchor="middle" fill="#5a5a78" fontSize="8">{d.l}</text>
          </g>
        );
      })}
    </svg>
  );
}

function BarChart({data, color="#47ffe8"}) {
  const W=300, H=100, pad=10;
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d=>d.v), 1);
  const bw = (W-pad*2)/data.length*0.6;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"100%"}}>
      {data.map((d,i)=>{
        const x = pad+(i/data.length)*(W-pad*2)+(W-pad*2)/data.length*0.2;
        const bh = (d.v/max)*(H-pad*2);
        const y = H-pad-bh;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={bh} rx="3" fill={color} opacity="0.7"/>
            <text x={x+bw/2} y={H-1} textAnchor="middle" fill="#5a5a78" fontSize="8">{d.l}</text>
            <text x={x+bw/2} y={y-3} textAnchor="middle" fill={color} fontSize="9" fontWeight="600">{d.v||""}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function AdminStats({setView}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    setLoading(true); setErr(null);
    const { data: pts, error } = await supabase
      .from("profiles")
      .select("id, is_approved, piano, created_at")
      .eq("is_admin", false);
    if (error) { setErr(error.message); setLoading(false); return; }

    const total    = pts.length;
    const approved = pts.filter(p => p.is_approved).length;
    const pending  = total - approved;

    // PT registrati — ultimi 6 mesi
    const now = new Date();
    const lineData = Array.from({length: 6}, (_, i) => {
      const from = new Date(now.getFullYear(), now.getMonth() - (5-i), 1);
      const to   = new Date(now.getFullYear(), now.getMonth() - (5-i) + 1, 1);
      const count = pts.filter(p => {
        const d = new Date(p.created_at);
        return d >= from && d < to;
      }).length;
      return { l: MONTHS_IT[from.getMonth()].slice(0,3), v: count };
    });

    // PT per piano
    const pianoData = ["base","medio","pro"].map(piano => ({
      l: piano.charAt(0).toUpperCase() + piano.slice(1),
      v: pts.filter(p => p.piano === piano).length,
    }));

    setData({ total, approved, pending, lineData, pianoData });
    setLoading(false);
  };

  const sysCards = data ? [
    { label:"PT totali",    val:String(data.total),    icon:"👥", sub:"registrati sulla piattaforma" },
    { label:"Approvati",    val:String(data.approved), icon:"✅", sub:"accesso attivo" },
    { label:"In attesa",    val:String(data.pending),  icon:"⏳", sub:"da approvare" },
    { label:"Versione",     val:"v1.2.0",              icon:"📦", sub:"ultimo deploy" },
  ] : [];

  return (
    <div>
      <BackBtn setView={setView}/>
      <div className="page-head">
        <div className="page-title">Statistiche</div>
        <div className="page-sub">Metriche e andamento della piattaforma</div>
      </div>

      {loading && (
        <div style={{color:"var(--muted)",fontSize:14,textAlign:"center",padding:"60px 0"}}>Caricamento…</div>
      )}
      {!loading && err && (
        <div style={{color:"var(--danger)",fontSize:14,textAlign:"center",padding:"60px 0"}}>Errore: {err}</div>
      )}

      {!loading && !err && data && (<>
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
          <div className="chart-card">
            <div className="chart-title">PT registrati — ultimi 6 mesi</div>
            <div className="chart-area"><LineChart data={data.lineData} color="#e8ff47"/></div>
          </div>
          <div className="chart-card">
            <div className="chart-title">PT per piano</div>
            <div className="chart-area"><BarChart data={data.pianoData} color="#47ffe8"/></div>
          </div>
        </div>
      </>)}
    </div>
  );
}
