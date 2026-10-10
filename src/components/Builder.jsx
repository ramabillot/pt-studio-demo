import { useState, useEffect } from "react";
import { EXERCISES, CATEGORIES, OBIETTIVI, LIVELLI, CAT_COLORS, ALL_DAYS } from "../data.js";
import { buildPDF, calcSummary, fmtDate, getInitials } from "../utils.js";
import { supabase } from "../supabase.js";
import { BackBtn } from "./Sidebar.jsx";
import { useTranslation } from "react-i18next";
import { nomeEsercizio, muscoliEsercizio, valore, nomeGiorno } from "../i18n/index.js";

// ── Atleta search dropdown (also used by Calendar) ────────────────────────────
export function AtletaSearchField({value, onChange, onSelect, atleti: propAtleti}) {
  const { t } = useTranslation();
  const [q, setQ] = useState(value||"");
  const [showDrop, setShowDrop] = useState(false);
  const allAtleti = propAtleti || [];

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
        placeholder={t("builder.phCercaONome")}
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
              <div style={{width:28,height:28,borderRadius:7,background:a.color||"#e8ff47",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.6875rem",fontWeight:700,color:"#07070d",flexShrink:0}}>
                {getInitials(a.nome,a.cognome)}
              </div>
              <div style={{minWidth:0}}>
                <div style={{fontSize:"0.8125rem",fontWeight:600,color:"var(--text)"}}>{a.nome} {a.cognome}</div>
                {a.obiettivo&&<div style={{fontSize:"0.6875rem",color:"var(--muted)"}}>{valore("obiettivo",a.obiettivo)}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Builder ───────────────────────────────────────────────────────────────────
export default function Builder({setView, preload=null, setPreload=null, user}) {
  const { t } = useTranslation();
  const [selectedAtleta,setSelectedAtleta]=useState(null);
  const [searchQ,setSearchQ]=useState("");
  const [showDrop,setShowDrop]=useState(false);
  const [obiettivo,setObiettivo]=useState("");
  const [livello,setLivello]=useState("");
  const [numDays,setNumDays]=useState(3);
  const [activeDay,setActiveDay]=useState("A");
  const [giorni,setGiorni]=useState({A:[],B:[],C:[],D:[],E:[],F:[],G:[]});
  const [dayNames,setDayNames]=useState({A:"",B:"",C:"",D:"",E:"",F:"",G:""});
  const [selId,setSelId]=useState(String(EXERCISES[0].id));
  const [sets,setSets]=useState(3); const [reps,setReps]=useState("10"); const [rest,setRest]=useState(90);
  const [customExercises,setCustomExercises]=useState([]);
  const [pdfState,setPdfState]=useState(null);
  const [toast,setToast]=useState(null);
  const [assigned,setAssigned]=useState(false);
  const [showOverwriteConfirm,setShowOverwriteConfirm]=useState(false);
  // Supabase: UUID della scheda esistente (null = nuova)
  const [schedaId,setSchedaId]=useState(null);
  const [errore,setErrore]=useState(null);
  const [assegnaLoading,setAssegnaLoading]=useState(false);
  // Atleti reali da Supabase
  const [realAtleti,setRealAtleti]=useState([]);

  // Carica esercizi custom del PT
  useEffect(()=>{
    supabase.from("esercizi_custom").select("*").order("created_at",{ascending:false})
      .then(({data})=>setCustomExercises(data||[]));
  },[user?.supabaseId]);

  // Carica atleti reali da Supabase
  useEffect(()=>{
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

  const allAtleti = realAtleti;

  // Quando atleta selezionato (utenti reali): carica schedaId esistente
  useEffect(()=>{
    if(!selectedAtleta) { setSchedaId(null); return; }
    supabase.from("schede").select("id").eq("atleta_id",selectedAtleta.id)
      .eq("attiva",true).order("created_at",{ascending:false}).limit(1)
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
    // Solo i giorni che hanno esercizi (il preload contiene sempre A…G, anche vuoti)
    const giorniKeys = ALL_DAYS.filter(d=>(preload.giorni?.[d]||[]).length>0);
    const numD = giorniKeys.length ? ALL_DAYS.indexOf(giorniKeys[giorniKeys.length-1])+1 : 3;
    setNumDays(numD);
    if(giorniKeys.length>0) setActiveDay(giorniKeys[0]);
    const newGiorni={A:[],B:[],C:[],D:[],E:[],F:[],G:[]};
    giorniKeys.forEach(d=>{
      newGiorni[d]=(preload.giorni[d]||[]).map((ex,idx)=>({...ex,uid:`${d}-${idx}-${Date.now()}`}));
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
      const names=removedDays.filter(d=>(giorni[d]||[]).length>0).map(d=>nomeGiorno(dayNames[d], d)).join(", ");
      if(!window.confirm(t("builder.confermaRimuovi",{giorni:names}))) return;
    }
    setNumDays(n);
    if(!newDays.includes(activeDay)) setActiveDay(newDays[newDays.length-1]);
  };

  const add=()=>{
    let exObj;
    if(String(selId).startsWith("c:")){
      const raw=customExercises.find(e=>e.id===String(selId).slice(2));
      if(raw) exObj={id:null,name:raw.nome,cat:raw.categoria,muscles:raw.descrizione||""};
    } else {
      exObj=EXERCISES.find(e=>e.id===Number(selId));
    }
    if(!exObj) return;
    setGiorni(prev=>({...prev,[activeDay]:[...(prev[activeDay]||[]),{...exObj,sets,reps:String(reps||"10"),rest,uid:Date.now()}]}));
  };
  const del=(uid)=>setGiorni(prev=>({...prev,[activeDay]:(prev[activeDay]||[]).filter(r=>r.uid!==uid)}));
  const clear=()=>setGiorni(prev=>({...prev,[activeDay]:[]}));

  const activeGiorni=Object.fromEntries(activeDays.map(d=>[d,giorni[d]||[]]));
  const totalEx=Object.values(activeGiorni).reduce((s,d)=>s+d.length,0);
  const sum=calcSummary(scheda);

  const handlePDF=async()=>{
    if(!Object.values(activeGiorni).some(d=>d.length>0)) return;
    const nome=selectedAtleta?.nome||"";
    const cognome=selectedAtleta?.cognome||"";
    setPdfState({progress:0,label:t("pdf.preparazione")});
    try{ await buildPDF({nome,cognome,obiettivo,livello,giorni:activeGiorni,onProgress:(p,l)=>setPdfState({progress:p,label:l})}); }
    catch(e){console.error(e);}
    finally{setPdfState(null);}
  };

  // ── Assegna / aggiorna scheda su Supabase ──────────────────────────────────
  // Se la scheda esiste la aggiorna SUL POSTO: i giorni (scheda_giorni) restano gli
  // stessi, così le sessioni passate dell'atleta restano collegate e visibili nel
  // calendario. Prima la scheda veniva cancellata e ricreata (storico "sparito").
  const eserciziRow=(ex,giornoId,ordine)=>({
    giorno_id:        giornoId,
    pt_id:            user.supabaseId,
    nome:             ex.name,
    esercizio_id_int: ex.id||null,
    serie:            ex.sets,
    reps:             String(ex.reps||"10"),
    rest_sec:         ex.rest,
    ordine,
  });

  const doAssegna=async()=>{
    if(!selectedAtleta) return;
    setAssegnaLoading(true); setErrore(null);
    try {
      let sid=schedaId;
      if(sid){
        const {error:upErr}=await supabase.from("schede").update({obiettivo,livello}).eq("id",sid);
        if(upErr) throw upErr;
      } else {
        const {data:nuova,error:insErr}=await supabase.from("schede").insert({
          pt_id:user.supabaseId, atleta_id:selectedAtleta.id,
          nome:`${selectedAtleta.nome} ${selectedAtleta.cognome}`.trim(),
          obiettivo, livello, attiva:true, assegnata_il:fmtDate(new Date()),
        }).select().single();
        if(insErr) throw insErr;
        sid=nuova.id;
      }

      // Giorni esistenti, abbinati per lettera (A, B, C…)
      const {data:esistenti,error:gErr}=await supabase.from("scheda_giorni").select("id,giorno_key").eq("scheda_id",sid);
      if(gErr) throw gErr;
      const idByKey=Object.fromEntries((esistenti||[]).map(g=>[g.giorno_key,g.id]));

      for(const [ordine,key] of activeDays.entries()){
        if(idByKey[key]){
          const {error}=await supabase.from("scheda_giorni").update({nome:dayNames[key]||"",ordine}).eq("id",idByKey[key]);
          if(error) throw error;
        } else {
          const {data:g,error}=await supabase.from("scheda_giorni").insert({
            scheda_id:sid, pt_id:user.supabaseId, giorno_key:key, nome:dayNames[key]||"", ordine,
          }).select("id").single();
          if(error) throw error;
          idByKey[key]=g.id;
        }
      }
      // Giorni tolti dalla scheda (le loro sessioni restano nello storico, senza giorno)
      const giorniTolti=(esistenti||[]).filter(g=>!activeDays.includes(g.giorno_key)).map(g=>g.id);
      if(giorniTolti.length){
        const {error}=await supabase.from("scheda_giorni").delete().in("id",giorniTolti);
        if(error) throw error;
      }

      // Esercizi: aggiorna quelli esistenti, aggiunge i nuovi, toglie quelli rimossi
      const giornoIdsAttivi=activeDays.map(k=>idByKey[k]);
      const {data:exEsistenti,error:eErr}=await supabase.from("scheda_esercizi").select("id").in("giorno_id",giornoIdsAttivi);
      if(eErr) throw eErr;
      const tenuti=new Set();
      const nuovi=[];
      for(const key of activeDays){
        for(const [ordine,ex] of (giorni[key]||[]).entries()){
          const row=eserciziRow(ex,idByKey[key],ordine);
          if(ex.dbId && (exEsistenti||[]).some(e=>e.id===ex.dbId)){
            tenuti.add(ex.dbId);
            const {error}=await supabase.from("scheda_esercizi").update(row).eq("id",ex.dbId);
            if(error) throw error;
          } else {
            nuovi.push(row);
          }
        }
      }
      const daTogliere=(exEsistenti||[]).map(e=>e.id).filter(id=>!tenuti.has(id));
      if(daTogliere.length){
        const {error}=await supabase.from("scheda_esercizi").delete().in("id",daTogliere);
        if(error) throw error;
      }
      if(nuovi.length){
        const {error}=await supabase.from("scheda_esercizi").insert(nuovi);
        if(error) throw error;
      }

      setSchedaId(sid);
      setShowOverwriteConfirm(false);
      setToast(`✓ ${t(schedaId?"builder.toastAggiornata":"builder.toastAssegnata",{nome:`${selectedAtleta.nome} ${selectedAtleta.cognome}`})}`);
      setAssigned(true);
      setTimeout(()=>setAssigned(false),2000);
    } catch(e){
      console.error("[assegna scheda]",e);
      setErrore(t("builder.errSalvataggio",{msg:e.message||t("builder.erroreRete")}));
    } finally {
      setAssegnaLoading(false);
    }
  };

  const handleAssegna=()=>{
    if(!selectedAtleta||totalEx===0) return;
    if(schedaId){ setShowOverwriteConfirm(true); return; }
    doAssegna();
  };

  const canAssegna = !!selectedAtleta;

  return (
    <div>
      <BackBtn setView={setView}/>
      <div className="page-head"><div className="page-title">{t("builder.titolo")}</div><div className="page-sub">{t("builder.eserciziTotali",{count:totalEx})}</div></div>
      {toast&&(
        <div style={{background:"rgba(71,255,232,.1)",border:"1px solid rgba(71,255,232,.3)",borderRadius:10,padding:"12px 18px",marginBottom:16,fontSize:"0.8125rem",fontWeight:600,color:"var(--accent2)",display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}>
          <span>{toast}</span>
          <button onClick={()=>setToast(null)} style={{background:"none",border:"none",color:"var(--accent2)",cursor:"pointer",fontSize:"1rem",lineHeight:1,padding:0,flexShrink:0,opacity:.7,transition:"opacity .15s"}} onMouseEnter={e=>e.currentTarget.style.opacity=1} onMouseLeave={e=>e.currentTarget.style.opacity=.7}>✕</button>
        </div>
      )}
      {errore&&(
        <div style={{background:"rgba(255,71,87,.08)",border:"1px solid rgba(255,71,87,.3)",borderRadius:10,padding:"12px 18px",marginBottom:16,fontSize:"0.8125rem",fontWeight:600,color:"var(--danger)"}}>{errore}</div>
      )}
      <div className="builder">
        <div className="client-card">
          <div className="card-section-title">{t("builder.datiAtleta")}</div>
          <div className="client-grid">
            <div style={{gridColumn:"1 / span 2",position:"relative"}}>
              <label className="field-label">
                {t("comune.atleta")}
                <input
                  className="field-input"
                  type="text"
                  placeholder={t("builder.phCercaAtleta")}
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
                      style={{padding:"10px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:10,fontSize:"0.875rem",borderBottom:"1px solid var(--border)"}}
                      onMouseEnter={e=>e.currentTarget.style.background="var(--border)"}
                      onMouseLeave={e=>e.currentTarget.style.background=""}
                    >
                      <div style={{width:28,height:28,borderRadius:7,background:a.color||"#e8ff47",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.6875rem",fontWeight:700,color:"#07070d",flexShrink:0}}>{getInitials(a.nome,a.cognome)}</div>
                      <div>
                        <div style={{fontWeight:600,color:"var(--text)"}}>{a.nome} {a.cognome}</div>
                        <div style={{fontSize:"0.6875rem",color:"var(--muted)"}}>{valore("obiettivo",a.obiettivo)} · {valore("livello",a.livello)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <label className="field-label">{t("comune.obiettivo")}<select className="field-select" value={obiettivo} onChange={e=>setObiettivo(e.target.value)}><option value="">— {t("comune.seleziona")} —</option>{OBIETTIVI.map(o=><option key={o} value={o}>{valore("obiettivo",o)}</option>)}</select></label>
            <label className="field-label">{t("comune.livello")}<select className="field-select" value={livello} onChange={e=>setLivello(e.target.value)}><option value="">— {t("comune.seleziona")} —</option>{LIVELLI.map(l=><option key={l} value={l}>{valore("livello",l)}</option>)}</select></label>
          </div>
        </div>

        <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
          <label style={{display:"flex",alignItems:"center",gap:10,fontSize:"0.8125rem",color:"var(--muted)",fontWeight:600,letterSpacing:".5px",textTransform:"uppercase"}}>
            {t("builder.giorni")}
            <select
              value={numDays}
              onChange={e=>handleNumDays(Number(e.target.value))}
              style={{background:"var(--card)",border:"1px solid var(--border)",color:"var(--text)",fontFamily:"'DM Sans',sans-serif",fontSize:"0.875rem",padding:"6px 12px",borderRadius:8,outline:"none",width:"auto",appearance:"none",cursor:"pointer"}}
            >
              {[1,2,3,4,5,6,7].map(n=><option key={n} value={n}>{t("builder.nGiorni",{count:n})}</option>)}
            </select>
          </label>

          <div className="day-tabs">
            {activeDays.map(d=>(
              <button key={d} className={`day-tab${activeDay===d?" active":""}`} onClick={()=>setActiveDay(d)}>
                {nomeGiorno(dayNames[d], d)}{(giorni[d]||[]).length>0&&<span style={{marginLeft:6,background:"rgba(0,0,0,.2)",borderRadius:"100px",padding:"1px 7px",fontSize:"0.6875rem"}}>{(giorni[d]||[]).length}</span>}
              </button>
            ))}
          </div>
          <span style={{fontSize:"0.8125rem",color:"var(--muted)"}}>{scheda.length===0?t("builder.giornoVuoto"):t("libreria.nEsercizi",{count:scheda.length})}</span>
        </div>

        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
          <input
            className="field-input"
            type="text"
            placeholder={t("builder.phNomeGiorno")}
            value={dayNames[activeDay]||""}
            onChange={e=>setDayNames(prev=>({...prev,[activeDay]:e.target.value}))}
            style={{maxWidth:320,fontSize:"0.8125rem",padding:"8px 12px"}}
          />
          {dayNames[activeDay]&&(
            <button onClick={()=>setDayNames(prev=>({...prev,[activeDay]:""}))} style={{background:"none",border:"none",color:"var(--muted)",cursor:"pointer",fontSize:"0.875rem",padding:"4px"}}>✕</button>
          )}
        </div>

        <div className="builder-top">
          <label>{t("builder.esercizio")}
            <select value={selId} onChange={e=>setSelId(e.target.value)}>
              {CATEGORIES.slice(1).filter(cat=>EXERCISES.some(e=>e.cat===cat)||customExercises.some(e=>e.categoria===cat)).map(cat=>(
                <optgroup key={cat} label={`── ${valore("categoria",cat)} ──`}>
                  {EXERCISES.filter(e=>e.cat===cat).map(ex=><option key={ex.id} value={String(ex.id)}>{nomeEsercizio(ex.name, ex.id)}</option>)}
                  {customExercises.filter(e=>e.categoria===cat).map(ex=><option key={ex.id} value={`c:${ex.id}`}>{ex.nome}</option>)}
                </optgroup>
              ))}
            </select>
          </label>
          <label>{t("builder.serie")}<input type="number" min={1} max={20} value={sets} onChange={e=>setSets(Number(e.target.value))}/></label>
          <label>{t("builder.rip")}<input type="text" placeholder="10, 8-10, 30s" title={t("builder.ripTitle")} value={reps} onChange={e=>setReps(e.target.value.replace(/[^0-9sS-]/g,"").toLowerCase())}/></label>
          <label>{t("builder.rec")}<input type="number" min={0} max={600} step={15} value={rest} onChange={e=>setRest(Number(e.target.value))}/></label>
          <button className="add-btn" onClick={add} style={{marginTop:22}}>+ {t("builder.aggiungi")}</button>
        </div>

        <div className="scheda-wrap">
          {scheda.length===0?<div className="empty-state"><div className="empty-icon">📋</div><div>{t("builder.vuoto1",{giorno:nomeGiorno(dayNames[activeDay], activeDay)})}<br/>{t("builder.vuoto2")}</div></div>:(
            <><div className="scheda-head"><div>{t("builder.esercizio")}</div><div>{t("builder.serieXRip")}</div><div>{t("builder.recupero")}</div><div>{t("builder.muscoli")}</div><div/></div>
            {scheda.map(row=>{const cc=CAT_COLORS[row.cat]||"#e8ff47"; return(
              <div className="scheda-row" key={row.uid}>
                <div><span className="scheda-dot" style={{background:cc}}/>{nomeEsercizio(row.name, row.id)}</div>
                <div><span className="badge">{row.sets}</span>{" × "}<span className="badge">{row.reps}</span></div>
                <div><span className="badge badge2">{row.rest}s</span></div>
                <div style={{fontSize:"0.75rem",color:"var(--muted)"}}>{(muscoliEsercizio(row)||"").split(",")[0]||"—"}</div>
                <div><button className="del-btn" onClick={()=>del(row.uid)}>✕</button></div>
              </div>
            );})}</>
          )}
        </div>

        {scheda.length>0&&(
          <div className="summary-grid">
            <div className="summary-card"><div className="summary-label">{t("builder.serieTotali")}</div><div className="summary-val">{sum.totalSets}</div><div className="summary-sub">{nomeGiorno(dayNames[activeDay], activeDay)}</div></div>
            <div className="summary-card"><div className="summary-label">{t("builder.tempoStimato")}</div><div className="summary-val">{sum.estMin}</div><div className="summary-sub">{t("builder.minuti")}</div></div>
            <div className="summary-card"><div className="summary-label">{t("progressi.esercizi")}</div><div className="summary-val">{sum.count}</div><div className="summary-sub">{nomeGiorno(dayNames[activeDay], activeDay)}</div></div>
            <div className="summary-card"><div className="summary-label">{t("builder.gruppi")}</div><div className="summary-val" style={{fontSize:"0.9375rem",paddingTop:4,lineHeight:1.5}}>{sum.cats.map(c=>valore("categoria",c)).join(", ")||"—"}</div></div>
          </div>
        )}

        {pdfState&&<div className="pdf-progress"><span style={{fontSize:"1.125rem"}}>⏳</span><div className="prog-wrap"><div className="prog-fill" style={{width:`${Math.round(pdfState.progress*100)}%`}}/></div><span className="prog-label">{pdfState.label}</span></div>}

        {showOverwriteConfirm&&(
          <div className="overwrite-confirm">
            <span className="overwrite-confirm-text">{t("builder.sovrascrivi")}</span>
            <div className="overwrite-confirm-actions">
              <button className="btn-ghost" style={{padding:"7px 14px",fontSize:"0.8125rem"}} onClick={()=>setShowOverwriteConfirm(false)}>{t("comune.annulla")}</button>
              <button className="btn-primary" style={{background:"var(--accent2)",color:"#07070d",padding:"7px 14px",fontSize:"0.8125rem"}} onClick={doAssegna} disabled={assegnaLoading}>
                {assegnaLoading?t("comune.salvataggio"):t("builder.siAggiorna")}
              </button>
            </div>
          </div>
        )}

        {totalEx>0&&!pdfState&&(
          <div className="actions-row">
            {scheda.length>0&&<button className="btn-ghost" onClick={clear}>{t("builder.svuota",{giorno:nomeGiorno(dayNames[activeDay], activeDay)})}</button>}
            <button className="btn-primary" onClick={handlePDF}>⬇ {t("builder.esportaPDF")}</button>
            {canAssegna&&(
              <button
                className="btn-primary"
                style={{background:assigned?"var(--accent2)":"var(--accent2)",color:"#07070d",cursor:assigned?"default":"pointer",transition:"all .2s"}}
                disabled={assigned||assegnaLoading}
                onClick={handleAssegna}
              >
                {assegnaLoading?t("comune.salvataggio"):assigned?`✓ ${t("builder.salvata")}`:schedaId?`💾 ${t("comune.salvaModifiche")}`:`📲 ${t("builder.assegna")}`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
