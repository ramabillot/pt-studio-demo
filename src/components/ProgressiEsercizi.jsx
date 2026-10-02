// ── Grafico progressi esercizi (usato lato atleta e lato PT) ──────────────────
// Metrica: peso massimo (default) o volume. Toccando un punto si vedono tutte le
// serie di quel giorno. Funziona anche per gli esercizi custom (chiave = nome).
import { useState } from "react";
import { LINE_COLORS } from "../data.js";
import { fmtDateShort } from "../utils.js";
import { serieDiSessione, METRICHE } from "../lib/allenamento.js";

export function ProgressiMultiChart({lines, onPointClick, selected}) {
  const W=560,H=190,padL=38,padR=14,padT=10,padB=26;
  const cW=W-padL-padR, cH=H-padT-padB;

  const allDates=[...new Set(lines.flatMap(l=>l.points.map(p=>p.date)))].sort();
  const n=allDates.length;
  if(n===0) return null;
  const allKg=lines.flatMap(l=>l.points.map(p=>p.kg)).filter(k=>k>0);
  if(!allKg.length) return null;

  const rawMin=Math.min(...allKg), rawMax=Math.max(...allKg);
  const pad=Math.max((rawMax-rawMin)*0.15, 5);
  const minV=Math.max(0,Math.floor(rawMin-pad));
  const maxV=Math.ceil(rawMax+pad);
  const range=maxV-minV||1;
  const xOf=(i)=>padL+(n>1?i/(n-1):0.5)*cW;
  const yOf=(kg)=>padT+cH-((kg-minV)/range)*cH;
  const gridVals=Array.from({length:4},(_,i)=>Math.round(minV+(i/3)*range));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"auto",display:"block"}}>
      {gridVals.map((v,i)=>(
        <g key={i}>
          <line x1={padL} y1={yOf(v)} x2={W-padR} y2={yOf(v)} stroke="#22223a" strokeWidth="1" strokeDasharray="5,4"/>
          <text x={padL-4} y={yOf(v)+4} textAnchor="end" fill="#5a5a78" fontSize="10">{v}</text>
        </g>
      ))}
      {allDates.map((d,i)=>(
        <text key={i} x={xOf(i)} y={H-5} textAnchor="middle" fill="#5a5a78" fontSize="9">{d.slice(8)}/{d.slice(5,7)}</text>
      ))}
      {lines.map(line=>{
        const pts=allDates.map((d,i)=>{const p=line.points.find(p=>p.date===d);return p?{i,kg:p.kg,date:d}:null;}).filter(Boolean);
        if(pts.length<1) return null;
        const ptStr=pts.map(p=>`${xOf(p.i)},${yOf(p.kg)}`).join(" ");
        return (
          <g key={line.id}>
            {pts.length>1&&<polyline points={ptStr} fill="none" stroke={line.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>}
            {pts.map((p,j)=>{
              const sel=selected&&selected.id===line.id&&selected.date===p.date;
              return (
                <g key={j} onClick={onPointClick?()=>onPointClick(line.id,p.date):undefined} style={{cursor:onPointClick?"pointer":"default"}}>
                  {onPointClick&&<circle cx={xOf(p.i)} cy={yOf(p.kg)} r="14" fill="transparent"/>}
                  <circle cx={xOf(p.i)} cy={yOf(p.kg)} r={sel?6:4} fill={line.color} stroke={sel?"#fff":"#07070d"} strokeWidth={sel?2:1.5}/>
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

// sessioni: [{ data, sessione_serie:[...] }]  ·  ordine: nomi esercizi da mostrare per primi (es. quelli della scheda)
export default function ProgressiEsercizi({sessioni, ordine=[], vuoto="Nessun allenamento registrato ancora."}) {
  const [metrica,setMetrica]=useState("max");
  const [sel,setSel]=useState(null);       // nomi selezionati (null = default)
  const [punto,setPunto]=useState(null);   // {id,date}

  // nome esercizio → [{date, serie, nota}]
  const perEsercizio={};
  (sessioni||[]).forEach(s=>{
    Object.values(serieDiSessione(s)).forEach(e=>{
      (perEsercizio[e.nome]=perEsercizio[e.nome]||[]).push({date:s.data, serie:e.serie, nota:e.nota});
    });
  });
  const conDati=Object.keys(perEsercizio).filter(nome=>perEsercizio[nome].some(x=>METRICHE.max.calcola(x.serie)!=null));
  const nomi=[...ordine.filter(n=>conDati.includes(n)), ...conDati.filter(n=>!ordine.includes(n)).sort()];
  if(!nomi.length) return <div style={{color:"var(--muted)",fontSize:13,padding:"8px 0"}}>{vuoto}</div>;

  const colore=Object.fromEntries(nomi.map((n,i)=>[n,LINE_COLORS[i%LINE_COLORS.length]]));
  const attivi=sel??nomi.slice(0,1);
  const M=METRICHE[metrica];
  const lines=attivi.filter(n=>nomi.includes(n)).map(n=>({
    id:n, name:n, color:colore[n],
    points:perEsercizio[n].map(x=>({date:x.date,kg:M.calcola(x.serie)})).filter(p=>p.kg!=null).sort((a,b)=>a.date.localeCompare(b.date)),
  }));
  const toggle=n=>{ setPunto(null); setSel(attivi.includes(n)?attivi.filter(x=>x!==n):[...attivi,n]); };
  const dettaglio=punto&&perEsercizio[punto.id]?.find(x=>x.date===punto.date);
  const ultimo=lines.length===1&&lines[0].points.length?lines[0].points[lines[0].points.length-1]:null;

  return (
    <div>
      <div style={{display:"flex",gap:6,marginBottom:12}}>
        {Object.entries(METRICHE).map(([k,m])=>(
          <button key={k} className={`prog-chip unlocked${metrica===k?" selected":""}`}
            style={metrica===k?{background:"rgba(232,255,71,.1)",borderColor:"var(--accent)",color:"var(--accent)"}:{}}
            onClick={()=>{setMetrica(k);setPunto(null);}}>{m.label}</button>
        ))}
      </div>
      <div className="prog-chips">
        {nomi.map(n=>{
          const on=attivi.includes(n), cc=colore[n];
          return (
            <button key={n} className={`prog-chip unlocked${on?" selected":""}`}
              style={on?{background:`${cc}1a`,borderColor:cc,color:cc}:{}} onClick={()=>toggle(n)}>
              {n.length>22?n.slice(0,22)+"…":n}
            </button>
          );
        })}
      </div>
      {lines.length===0?(
        <div className="prog-empty"><div className="prog-empty-icon">📈</div>Seleziona un esercizio</div>
      ):(
        <>
          {ultimo&&<div style={{fontSize:12,color:"var(--muted)",marginBottom:6}}>{M.label} ultimo allenamento: <strong style={{color:"var(--text)"}}>{String(ultimo.kg).replace(".",",")} {M.unita}</strong></div>}
          <div className="prog-chart-box">
            <ProgressiMultiChart lines={lines} selected={punto} onPointClick={(id,date)=>setPunto(punto&&punto.id===id&&punto.date===date?null:{id,date})}/>
          </div>
          {lines.some(l=>l.points.length<2)&&<div style={{fontSize:11,color:"var(--muted)",marginTop:6}}>La linea compare dal secondo allenamento con l'esercizio.</div>}
          {dettaglio?(
            <div style={{marginTop:10,padding:"10px 14px",background:"var(--card2)",border:"1px solid var(--border)",borderRadius:10,fontSize:13}}>
              <div style={{fontWeight:700,color:"var(--text)",marginBottom:4}}>{punto.id} · <span style={{textTransform:"capitalize"}}>{fmtDateShort(punto.date)}</span></div>
              <div style={{color:"var(--muted)"}}>{dettaglio.serie.map((s,i)=><span key={i} style={{marginRight:10,whiteSpace:"nowrap"}}>S{i+1}: <strong style={{color:"var(--text)"}}>{s.peso!=null?`${String(s.peso).replace(".",",")} kg`:"—"}{s.reps!=null?` × ${s.reps}`:""}</strong></span>)}</div>
              {dettaglio.nota&&<div style={{marginTop:6,color:"var(--text)"}}>📝 {dettaglio.nota}</div>}
            </div>
          ):(
            <div style={{fontSize:11,color:"var(--muted)",marginTop:6}}>Tocca un punto per vedere tutte le serie di quel giorno.</div>
          )}
        </>
      )}
    </div>
  );
}
