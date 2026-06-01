import React, { useState, useEffect, useRef } from "react";
import { EXERCISES, CAT_COLORS, EX_IMAGES, LINE_COLORS, MISURE_FIELDS } from "../data.js";
import {
  fmtDate, fmtDateShort, fmtDateLong, addDays, today,
  loadSessions, saveSessions, loadMisure, saveMisure,
  buildPDF, getFakeExercises, countSessionsPerEx, DEMO_MISURE_0, FAKE_SESSIONS,
} from "../utils.js";
import { supabase } from "../supabase.js";
import ResetDemoDialog from "./ResetDemoDialog.jsx";
import { VideoModal } from "./Library.jsx";
import { typeColor, typeBg } from "./Calendar.jsx";

// ── Multi-line progress chart ─────────────────────────────────────────────────
function ProgressiMultiChart({lines}) {
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
        <text key={i} x={xOf(i)} y={H-5} textAnchor="middle" fill="#5a5a78" fontSize="9">
          {d.slice(8)}/{d.slice(5,7)}
        </text>
      ))}
      {lines.map(line=>{
        const pts=allDates
          .map((d,i)=>{const p=line.points.find(p=>p.date===d);return p?{i,kg:p.kg}:null;})
          .filter(Boolean);
        if(pts.length<1) return null;
        const ptStr=pts.map(p=>`${xOf(p.i)},${yOf(p.kg)}`).join(" ");
        return (
          <g key={line.id}>
            {pts.length>1&&<polyline points={ptStr} fill="none" stroke={line.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>}
            {pts.map((p,j)=>(
              <circle key={j} cx={xOf(p.i)} cy={yOf(p.kg)} r="4" fill={line.color} stroke="#07070d" strokeWidth="1.5"/>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

// ── Misure section ────────────────────────────────────────────────────────────
export function MisureSection({atletaId, readOnly=false, externalMisure=null, ptId=null, supabaseAtletaId=null}) {
  const todayStr = fmtDate(new Date());
  const [misure, setMisure] = useState(()=>
    externalMisure!==null ? externalMisure :
    supabaseAtletaId ? [] :
    loadMisure(atletaId)
  );
  const [form, setForm] = useState({
    data:todayStr, peso:"", vita:"", fianchi:"", petto:"", braccio:"", grassoPerc:"", fcRiposo:""
  });
  const [showAvanzati, setShowAvanzati] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [selMisure, setSelMisure] = useState([]);
  useEffect(()=>{ if(externalMisure!==null) setMisure(externalMisure); },[externalMisure]);

  // Load from Supabase when PT views an athlete's misurazioni
  useEffect(()=>{
    if(!supabaseAtletaId) return;
    supabase.from("misurazioni")
      .select("*")
      .eq("atleta_id", supabaseAtletaId)
      .order("data")
      .then(({data, error})=>{
        console.log("[misurazioni load] atleta_id:", supabaseAtletaId, "| rows:", data?.length, "| error:", error);
        setMisure((data||[]).map(r=>({
          dbId: r.id,
          data: r.data,
          peso: r.peso_kg!=null ? String(r.peso_kg) : "",
          vita: r.vita_cm!=null ? String(r.vita_cm) : "",
          fianchi: r.fianchi_cm!=null ? String(r.fianchi_cm) : "",
          petto: r.petto_cm!=null ? String(r.petto_cm) : "",
          braccio: r.braccio_cm!=null ? String(r.braccio_cm) : "",
          grassoPerc: r.grasso_percent!=null ? String(r.grasso_percent) : "",
          fcRiposo: r.fc_riposo!=null ? String(r.fc_riposo) : "",
        })));
      });
  },[supabaseAtletaId]);

  const handleSave = async () => {
    if(!form.peso && !form.vita) return;
    if(supabaseAtletaId){
      const existing = misure.find(m=>m.data===form.data);
      console.log("[misurazioni save] atleta_id:", supabaseAtletaId, "| pt_id:", ptId, "| data:", form.data, "| existing:", existing?.dbId||null);
      const payload = {
        peso_kg: form.peso ? parseFloat(form.peso) : null,
        vita_cm: form.vita ? parseFloat(form.vita) : null,
        fianchi_cm: form.fianchi ? parseFloat(form.fianchi) : null,
        petto_cm: form.petto ? parseFloat(form.petto) : null,
        braccio_cm: form.braccio ? parseFloat(form.braccio) : null,
        grasso_percent: form.grassoPerc ? parseFloat(form.grassoPerc) : null,
        fc_riposo: form.fcRiposo ? parseInt(form.fcRiposo) : null,
      };
      if(existing?.dbId){
        const {error}=await supabase.from("misurazioni").update(payload).eq("id",existing.dbId);
        if(!error) setMisure(prev=>prev.map(m=>m.data===form.data?{...m,...form}:m));
      } else {
        const {data,error}=await supabase.from("misurazioni").insert({
          ...payload, pt_id:ptId, atleta_id:supabaseAtletaId, data:form.data,
        }).select().single();
        if(!error&&data){
          const newEntry={...form, dbId:data.id};
          setMisure(prev=>[...prev.filter(m=>m.data!==form.data),newEntry].sort((a,b)=>a.data.localeCompare(b.data)));
        }
      }
    } else {
      const newEntry = {...form};
      const updated = [...misure.filter(m=>m.data!==form.data), newEntry]
        .sort((a,b)=>a.data.localeCompare(b.data));
      setMisure(updated);
      saveMisure(atletaId, updated);
    }
    setForm({data:todayStr, peso:"", vita:"", fianchi:"", petto:"", braccio:"", grassoPerc:"", fcRiposo:""});
    setShowAvanzati(false);
  };

  const handleDelete = async (idx) => {
    if(supabaseAtletaId){
      const entry=misure[idx];
      if(entry?.dbId){
        const {error}=await supabase.from("misurazioni").delete().eq("id",entry.dbId);
        if(error){ console.error("[misurazioni delete]",error); setDeleteConfirm(null); return; }
      }
      setMisure(prev=>prev.filter((_,i)=>i!==idx));
    } else {
      const updated = misure.filter((_,i)=>i!==idx);
      setMisure(updated);
      saveMisure(atletaId, updated);
    }
    setDeleteConfirm(null);
  };

  const toggleMisura = (key) => {
    setSelMisure(prev=>prev.includes(key)?prev.filter(k=>k!==key):[...prev,key]);
  };

  const activeMisureKeys = MISURE_FIELDS
    .filter(f=>misure.filter(m=>m[f.key]&&+m[f.key]>0).length>=2)
    .map(f=>f.key);

  const chartLines = MISURE_FIELDS
    .filter(f=>selMisure.includes(f.key)&&activeMisureKeys.includes(f.key))
    .map((f,i)=>({
      id:f.key, name:`${f.emoji} ${f.label}`,
      color:LINE_COLORS[i%LINE_COLORS.length],
      points:misure
        .filter(m=>m[f.key]&&+m[f.key]>0)
        .map(m=>({date:m.data,kg:+m[f.key]}))
    }));

  const lastMisura = misure.length > 0 ? misure[misure.length-1] : null;

  return (
    <div>
      {lastMisura&&(
        <div style={{fontSize:12,color:"var(--muted)",marginBottom:12}}>
          Ultima misurazione: <strong style={{color:"var(--text)"}}>
            {new Date(lastMisura.data+"T12:00").toLocaleDateString("it-IT",{day:"numeric",month:"short",year:"numeric"})}
          </strong>
        </div>
      )}
      {!readOnly&&(
        <div style={{background:"var(--card2)",border:"1px solid var(--border)",borderRadius:10,padding:"14px 16px",marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:"var(--muted)",marginBottom:10}}>Nuova misurazione</div>
          <div className="form-row" style={{marginBottom:10}}>
            <label className="field-label">Data<input className="field-input" type="date" value={form.data} onChange={e=>setForm(p=>({...p,data:e.target.value}))}/></label>
          </div>
          <div className="form-row" style={{marginBottom:10}}>
            <label className="field-label">Peso (kg)<input className="field-input" type="number" min={0} max={300} step={0.1} placeholder="78.5" value={form.peso} onChange={e=>setForm(p=>({...p,peso:e.target.value}))}/></label>
            <label className="field-label">Vita (cm)<input className="field-input" type="number" min={0} max={200} placeholder="82" value={form.vita} onChange={e=>setForm(p=>({...p,vita:e.target.value}))}/></label>
          </div>
          <button className="btn-ghost" style={{fontSize:11,padding:"5px 12px",marginBottom:showAvanzati?8:0}} onClick={()=>setShowAvanzati(v=>!v)}>
            {showAvanzati?"▲ Nascondi avanzati":"➕ Dati avanzati"}
          </button>
          {showAvanzati&&(
            <div className="misure-avanzati">
              <div className="form-row">
                <label className="field-label">Fianchi (cm)<input className="field-input" type="number" min={0} max={200} placeholder="96" value={form.fianchi} onChange={e=>setForm(p=>({...p,fianchi:e.target.value}))}/></label>
                <label className="field-label">Petto (cm)<input className="field-input" type="number" min={0} max={200} placeholder="100" value={form.petto} onChange={e=>setForm(p=>({...p,petto:e.target.value}))}/></label>
              </div>
              <div className="form-row">
                <label className="field-label">Braccio (cm)<input className="field-input" type="number" min={0} max={100} placeholder="36" value={form.braccio} onChange={e=>setForm(p=>({...p,braccio:e.target.value}))}/></label>
                <label className="field-label">FC Riposo (bpm)<input className="field-input" type="number" min={30} max={200} placeholder="65" value={form.fcRiposo} onChange={e=>setForm(p=>({...p,fcRiposo:e.target.value}))}/></label>
              </div>
              <label className="field-label">% Massa grassa<input className="field-input" type="number" min={0} max={70} step={0.1} placeholder="18.5" value={form.grassoPerc} onChange={e=>setForm(p=>({...p,grassoPerc:e.target.value}))}/></label>
            </div>
          )}
          <button className="btn-primary" style={{marginTop:10,width:"100%"}} onClick={handleSave}>Salva misurazione</button>
        </div>
      )}

      {misure.length===0?(
        <div style={{color:"var(--muted)",fontSize:13,padding:"8px 0"}}>
          {readOnly?"Il tuo PT non ha ancora registrato misurazioni":"Nessuna misurazione registrata ancora."}
        </div>
      ):(
        <>
          {[...misure].reverse().slice(0, expanded?999:3).map((m,i)=>{
            const realIdx = misure.length-1-i;
            const badges = MISURE_FIELDS.filter(f=>m[f.key]&&+m[f.key]>0);
            return (
              <div key={m.data+i}>
                <div className="misure-entry">
                  <span className="misure-date">{fmtDateShort(m.data)}</span>
                  {badges.map(f=>(
                    <span key={f.key} className="misura-badge">{f.emoji} {f.label} {m[f.key]} {f.unit}</span>
                  ))}
                  <div style={{flex:1}}/>
                  {!readOnly&&(
                    <button className="day-event-btn" onClick={()=>setDeleteConfirm(deleteConfirm===realIdx?null:realIdx)}>🗑️</button>
                  )}
                </div>
                {deleteConfirm===realIdx&&(
                  <div className="day-delete-confirm" style={{marginBottom:7}}>
                    <span style={{fontSize:13,color:"var(--text)"}}>Eliminare questa misurazione?</span>
                    <div style={{display:"flex",gap:8}}>
                      <button className="btn-ghost" style={{padding:"5px 12px",fontSize:12}} onClick={()=>setDeleteConfirm(null)}>Annulla</button>
                      <button className="btn-danger" onClick={()=>handleDelete(realIdx)}>Elimina</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {misure.length>3&&(
            <button className="appt-expand-btn" onClick={()=>setExpanded(v=>!v)}>
              {expanded?"Mostra meno ▲":`Vedi tutte (${misure.length}) ▼`}
            </button>
          )}
        </>
      )}

      {misure.length<2?(
        <div style={{color:"var(--muted)",fontSize:13,marginTop:12,padding:"10px 0",textAlign:"center"}}>
          {misure.length===0?"":readOnly?"":"Aggiungi almeno 2 misurazioni per vedere il grafico"}
        </div>
      ):(
        <div style={{marginTop:14}}>
          <div className="prog-chips" style={{marginBottom:8}}>
            {MISURE_FIELDS.filter(f=>activeMisureKeys.includes(f.key)).map((f,i)=>{
              const sel=selMisure.includes(f.key);
              const cc=LINE_COLORS[i%LINE_COLORS.length];
              return (
                <button key={f.key}
                  className={`prog-chip unlocked${sel?" selected":""}`}
                  style={sel?{background:`${cc}1a`,borderColor:cc,color:cc}:{}}
                  onClick={()=>toggleMisura(f.key)}
                >{f.emoji} {f.label}</button>
              );
            })}
          </div>
          {chartLines.length===0?(
            <div style={{color:"var(--muted)",fontSize:13,textAlign:"center",padding:"8px 0"}}>
              Seleziona una metrica per vedere il grafico
            </div>
          ):(
            <>
              <div className="prog-legend">
                {chartLines.map(l=>(
                  <div key={l.id} className="prog-legend-item">
                    <div style={{width:8,height:8,borderRadius:"50%",background:l.color,flexShrink:0}}/>
                    <span>{l.name}</span>
                  </div>
                ))}
              </div>
              <div className="prog-chart-box"><ProgressiMultiChart lines={chartLines}/></div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Atleta exercise card ──────────────────────────────────────────────────────
function AtletaExCard({ex, peso, onPesoChange}) {
  const [imgOk, setImgOk] = useState(true);
  const [showVideo, setShowVideo] = useState(false);
  const cc = CAT_COLORS[ex.cat] || "#e8ff47";
  const slug = EX_IMAGES[ex.id];
  const exFull = EXERCISES.find(e => e.id === ex.id);

  return (
    <>
      <div className="ex-atleta-card">
        {imgOk && slug
          ? <img
              className="ex-atleta-thumb"
              src={`/exercises-custom/${slug}.jpg`}
              alt={ex.name}
              onError={()=>setImgOk(false)}
            />
          : <div className="ex-atleta-thumb-ph">💪</div>
        }
        <div className="ex-atleta-body">
          <div className="ex-atleta-top">
            <span className="ex-cat" style={{color:cc,background:`${cc}16`}}>{ex.cat}</span>
            <div className="ex-peso-wrap">
              <input
                className="ex-peso-input"
                type="number"
                min={0}
                max={999}
                placeholder="0"
                value={peso||""}
                onChange={e=>onPesoChange(e.target.value)}
              />
              <span className="ex-peso-unit">kg</span>
            </div>
          </div>
          <div className="ex-cliente-name">{ex.name}</div>
          <div className="ex-cliente-meta">{ex.sets} serie × {ex.reps} rip · recupero {ex.rest}s</div>
          {exFull?.yt&&(
            <button className="video-btn" style={{marginTop:10}} onClick={()=>setShowVideo(true)}>
              <span className="play-icon">▶</span>Guarda il video
            </button>
          )}
        </div>
      </div>
      {showVideo&&exFull&&<VideoModal ex={exFull} onClose={()=>setShowVideo(false)}/>}
    </>
  );
}

// ── Progressi section (PT modal) ──────────────────────────────────────────────
export function ProgressiSectionPT({atleta, user}) {
  const [selIds,setSelIds]=useState(null);
  const [supaSessions,setSupaSessions]=useState(null); // null = loading

  useEffect(()=>{
    if(!user?.isSupabase) return;
    setSupaSessions(null);
    supabase.from("sessioni")
      .select("data, sessione_serie(nome_esercizio, peso)")
      .eq("atleta_id", atleta.id)
      .order("data")
      .then(({data,error})=>{
        if(error){ console.error("[progressi PT]",error); setSupaSessions([]); return; }
        setSupaSessions(data||[]);
      });
  },[atleta.id, user?.isSupabase]);

  if(user?.isSupabase && supaSessions===null)
    return <div style={{color:"var(--muted)",fontSize:13,padding:"8px 0"}}>Caricamento sessioni…</div>;

  if(!user?.isSupabase && (atleta.id===2||atleta.id===4)) {
    return (
      <div style={{color:"var(--muted)",fontSize:13,padding:"8px 0",lineHeight:1.6}}>
        Dati insufficienti — servono almeno 3 sessioni per visualizzare i progressi.
      </div>
    );
  }

  let sessions, exercises;
  if(user?.isSupabase) {
    sessions=(supaSessions||[]).map(s=>({
      date:s.data,
      weights:Object.fromEntries(
        (s.sessione_serie||[])
          .map(sr=>{ const ex=EXERCISES.find(e=>e.name===sr.nome_esercizio); return ex?[ex.id,String(sr.peso||0)]:null; })
          .filter(Boolean)
      )
    }));
    const exIds=[...new Set(sessions.flatMap(s=>Object.keys(s.weights).map(Number)))];
    exercises=exIds.map(id=>EXERCISES.find(e=>e.id===id)).filter(Boolean);
  } else {
    sessions=atleta.isDemoAtleta?loadSessions():(FAKE_SESSIONS[atleta.id]||[]);
    exercises=atleta.isDemoAtleta
      ?[...new Set(sessions.flatMap(s=>Object.keys(s.weights||{}).map(Number)))]
          .map(id=>EXERCISES.find(e=>e.id===id)).filter(Boolean)
      :getFakeExercises(atleta.id);
  }

  if(!sessions.length||!exercises.length) {
    return <div style={{color:"var(--muted)",fontSize:13}}>Nessuna sessione registrata ancora.</div>;
  }

  const counts=countSessionsPerEx(sessions);
  const unlockedIds=exercises.filter(ex=>(counts[ex.id]||0)>=3).map(ex=>ex.id);

  if(!unlockedIds.length) {
    return <div style={{color:"var(--muted)",fontSize:13}}>Dati insufficienti — servono almeno 3 sessioni per esercizio.</div>;
  }

  const colorMap = Object.fromEntries(exercises.map((ex,i)=>[ex.id, LINE_COLORS[i%LINE_COLORS.length]]));
  const activeSel = selIds!==null ? selIds : unlockedIds;

  const toggle=(id)=>{
    const cur=selIds!==null?selIds:unlockedIds;
    const next=cur.includes(id)?cur.filter(x=>x!==id):[...cur,id];
    setSelIds(next);
  };

  const lines=exercises
    .filter(ex=>activeSel.includes(ex.id)&&(counts[ex.id]||0)>=3)
    .map(ex=>({
      id:ex.id, name:ex.name, color:colorMap[ex.id],
      points:sessions
        .filter(s=>+s.weights?.[ex.id]>0)
        .map(s=>({date:s.date,kg:+s.weights[ex.id]}))
        .sort((a,b)=>a.date.localeCompare(b.date))
    }));

  return (
    <div style={{marginTop:4}}>
      <div className="prog-chips">
        {exercises.map(ex=>{
          const unlocked=(counts[ex.id]||0)>=3;
          const sel=activeSel.includes(ex.id);
          const cc=colorMap[ex.id];
          return (
            <button key={ex.id}
              className={`prog-chip${unlocked?" unlocked":" locked"}${sel?" selected":""}`}
              style={sel&&unlocked?{background:`${cc}1a`,borderColor:cc,color:cc}:{}}
              onClick={()=>unlocked&&toggle(ex.id)}
            >
              {ex.name.length>20?ex.name.slice(0,20)+"…":ex.name}
              {!unlocked&&<span style={{marginLeft:4,fontSize:9,opacity:.7}}>🔒</span>}
            </button>
          );
        })}
      </div>
      {lines.length>0?(
        <>
          <div className="prog-legend">
            {lines.map(l=>(
              <div key={l.id} className="prog-legend-item">
                <div style={{width:8,height:8,borderRadius:"50%",background:l.color,flexShrink:0}}/>
                <span>{l.name}</span>
              </div>
            ))}
          </div>
          <div className="prog-chart-box"><ProgressiMultiChart lines={lines}/></div>
        </>
      ):(
        <div style={{textAlign:"center",color:"var(--muted)",fontSize:13,padding:"16px 0"}}>
          Seleziona almeno un esercizio per vedere il grafico
        </div>
      )}
    </div>
  );
}

// ── Progressi screen (atleta view) ────────────────────────────────────────────
function AtletaProgressi({scheda, user, sessions, misurazioni}) {
  const [selIds,setSelIds]=useState([]);
  const [lockedExId,setLockedExId]=useState(null);

  if(!scheda) {
    return (
      <div className="cliente-body">
        <div style={{textAlign:"center",paddingTop:48}}>
          <div style={{fontSize:40,marginBottom:12}}>📋</div>
          <div style={{fontSize:15,fontWeight:600,color:"var(--text)",marginBottom:6}}>Nessuna scheda assegnata</div>
          <div style={{fontSize:13,color:"var(--muted)"}}>Chiedi al tuo PT.</div>
        </div>
      </div>
    );
  }

  const seen=new Set();
  const allExercises=[];
  Object.values(scheda.giorni).forEach(exList=>{
    (exList||[]).forEach(ex=>{
      if(!seen.has(ex.id)){
        seen.add(ex.id);
        const full=EXERCISES.find(e=>e.id===ex.id)||ex;
        allExercises.push(full);
      }
    });
  });

  const counts=countSessionsPerEx(sessions);
  const colorMap = Object.fromEntries(allExercises.map((ex,i)=>[ex.id, LINE_COLORS[i%LINE_COLORS.length]]));

  const toggle=(id)=>{
    setLockedExId(null);
    setSelIds(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);
  };

  const lines=allExercises
    .filter(ex=>selIds.includes(ex.id)&&(counts[ex.id]||0)>=3)
    .map(ex=>({
      id:ex.id, name:ex.name, color:colorMap[ex.id],
      points:sessions
        .filter(s=>+s.weights?.[ex.id]>0)
        .map(s=>({date:s.date,kg:+s.weights[ex.id]}))
        .sort((a,b)=>a.date.localeCompare(b.date))
    }));

  return (
    <div className="cliente-body">
      <div className="prog-section">
        <div className="prog-section-head">Esercizi</div>
        <div className="prog-chips">
          {allExercises.map(ex=>{
            const unlocked=(counts[ex.id]||0)>=3;
            const sel=selIds.includes(ex.id);
            const cc=colorMap[ex.id];
            const isLocked=lockedExId===ex.id;
            return (
              <div key={ex.id} style={{display:"flex",flexDirection:"column",gap:4}}>
                <button
                  className={`prog-chip${unlocked?" unlocked":" locked"}${sel?" selected":""}`}
                  style={sel&&unlocked?{background:`${cc}1a`,borderColor:cc,color:cc}:{}}
                  onClick={()=>{
                    if(!unlocked){setLockedExId(isLocked?null:ex.id);}
                    else toggle(ex.id);
                  }}
                >
                  {ex.name.length>22?ex.name.slice(0,22)+"…":ex.name}
                  {unlocked
                    ?<span style={{marginLeft:5,fontSize:10,opacity:.6}}>{counts[ex.id]||0}×</span>
                    :<span style={{marginLeft:5,fontSize:10,opacity:.6}}>🔒</span>
                  }
                </button>
                {isLocked&&(
                  <div className="prog-lock-msg">
                    Completa almeno 3 allenamenti con questo esercizio per sbloccare il grafico
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {selIds.length===0?(
          <div className="prog-empty">
            <div className="prog-empty-icon">📈</div>
            Seleziona un esercizio per vedere i tuoi progressi
          </div>
        ):lines.length>0?(
          <>
            <div className="prog-legend">
              {lines.map(l=>(
                <div key={l.id} className="prog-legend-item">
                  <div style={{width:8,height:8,borderRadius:"50%",background:l.color,flexShrink:0}}/>
                  <span>{l.name}</span>
                </div>
              ))}
            </div>
            <div className="prog-chart-box"><ProgressiMultiChart lines={lines}/></div>
          </>
        ):(
          <div className="prog-empty">
            <div className="prog-empty-icon">⏳</div>
            Completa almeno 3 allenamenti con gli esercizi selezionati per visualizzare il grafico
          </div>
        )}
      </div>

      <div className="prog-section" style={{marginTop:8}}>
        <div className="prog-section-head">📏 Le mie misurazioni</div>
        <MisureSection atletaId={user?.isSupabase ? user.id : 0} readOnly={true} externalMisure={user?.isSupabase ? (misurazioni||[]) : null}/>
      </div>
    </div>
  );
}

// ── AtletaView ────────────────────────────────────────────────────────────────
export default function AtletaView({user, onLogout}) {
  const todayStr = fmtDate(new Date());

  const [atlView, setAtlView] = useState("scheda");
  const [scheda, setScheda] = useState(null);
  const [activeDay, setActiveDay] = useState(null);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const isToday = selectedDate === todayStr;
  const [pesi, setPesi] = useState({});
  const [saved, setSaved] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [statsVer, setStatsVer] = useState(0);
  const [pdfStateAtleta, setPdfStateAtleta] = useState(null);
  const [showReset, setShowReset] = useState(false);
  const logoClickRef = useRef(0);
  const [calEvents, setCalEvents] = useState([]);
  const [apptExpanded, setApptExpanded] = useState(false);
  const [supaSessions, setSupaSessions] = useState(null);
  const [schedaMeta, setSchedaMeta] = useState(null);
  const [supaMisurazioni, setSupaMisurazioni] = useState(null);

  const handleLogoClick = () => {
    const now = Date.now();
    if(now - logoClickRef.current <= 400) setShowReset(true);
    logoClickRef.current = now;
  };

  useEffect(()=>{
    if(user.isSupabase){
      supabase.rpc("get_scheda_atleta",{p_atleta_id:user.id}).then(async ({data})=>{
        if(!data) return;
        const giorni={}, dayNames={}, giornoIds={}, esercizioDbIds={};
        const sortedG=[...(data.scheda_giorni||[])].sort((a,b)=>a.ordine-b.ordine);
        sortedG.forEach(g=>{
          const key=g.giorno_key||`G${g.ordine}`;
          dayNames[key]=g.nome||`Giorno ${key}`;
          giornoIds[key]=g.id;
          giorni[key]=(g.scheda_esercizi||[]).sort((a,b)=>a.ordine-b.ordine).map(ex=>{
            const exFull=EXERCISES.find(e=>e.id===ex.esercizio_id_int);
            if(ex.esercizio_id_int) esercizioDbIds[ex.esercizio_id_int]=ex.id;
            return {id:ex.esercizio_id_int||0, exDbId:ex.id, name:ex.nome||exFull?.name||"", sets:ex.serie||3, reps:ex.reps||"10", rest:ex.rest_sec||90, cat:exFull?.cat||""};
          });
        });
        let ptName = "";
        const ptId = data.pt_id || user.pt_id;
        if(ptId){
          const {data: ptProfile} = await supabase.rpc("get_pt_name", {p_pt_id: ptId});
          if(ptProfile) ptName = (`${ptProfile.nome||""} ${ptProfile.cognome||""}`).trim();
        }
        setScheda({id:data.id, nome:data.nome||"", cognome:"", pt:ptName, obiettivo:data.obiettivo||"", livello:data.livello||"", assegnataIl:data.assegnata_il||"", giorni, dayNames});
        setSchedaMeta({id:data.id, giornoIds, esercizioDbIds});
        if(sortedG.length) setActiveDay(sortedG[0].giorno_key||Object.keys(giorni)[0]);
      });
    } else {
      try{const raw=localStorage.getItem("pt_scheda_0");if(raw){const s=JSON.parse(raw);setScheda(s);setActiveDay(Object.keys(s.giorni)[0]);}}catch{}
    }
  },[user.id]);

  useEffect(()=>{
    if(user.isSupabase){
      supabase.rpc("get_appuntamenti_atleta",{p_atleta_id:user.id}).then(({data})=>{
        if(data) setCalEvents((data||[]).map(r=>({id:r.id,date:r.data,time:r.ora_inizio||"00:00",clientName:user.name,type:r.tipo||"Allenamento"})));
      });
    } else {
      try{const raw=localStorage.getItem("pt_calendar_shared");if(raw)setCalEvents(JSON.parse(raw));}catch{}
    }
  },[user.id]);

  useEffect(()=>{
    if(!user.isSupabase) return;
    supabase.rpc("get_sessioni_atleta",{p_atleta_id:user.id})
      .then(({data,error})=>{ setSupaSessions(error?[]:(data||[])); });
    supabase.rpc("get_misurazioni_atleta",{p_atleta_id:user.id})
      .then(({data})=>{
        setSupaMisurazioni((data||[]).map(r=>({
          data:r.data, peso:r.peso_kg?String(r.peso_kg):"", vita:r.vita_cm?String(r.vita_cm):"",
          fianchi:r.fianchi_cm?String(r.fianchi_cm):"", petto:r.petto_cm?String(r.petto_cm):"",
          braccio:r.braccio_cm?String(r.braccio_cm):"",
          grassoPerc:r.grasso_percent?String(r.grasso_percent):"",
          fcRiposo:r.fc_riposo?String(r.fc_riposo):"",
        })));
      });
  },[user.id]);

  useEffect(()=>{
    if(!activeDay) return;
    if(user.isSupabase){
      if(!supaSessions||!schedaMeta) return;
      const gid=schedaMeta.giornoIds[activeDay];
      const sess=supaSessions.find(s=>s.data===selectedDate&&s.giorno_id===gid);
      if(sess){
        const w=(sess.sessione_serie||[]).reduce((acc,sr)=>{
          const ex=EXERCISES.find(e=>e.name===sr.nome_esercizio);
          if(ex) acc[ex.id]=String(sr.peso||0);
          return acc;
        },{});
        setPesi(w); setSaved(true);
      } else { setPesi({}); setSaved(false); }
      setJustSaved(false);
    } else {
      const sessions=loadSessions();
      const sess=sessions.find(s=>s.date===selectedDate&&s.day===activeDay);
      setPesi(sess?sess.weights:{}); setSaved(!!sess); setJustSaved(false);
    }
  },[activeDay, selectedDate, supaSessions, schedaMeta]);

  const prevDate = ()=>{
    const d = new Date(selectedDate+"T12:00");
    d.setDate(d.getDate()-1);
    setSelectedDate(fmtDate(d));
  };
  const nextDate = ()=>{
    if(isToday) return;
    const d = new Date(selectedDate+"T12:00");
    d.setDate(d.getDate()+1);
    setSelectedDate(fmtDate(d));
  };

  const handleSave = async ()=>{
    console.log("[handleSave] isSupabase:", user.isSupabase, "| schedaMeta:", schedaMeta, "| activeDay:", activeDay, "| pt_id:", user.pt_id);
    if(user.isSupabase){
      const gid=schedaMeta?.giornoIds[activeDay];
      const esercizi=scheda?.giorni[activeDay]||[];
      const serieRows=[];
      esercizi.forEach(ex=>{
        const peso=parseFloat(pesi[ex.id]||0);
        if(peso>0){
          for(let i=0;i<(ex.sets||3);i++){
            serieRows.push({nome_esercizio:ex.name,serie_numero:i+1,reps:parseInt(ex.reps||10),peso});
          }
        }
      });
      console.log("[handleSave] → Supabase RPC | gid:", gid, "| serieRows:", serieRows);
      const {error}=await supabase.rpc("save_sessione_atleta",{
        p_atleta_id:user.id, p_pt_id:user.pt_id,
        p_scheda_id:schedaMeta?.id||null, p_giorno_id:gid||null,
        p_data:selectedDate, p_serie:serieRows,
      });
      console.log("[handleSave] save_sessione_atleta error:", error);
      if(!error){
        const {data:newSess}=await supabase.rpc("get_sessioni_atleta",{p_atleta_id:user.id});
        setSupaSessions(newSess||[]);
      }
    } else {
      console.log("[handleSave] → localStorage path");
      const sessions=loadSessions().filter(s=>!(s.date===selectedDate&&s.day===activeDay));
      sessions.push({date:selectedDate,day:activeDay,weights:pesi});
      saveSessions(sessions);
    }
    setSaved(true); setJustSaved(true); setStatsVer(v=>v+1);
    window.scrollTo({top:0,behavior:"smooth"});
    setTimeout(()=>setJustSaved(false),2500);
  };

  const handlePDFAtleta = async () => {
    if(!scheda) return;
    setPdfStateAtleta({progress:0,label:"Preparazione…"});
    try {
      await buildPDF({
        nome: scheda.nome||"",
        cognome: scheda.cognome||"",
        obiettivo: scheda.obiettivo||"",
        livello: scheda.livello||"",
        giorni: scheda.giorni,
        onProgress:(p,l)=>setPdfStateAtleta({progress:p,label:l})
      });
    } catch(e){console.error(e);}
    finally{setPdfStateAtleta(null);}
  };

  const _rawSupa = user.isSupabase ? (supaSessions||[]) : null;
  const _allSessions = user.isSupabase
    ? _rawSupa.map(s=>({date:s.data}))
    : loadSessions();
  const sessionTotal = _allSessions.length;
  const latestSessionDate = _allSessions.length > 0
    ? [..._allSessions].sort((a,b)=>b.date.localeCompare(a.date))[0].date
    : null;
  const _sessionDates = new Set(_allSessions.map(s=>s.date));
  let sessionStreak = 0;
  if(_sessionDates.has(todayStr)) {
    const _sd = new Date(todayStr+"T12:00");
    while(_sessionDates.has(fmtDate(_sd))){ sessionStreak++; _sd.setDate(_sd.getDate()-1); }
  }
  // Sessioni in formato locale {date, weights:{exId:peso}} per i grafici progressi
  const chartSessions = user.isSupabase
    ? _rawSupa.map(s=>({
        date:s.data,
        weights:(s.sessione_serie||[]).reduce((acc,sr)=>{
          const ex=EXERCISES.find(e=>e.name===sr.nome_esercizio);
          if(!ex) return acc;
          const prev=parseFloat(acc[ex.id]||0), val=parseFloat(sr.peso||0);
          if(val>prev) acc[ex.id]=String(val);
          return acc;
        },{})
      }))
    : loadSessions();

  const userNameLower = (user.name||"").toLowerCase();
  const futureAppts = calEvents
    .filter(e=>e.date>=todayStr && (e.clientName||"").toLowerCase().includes(userNameLower))
    .sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time));
  const visibleAppts = apptExpanded ? futureAppts : futureAppts.slice(0,3);

  const logo = ["PT","Studio"];

  if(!scheda) return (
    <div style={{minHeight:"100vh",background:"var(--bg)"}}>
      {showReset&&<ResetDemoDialog onClose={()=>setShowReset(false)}/>}
      <div className="cliente-header">
        <div className="sidebar-logo" style={{marginBottom:0,cursor:"default",userSelect:"none"}} onClick={handleLogoClick}>{logo[0]}<span style={{color:"var(--text)"}}>{logo[1]}</span></div>
        <div style={{fontSize:13,fontWeight:600,color:"var(--muted)"}}>{user.name}</div>
        <button className="sidebar-logout" style={{width:"auto",marginTop:0,padding:"8px 14px"}} onClick={onLogout}>↩ Esci</button>
      </div>
      <div className="atleta-stats-bar">
        <span className="atleta-stats-item">💪 <strong>{sessionTotal}</strong> sessioni completate</span>
        <span className="atleta-stats-item">📅 Ultima: <strong>{latestSessionDate?fmtDateShort(latestSessionDate):"—"}</strong></span>
        <span className="atleta-stats-item">🔥 <strong>{sessionStreak}</strong> giorni consecutivi</span>
      </div>
      <div className="atleta-tab-nav">
        <button className={`atleta-tab${atlView==="scheda"?" active":""}`} onClick={()=>setAtlView("scheda")}>📋 Scheda</button>
        <button className={`atleta-tab${atlView==="progressi"?" active":""}`} onClick={()=>setAtlView("progressi")}>📈 Progressi</button>
      </div>
      <div className="cliente-body" style={{paddingTop:20}}>
        <div className="appt-section" style={{marginBottom:20}}>
          <div className="appt-section-title">📅 Prossimi appuntamenti</div>
          {futureAppts.length===0 ? (
            <div style={{fontSize:13,color:"var(--muted)",padding:"4px 0"}}>Nessun appuntamento programmato</div>
          ) : (
            <>
              {visibleAppts.map((ev,i)=>(
                <div className="appt-card" key={ev.id||i}>
                  <div className="appt-date-label">{fmtDateShort(ev.date)}</div>
                  <div className="appt-time">{ev.time}</div>
                  <div className="appt-name">{ev.clientName}</div>
                  <div className="appt-type-badge" style={{background:typeBg(ev.type),color:typeColor(ev.type)}}>{ev.type}</div>
                </div>
              ))}
              {futureAppts.length>3&&(
                <button className="appt-expand-btn" onClick={()=>setApptExpanded(v=>!v)}>
                  {apptExpanded?"Mostra meno ▲":`Vedi tutti (${futureAppts.length}) ▼`}
                </button>
              )}
            </>
          )}
        </div>
        <div style={{textAlign:"center",paddingTop:28}}>
          <div style={{fontSize:48,marginBottom:16}}>📋</div>
          <div style={{fontSize:18,fontWeight:600,color:"var(--text)",marginBottom:8}}>Nessuna scheda assegnata</div>
          <div style={{fontSize:14,color:"var(--muted)",lineHeight:1.6}}>Il tuo PT deve creare e assegnare una scheda dal Builder.</div>
        </div>
      </div>
    </div>
  );

  const giorni = Object.keys(scheda.giorni);
  const esercizi = scheda.giorni[activeDay]||[];
  const dayNamesScheda = scheda.dayNames||{};
  const activeDayLabel = dayNamesScheda[activeDay] || `Giorno ${activeDay}`;

  const saveBtnLabel = isToday
    ? (saved ? `Aggiorna sessione — ${activeDayLabel}` : `Salva sessione — ${activeDayLabel}`)
    : `Aggiorna sessione del ${fmtDateShort(selectedDate)} — ${activeDayLabel}`;

  return (
    <div style={{minHeight:"100vh",background:"var(--bg)"}}>
      {showReset&&<ResetDemoDialog onClose={()=>setShowReset(false)}/>}
      <div className="cliente-header">
        <div className="sidebar-logo" style={{marginBottom:0,cursor:"default",userSelect:"none"}} onClick={handleLogoClick}>{logo[0]}<span style={{color:"var(--text)"}}>{logo[1]}</span></div>
        <div style={{fontSize:13,fontWeight:600,color:"var(--muted)"}}>{user.name}</div>
        <button className="sidebar-logout" style={{width:"auto",marginTop:0,padding:"8px 14px"}} onClick={onLogout}>↩ Esci</button>
      </div>

      <div className="atleta-stats-bar">
        <span className="atleta-stats-item">💪 <strong>{sessionTotal}</strong> sessioni completate</span>
        <span className="atleta-stats-item">📅 Ultima: <strong>{latestSessionDate?fmtDateShort(latestSessionDate):"—"}</strong></span>
        <span className="atleta-stats-item">🔥 <strong>{sessionStreak}</strong> giorni consecutivi</span>
      </div>

      <div className="atleta-tab-nav">
        <button className={`atleta-tab${atlView==="scheda"?" active":""}`} onClick={()=>setAtlView("scheda")}>📋 Scheda</button>
        <button className={`atleta-tab${atlView==="progressi"?" active":""}`} onClick={()=>setAtlView("progressi")}>📈 Progressi</button>
      </div>

      {atlView==="progressi"&&<AtletaProgressi scheda={scheda} user={user} sessions={chartSessions} misurazioni={supaMisurazioni}/>}

      {atlView==="scheda"&&<div className="cliente-body">
        <div className="appt-section">
          <div className="appt-section-title">📅 Prossimi appuntamenti</div>
          {futureAppts.length===0 ? (
            <div style={{fontSize:13,color:"var(--muted)",padding:"4px 0"}}>Nessun appuntamento programmato</div>
          ) : (
            <>
              {visibleAppts.map((ev,i)=>(
                <div className="appt-card" key={ev.id||i}>
                  <div className="appt-date-label">{fmtDateShort(ev.date)}</div>
                  <div className="appt-time">{ev.time}</div>
                  <div className="appt-name">{ev.clientName}</div>
                  <div
                    className="appt-type-badge"
                    style={{background:typeBg(ev.type),color:typeColor(ev.type)}}
                  >{ev.type}</div>
                </div>
              ))}
              {futureAppts.length>3&&(
                <button className="appt-expand-btn" onClick={()=>setApptExpanded(v=>!v)}>
                  {apptExpanded?"Mostra meno ▲":`Vedi tutti (${futureAppts.length}) ▼`}
                </button>
              )}
            </>
          )}
        </div>

        <div className="scheda-info-card">
          <div className="scheda-info-title">{scheda.nome||`Scheda ${scheda.cognome||""}`}</div>
          <div className="scheda-info-meta">
            <span>👤 PT: <strong style={{color:"var(--text)"}}>{scheda.pt||"Personal Trainer Demo"}</strong></span>
            {scheda.obiettivo&&<span>🎯 {scheda.obiettivo}</span>}
            {scheda.livello&&<span>📊 {scheda.livello}</span>}
            <span>📅 Assegnata il {scheda.assegnataIl||"—"}</span>
          </div>
        </div>

        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20,flexWrap:"wrap"}}>
          <div className="day-tabs">
            {giorni.map(d=>(
              <button key={d} className={`day-tab${activeDay===d?" active":""}`} onClick={()=>setActiveDay(d)}>
                {dayNamesScheda[d]||`Giorno ${d}`}
              </button>
            ))}
          </div>
          {!pdfStateAtleta&&(
            <button className="btn-ghost" style={{fontSize:12,padding:"7px 14px"}} onClick={handlePDFAtleta}>
              ⬇ Scarica PDF
            </button>
          )}
        </div>
        {pdfStateAtleta&&(
          <div className="pdf-progress" style={{marginBottom:16}}>
            <span style={{fontSize:16}}>⏳</span>
            <div className="prog-wrap"><div className="prog-fill" style={{width:`${Math.round(pdfStateAtleta.progress*100)}%`}}/></div>
            <span className="prog-label">{pdfStateAtleta.label}</span>
          </div>
        )}

        <div className={`date-nav${!isToday?" past":""}`}>
          <button className="date-nav-btn" onClick={prevDate} title="Giorno precedente">‹</button>
          <div className="date-nav-label">
            {isToday?"Oggi — "+fmtDateLong(selectedDate):fmtDateLong(selectedDate)}
          </div>
          <button className="date-nav-btn" onClick={nextDate} disabled={isToday} title="Giorno successivo">›</button>
        </div>

        {justSaved&&(
          <div className="session-saved-banner" style={{background:"rgba(71,255,232,.15)",borderColor:"rgba(71,255,232,.4)",fontWeight:700}}>
            ✓ Sessione salvata con successo!
          </div>
        )}
        {!justSaved&&saved&&(
          <div className="session-saved-banner">
            {isToday
              ? "↩ Sessione di oggi già salvata — puoi aggiornare i pesi e risalvare"
              : `↩ Sessione del ${fmtDateShort(selectedDate)} già salvata — puoi aggiornare i pesi e risalvare`
            }
          </div>
        )}

        {esercizi.map(ex=>(
          <AtletaExCard
            key={ex.id}
            ex={ex}
            peso={pesi[ex.id]}
            onPesoChange={val=>setPesi(p=>({...p,[ex.id]:val}))}
          />
        ))}

        <button className="save-session-btn" onClick={handleSave}>
          {saveBtnLabel}
        </button>
      </div>}
    </div>
  );
}
