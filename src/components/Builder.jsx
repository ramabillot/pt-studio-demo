import React, { useState, useEffect } from "react";
import { EXERCISES, CATEGORIES, OBIETTIVI, LIVELLI, CAT_COLORS, ALL_DAYS } from "../data.js";
import { loadAtleti, buildPDF, calcSummary, fmtDate, getInitials } from "../utils.js";
import { supabase } from "../supabase.js";
import { BackBtn } from "./Sidebar.jsx";

// ── Atleta search dropdown (also used by Calendar) ────────────────────────────
export function AtletaSearchField({value, onChange, onSelect, atleti: propAtleti}) {
  const [q, setQ] = useState(value||"");
  const [showDrop, setShowDrop] = useState(false);
  const allAtleti = propAtleti ?? loadAtleti();

  useEffect(()=>{ setQ(value||""); },[value]);

  const filtered = allAtleti.filter(a=>
    !q.trim() || `${a.nome} ${a.cognome}`.toLowerCase().includes(q.toLowerCase())
  ).slice(0,5);

  const select = (a) => {
    const name = `${a.nome} ${a.cognome}`;
    setQ(name);
    onChange(name);
    if(onSelect) onSelect(a);
    setShowDrop(false);
  };

  return (
    <div style={{position:"relative"}}>
      <input
        className="field-input"
        type="text"
        placeholder="Cerca atleta o inserisci nome…"
        value={q}
        autoComplete="off"
        onChange={e=>{ setQ(e.target.value); onChange(e.target.value); setShowDrop(true); }}
        onFocus={()=>setShowDrop(true)}
        onBlur={()=>setTimeout(()=>setShowDrop(false),150)}
      />
      {showDrop&&filtered.length>0&&(
        <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,zIndex:60,background:"var(--card2)",border:"1px solid var(--border)",borderRadius:10,overflow:"hidden",boxShadow:"0 8px 24px rgba(0,0,0,.5)"}}>
          {filtered.map(a=>(
            <div
              key={a.id}
              onMouseDown={()=>select(a)}
              style={{padding:"9px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:10,borderBottom:"1px solid var(--border)"}}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.05)"}
              onMouseLeave={e=>e.currentTarget.style.background=""}
            >
              <div style={{width:28,height:28,borderRadius:7,background:a.color||"#e8ff47",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#07070d",flexShrink:0}}>
                {getInitials(a.nome,a.cognome)}
              </div>
              <div style={{minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>{a.nome} {a.cognome}</div>
                {a.obiettivo&&<div style={{fontSize:11,color:"var(--muted)"}}>{a.obiettivo}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Scheda demo section (used in Atleti modal for demo atleta) ────────────────
export function SchedaDemoSection({setView, onClose, setBuilderPreload}) {
  const [sd, setSd] = useState(undefined);

  useEffect(()=>{
    try {
      const raw = localStorage.getItem("pt_scheda_0");
      setSd(raw ? JSON.parse(raw) : null);
    } catch { setSd(null); }
  },[]);

  if(sd===undefined) return null;

  if(!sd) return (
    <div style={{color:"var(--muted)",fontSize:14}}>Nessuna scheda assegnata ancora.</div>
  );

  return (
    <div>
      <div style={{background:"var(--card2)",border:"1px solid var(--border)",borderRadius:10,padding:"14px 16px",marginBottom:14}}>
        <div style={{display:"flex",flexWrap:"wrap",gap:"10px 20px",fontSize:13}}>
          {sd.obiettivo&&<span><span style={{color:"var(--muted)"}}>Obiettivo: </span><strong style={{color:"var(--text)"}}>{sd.obiettivo}</strong></span>}
          {sd.livello&&<span><span style={{color:"var(--muted)"}}>Livello: </span><strong style={{color:"var(--text)"}}>{sd.livello}</strong></span>}
          {sd.assegnataIl&&<span><span style={{color:"var(--muted)"}}>Assegnata il: </span><strong style={{color:"var(--text)"}}>{sd.assegnataIl}</strong></span>}
        </div>
      </div>
      {Object.entries(sd.giorni||{}).map(([day, exList])=>{
        const customName = sd.dayNames?.[day];
        return (
          <div key={day} style={{marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:"var(--muted)",marginBottom:7}}>
              Giorno {day}{customName?` — ${customName}`:""} · {(exList||[]).length} esercizi
            </div>
            {(exList||[]).map(ex=>{
              const cc=CAT_COLORS[ex.cat]||"var(--accent)";
              return (
                <div key={ex.id} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 12px",background:"var(--card2)",border:"1px solid var(--border)",borderRadius:8,marginBottom:5}}>
                  <span style={{fontSize:10,fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:cc,background:`${cc}16`,padding:"2px 7px",borderRadius:4,flexShrink:0}}>{ex.cat}</span>
                  <span style={{fontSize:13,fontWeight:600,color:"var(--text)",flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ex.name}</span>
                  <span style={{fontSize:12,color:"var(--muted)",flexShrink:0}}>{ex.sets}×{ex.reps} · {ex.rest}s</span>
                </div>
              );
            })}
          </div>
        );
      })}
      <button
        className="btn-primary"
        style={{marginTop:8,display:"flex",alignItems:"center",gap:6,fontSize:13}}
        onClick={()=>{
          if(setBuilderPreload) {
            setBuilderPreload({
              atletaId: sd.atletaId ?? 0,
              nome: sd.nome||"",
              cognome: sd.cognome||"",
              obiettivo: sd.obiettivo||"",
              livello: sd.livello||"",
              giorni: sd.giorni||{},
              dayNames: sd.dayNames||{},
            });
          }
          onClose();
          setView("builder");
        }}
      >
        ✏️ Modifica nel Builder
      </button>
    </div>
  );
}

// ── Builder ───────────────────────────────────────────────────────────────────
export default function Builder({setView, preload=null, setPreload=null, user}) {
  const [selectedAtleta,setSelectedAtleta]=useState(null);
  const [searchQ,setSearchQ]=useState("");
  const [showDrop,setShowDrop]=useState(false);
  const [obiettivo,setObiettivo]=useState("");
  const [livello,setLivello]=useState("");
  const [numDays,setNumDays]=useState(3);
  const [activeDay,setActiveDay]=useState("A");
  const [giorni,setGiorni]=useState({A:[],B:[],C:[],D:[],E:[],F:[],G:[]});
  const [dayNames,setDayNames]=useState({A:"",B:"",C:"",D:"",E:"",F:"",G:""});
  const [selId,setSelId]=useState(EXERCISES[0].id);
  const [sets,setSets]=useState(3); const [reps,setReps]=useState(10); const [rest,setRest]=useState(90);
  const [pdfState,setPdfState]=useState(null);
  const [toast,setToast]=useState(null);
  const [assigned,setAssigned]=useState(false);
  const [showOverwriteConfirm,setShowOverwriteConfirm]=useState(false);
  // Supabase: UUID della scheda esistente (null = nuova)
  const [schedaId,setSchedaId]=useState(null);
  const [assegnaLoading,setAssegnaLoading]=useState(false);
  // Atleti reali da Supabase
  const [realAtleti,setRealAtleti]=useState([]);

  // Carica atleti reali da Supabase
  useEffect(()=>{
    if(!user?.isSupabase) return;
    supabase.from("atleti").select("*").eq("pt_id",user.supabaseId)
      .order("created_at",{ascending:true})
      .then(({data})=>{
        setRealAtleti((data||[]).map(r=>({
          id:r.id, nome:r.nome, cognome:r.cognome,
          obiettivo:r.obiettivo||"", livello:r.livello||"",
          color:r.color||"#e8ff47",
        })));
      });
  },[user?.supabaseId]);

  const allAtleti = user?.isSupabase ? realAtleti : loadAtleti();

  // Quando atleta selezionato (utenti reali): carica schedaId esistente
  useEffect(()=>{
    if(!selectedAtleta || !user?.isSupabase) { setSchedaId(null); return; }
    supabase.from("schede").select("id").eq("atleta_id",selectedAtleta.id)
      .maybeSingle()
      .then(({data})=>setSchedaId(data?.id||null));
  },[selectedAtleta?.id]);

  // Preload (da "Modifica nel Builder" in Atleti.jsx)
  useEffect(()=>{
    if(!preload) return;
    // Supporta preload.atleta (oggetto completo) per utenti reali
    if(preload.atleta) {
      setSelectedAtleta(preload.atleta);
      setSearchQ(`${preload.atleta.nome} ${preload.atleta.cognome}`);
    } else {
      const atleta = allAtleti.find(a=>a.id===preload.atletaId)||null;
      if(atleta) {
        setSelectedAtleta(atleta);
        setSearchQ(`${atleta.nome} ${atleta.cognome}`);
      } else if(preload.nome||preload.cognome) {
        setSearchQ(`${preload.nome} ${preload.cognome}`.trim());
      }
    }
    if(preload.schedaId) setSchedaId(preload.schedaId);
    if(preload.obiettivo) setObiettivo(preload.obiettivo);
    if(preload.livello) setLivello(preload.livello);
    const giorniKeys = Object.keys(preload.giorni||{});
    const numD = giorniKeys.length||3;
    setNumDays(numD);
    if(giorniKeys.length>0) setActiveDay(giorniKeys[0]);
    const newGiorni={A:[],B:[],C:[],D:[],E:[],F:[],G:[]};
    giorniKeys.forEach(d=>{
      newGiorni[d]=(preload.giorni[d]||[]).map((ex,idx)=>({...ex,uid:Date.now()+idx}));
    });
    setGiorni(newGiorni);
    if(preload.dayNames) {
      setDayNames(prev=>({...prev,...preload.dayNames}));
    }
    if(setPreload) setPreload(null);
  },[preload]);

  const filtered = allAtleti.filter(a=>{
    if(!searchQ.trim()) return true;
    const q=searchQ.toLowerCase();
    return a.nome.toLowerCase().includes(q)||a.cognome.toLowerCase().includes(q);
  }).slice(0,5);

  const selectAtleta=(a)=>{
    setSelectedAtleta(a);
    setSearchQ(`${a.nome} ${a.cognome}`);
    setShowDrop(false);
    if(a.obiettivo) setObiettivo(a.obiettivo);
    if(a.livello) setLivello(a.livello);
  };

  const clearAtleta=()=>{ setSelectedAtleta(null); setSearchQ(""); setObiettivo(""); setLivello(""); setSchedaId(null); };

  const activeDays=ALL_DAYS.slice(0,numDays);
  const scheda=giorni[activeDay]||[];

  const handleNumDays=(n)=>{
    const newDays=ALL_DAYS.slice(0,n);
    const removedDays=ALL_DAYS.slice(n,numDays);
    const hasContent=removedDays.some(d=>(giorni[d]||[]).length>0);
    if(hasContent){
      const names=removedDays.filter(d=>(giorni[d]||[]).length>0).map(d=>`Giorno ${d}`).join(", ");
      if(!window.confirm(`${names} contiene esercizi. Vuoi rimuoverlo?`)) return;
    }
    setNumDays(n);
    if(!newDays.includes(activeDay)) setActiveDay(newDays[newDays.length-1]);
  };

  const add=()=>{ const ex=EXERCISES.find(e=>e.id===Number(selId)); setGiorni(prev=>({...prev,[activeDay]:[...(prev[activeDay]||[]),{...ex,sets,reps,rest,uid:Date.now()}]})); };
  const del=(uid)=>setGiorni(prev=>({...prev,[activeDay]:(prev[activeDay]||[]).filter(r=>r.uid!==uid)}));
  const clear=()=>setGiorni(prev=>({...prev,[activeDay]:[]}));

  const activeGiorni=Object.fromEntries(activeDays.map(d=>[d,giorni[d]||[]]));
  const totalEx=Object.values(activeGiorni).reduce((s,d)=>s+d.length,0);
  const sum=calcSummary(scheda);

  const handlePDF=async()=>{
    if(!Object.values(activeGiorni).some(d=>d.length>0)) return;
    const nome=selectedAtleta?.nome||"";
    const cognome=selectedAtleta?.cognome||"";
    setPdfState({progress:0,label:"Preparazione…"});
    try{ await buildPDF({nome,cognome,obiettivo,livello,giorni:activeGiorni,onProgress:(p,l)=>setPdfState({progress:p,label:l})}); }
    catch(e){console.error(e);}
    finally{setPdfState(null);}
  };

  // ── Assegna scheda su Supabase ────────────────────────────────────────────
  const doAssegnaSupabase=async()=>{
    if(!selectedAtleta) return;
    setAssegnaLoading(true);
    try {
      // Se scheda esiste già: elimina (cascade elimina giorni ed esercizi)
      if(schedaId) {
        await supabase.from("schede").delete().eq("id",schedaId);
      }

      // Insert scheda
      const {data:nuovaScheda,error:schedaErr}=await supabase.from("schede").insert({
        pt_id:       user.supabaseId,
        atleta_id:   selectedAtleta.id,
        nome:        `${selectedAtleta.nome} ${selectedAtleta.cognome}`.trim(),
        obiettivo,
        livello,
        attiva:      true,
        assegnata_il: fmtDate(new Date()),
      }).select().single();
      if(schedaErr) throw schedaErr;

      // Insert scheda_giorni
      const giornoRows=activeDays.map((key,ordine)=>({
        scheda_id: nuovaScheda.id,
        pt_id:     user.supabaseId,
        giorno_key: key,
        nome:      dayNames[key]||"",
        ordine,
      }));
      const {data:giornoData,error:giornoErr}=await supabase
        .from("scheda_giorni").insert(giornoRows).select();
      if(giornoErr) throw giornoErr;

      // Mappa giorno_key → id Supabase
      const giornoIdByKey=Object.fromEntries(giornoData.map(g=>[g.giorno_key,g.id]));

      // Insert scheda_esercizi
      const eserciziRows=[];
      activeDays.forEach(key=>{
        (giorni[key]||[]).forEach((ex,ordine)=>{
          eserciziRows.push({
            giorno_id:       giornoIdByKey[key],
            pt_id:           user.supabaseId,
            nome:            ex.name,
            esercizio_id_int: ex.id,
            serie:           ex.sets,
            reps:            String(ex.reps),
            rest_sec:        ex.rest,
            peso_iniziale:   0,
            ordine,
          });
        });
      });
      if(eserciziRows.length>0){
        const {error:exErr}=await supabase.from("scheda_esercizi").insert(eserciziRows);
        if(exErr) throw exErr;
      }

      setSchedaId(nuovaScheda.id);
      setShowOverwriteConfirm(false);
      setToast(`✓ Scheda assegnata a ${selectedAtleta.nome} ${selectedAtleta.cognome}`);
      setAssigned(true);
      setTimeout(()=>setAssigned(false),2000);
    } catch(e){
      console.error("[doAssegna supabase]",e);
      setToast(`❌ Errore: ${e.message}`);
    } finally {
      setAssegnaLoading(false);
    }
  };

  // ── Assegna scheda demo (localStorage) ───────────────────────────────────
  const doAssegnaDemo=()=>{
    if(!selectedAtleta||totalEx===0) return;
    const key=`pt_scheda_${selectedAtleta.id}`;
    const payload={
      atletaId:selectedAtleta.id,
      nome:selectedAtleta.nome,
      cognome:selectedAtleta.cognome,
      pt:"Personal Trainer Demo",
      obiettivo,livello,
      giorni:activeGiorni,
      dayNames:Object.fromEntries(activeDays.map(d=>[d,dayNames[d]||""])),
      assegnataIl:fmtDate(new Date()),
    };
    localStorage.setItem(key,JSON.stringify(payload));
    setShowOverwriteConfirm(false);
    setToast(`✓ Scheda assegnata a ${selectedAtleta.nome} ${selectedAtleta.cognome} — l'atleta può accedere ora con atleta / atleta`);
    setAssigned(true);
    setTimeout(()=>setAssigned(false),2000);
  };

  const doAssegna=()=>{ user?.isSupabase ? doAssegnaSupabase() : doAssegnaDemo(); };

  const handleAssegna=()=>{
    if(!selectedAtleta||totalEx===0) return;
    if(user?.isSupabase){
      if(schedaId){ setShowOverwriteConfirm(true); return; }
      doAssegna();
    } else {
      const key=`pt_scheda_${selectedAtleta.id}`;
      if(localStorage.getItem(key)){ setShowOverwriteConfirm(true); return; }
      doAssegna();
    }
  };

  const canAssegna = selectedAtleta && (user?.isSupabase || selectedAtleta?.hasAccount);

  return (
    <div>
      <BackBtn setView={setView}/>
      <div className="page-head"><div className="page-title">Builder Scheda</div><div className="page-sub">{totalEx} esercizi totali</div></div>
      {toast&&(
        <div style={{background:"rgba(71,255,232,.1)",border:"1px solid rgba(71,255,232,.3)",borderRadius:10,padding:"12px 18px",marginBottom:16,fontSize:13,fontWeight:600,color:"var(--accent2)",display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}>
          <span>{toast}</span>
          <button onClick={()=>setToast(null)} style={{background:"none",border:"none",color:"var(--accent2)",cursor:"pointer",fontSize:16,lineHeight:1,padding:0,flexShrink:0,opacity:.7,transition:"opacity .15s"}} onMouseEnter={e=>e.currentTarget.style.opacity=1} onMouseLeave={e=>e.currentTarget.style.opacity=.7}>✕</button>
        </div>
      )}
      <div className="builder">
        <div className="client-card">
          <div className="card-section-title">Dati Atleta</div>
          <div className="client-grid">
            <div style={{gridColumn:"1 / span 2",position:"relative"}}>
              <label className="field-label">
                Atleta
                <input
                  className="field-input"
                  type="text"
                  placeholder="Cerca atleta…"
                  value={searchQ}
                  onChange={e=>{setSearchQ(e.target.value);setShowDrop(true);if(!e.target.value)clearAtleta();}}
                  onFocus={()=>setShowDrop(true)}
                  onBlur={()=>setTimeout(()=>setShowDrop(false),150)}
                  autoComplete="off"
                />
              </label>
              {showDrop&&filtered.length>0&&(
                <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:50,background:"var(--card2)",border:"1px solid var(--border)",borderRadius:10,overflow:"hidden",boxShadow:"0 8px 24px rgba(0,0,0,.4)"}}>
                  {filtered.map(a=>(
                    <div
                      key={a.id}
                      onMouseDown={()=>selectAtleta(a)}
                      style={{padding:"10px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:10,fontSize:14,borderBottom:"1px solid var(--border)"}}
                      onMouseEnter={e=>e.currentTarget.style.background="var(--border)"}
                      onMouseLeave={e=>e.currentTarget.style.background=""}
                    >
                      <div style={{width:28,height:28,borderRadius:7,background:a.color||"#e8ff47",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#07070d",flexShrink:0}}>{getInitials(a.nome,a.cognome)}</div>
                      <div>
                        <div style={{fontWeight:600,color:"var(--text)"}}>{a.nome} {a.cognome}</div>
                        <div style={{fontSize:11,color:"var(--muted)"}}>{a.obiettivo} · {a.livello}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <label className="field-label">Obiettivo<select className="field-select" value={obiettivo} onChange={e=>setObiettivo(e.target.value)}><option value="">— seleziona —</option>{OBIETTIVI.map(o=><option key={o}>{o}</option>)}</select></label>
            <label className="field-label">Livello<select className="field-select" value={livello} onChange={e=>setLivello(e.target.value)}><option value="">— seleziona —</option>{LIVELLI.map(l=><option key={l}>{l}</option>)}</select></label>
          </div>
        </div>

        <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
          <label style={{display:"flex",alignItems:"center",gap:10,fontSize:13,color:"var(--muted)",fontWeight:600,letterSpacing:".5px",textTransform:"uppercase"}}>
            Giorni
            <select
              value={numDays}
              onChange={e=>handleNumDays(Number(e.target.value))}
              style={{background:"var(--card)",border:"1px solid var(--border)",color:"var(--text)",fontFamily:"'DM Sans',sans-serif",fontSize:14,padding:"6px 12px",borderRadius:8,outline:"none",width:"auto",appearance:"none",cursor:"pointer"}}
            >
              {[1,2,3,4,5,6,7].map(n=><option key={n} value={n}>{n} {n===1?"giorno":"giorni"}</option>)}
            </select>
          </label>

          <div className="day-tabs">
            {activeDays.map(d=>(
              <button key={d} className={`day-tab${activeDay===d?" active":""}`} onClick={()=>setActiveDay(d)}>
                {dayNames[d]||`Giorno ${d}`}{(giorni[d]||[]).length>0&&<span style={{marginLeft:6,background:"rgba(0,0,0,.2)",borderRadius:"100px",padding:"1px 7px",fontSize:11}}>{(giorni[d]||[]).length}</span>}
              </button>
            ))}
          </div>
          <span style={{fontSize:13,color:"var(--muted)"}}>{scheda.length===0?"Giorno vuoto":`${scheda.length} esercizi`}</span>
        </div>

        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
          <input
            className="field-input"
            type="text"
            placeholder={`Nome giorno (es. Push, Braccia, Gambe…)`}
            value={dayNames[activeDay]||""}
            onChange={e=>setDayNames(prev=>({...prev,[activeDay]:e.target.value}))}
            style={{maxWidth:320,fontSize:13,padding:"8px 12px"}}
          />
          {dayNames[activeDay]&&(
            <button onClick={()=>setDayNames(prev=>({...prev,[activeDay]:""}))} style={{background:"none",border:"none",color:"var(--muted)",cursor:"pointer",fontSize:14,padding:"4px"}}>✕</button>
          )}
        </div>

        <div className="builder-top">
          <label>Esercizio
            <select value={selId} onChange={e=>setSelId(e.target.value)}>
              {CATEGORIES.slice(1).map(cat=><optgroup key={cat} label={`── ${cat} ──`}>{EXERCISES.filter(e=>e.cat===cat).map(ex=><option key={ex.id} value={ex.id}>{ex.name}</option>)}</optgroup>)}
            </select>
          </label>
          <label>Serie<input type="number" min={1} max={20} value={sets} onChange={e=>setSets(Number(e.target.value))}/></label>
          <label>Rip.<input type="number" min={1} max={100} value={reps} onChange={e=>setReps(Number(e.target.value))}/></label>
          <label>Rec.(s)<input type="number" min={0} max={600} step={15} value={rest} onChange={e=>setRest(Number(e.target.value))}/></label>
          <button className="add-btn" onClick={add} style={{marginTop:22}}>+ Aggiungi</button>
        </div>

        <div className="scheda-wrap">
          {scheda.length===0?<div className="empty-state"><div className="empty-icon">📋</div><div>Giorno {activeDay} vuoto.<br/>Aggiungi il primo esercizio!</div></div>:(
            <><div className="scheda-head"><div>Esercizio</div><div>Serie × Rip.</div><div>Recupero</div><div>Muscoli</div><div/></div>
            {scheda.map(row=>{const cc=CAT_COLORS[row.cat]||"#e8ff47"; return(
              <div className="scheda-row" key={row.uid}>
                <div><span className="scheda-dot" style={{background:cc}}/>{row.name}</div>
                <div><span className="badge">{row.sets}</span>{" × "}<span className="badge">{row.reps}</span></div>
                <div><span className="badge badge2">{row.rest}s</span></div>
                <div style={{fontSize:12,color:"var(--muted)"}}>{row.muscles.split(",")[0]}…</div>
                <div><button className="del-btn" onClick={()=>del(row.uid)}>✕</button></div>
              </div>
            );})}</>
          )}
        </div>

        {scheda.length>0&&(
          <div className="summary-grid">
            <div className="summary-card"><div className="summary-label">Serie totali</div><div className="summary-val">{sum.totalSets}</div><div className="summary-sub">Giorno {activeDay}</div></div>
            <div className="summary-card"><div className="summary-label">Tempo stimato</div><div className="summary-val">{sum.estMin}</div><div className="summary-sub">minuti</div></div>
            <div className="summary-card"><div className="summary-label">Esercizi</div><div className="summary-val">{sum.count}</div><div className="summary-sub">Giorno {activeDay}</div></div>
            <div className="summary-card"><div className="summary-label">Gruppi</div><div className="summary-val" style={{fontSize:15,paddingTop:4,lineHeight:1.5}}>{sum.cats.join(", ")||"—"}</div></div>
          </div>
        )}

        {pdfState&&<div className="pdf-progress"><span style={{fontSize:18}}>⏳</span><div className="prog-wrap"><div className="prog-fill" style={{width:`${Math.round(pdfState.progress*100)}%`}}/></div><span className="prog-label">{pdfState.label}</span></div>}

        {showOverwriteConfirm&&(
          <div className="overwrite-confirm">
            <span className="overwrite-confirm-text">⚠️ Questo atleta ha già una scheda assegnata. Sostituirla?</span>
            <div className="overwrite-confirm-actions">
              <button className="btn-ghost" style={{padding:"7px 14px",fontSize:13}} onClick={()=>setShowOverwriteConfirm(false)}>Annulla</button>
              <button className="btn-primary" style={{background:"var(--accent2)",color:"#07070d",padding:"7px 14px",fontSize:13}} onClick={doAssegna} disabled={assegnaLoading}>
                {assegnaLoading?"Salvataggio…":"Sì, sostituisci"}
              </button>
            </div>
          </div>
        )}

        {totalEx>0&&!pdfState&&(
          <div className="actions-row">
            {scheda.length>0&&<button className="btn-ghost" onClick={clear}>Svuota Giorno {activeDay}</button>}
            <button className="btn-primary" onClick={handlePDF}>⬇ Esporta PDF completo</button>
            {canAssegna&&(
              <button
                className="btn-primary"
                style={{background:assigned?"var(--accent2)":"var(--accent2)",color:"#07070d",cursor:assigned?"default":"pointer",transition:"all .2s"}}
                disabled={assigned||assegnaLoading}
                onClick={handleAssegna}
              >
                {assegnaLoading?"Salvataggio…":assigned?"✓ Assegnata!":"📲 Assegna all'atleta"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
