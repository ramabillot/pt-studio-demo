import React, { useState, useEffect } from "react";
import { EXERCISES, LINE_COLORS, MISURE_FIELDS } from "../data.js";
import { fmtDate, fmtDateShort, fmtDateLong, buildPDF } from "../utils.js";
import { ultimaVolta, righeEsercizio, statoIniziale, righeDaStato } from "../lib/allenamento.js";
import ProgressiEsercizi, { ProgressiMultiChart } from "./ProgressiEsercizi.jsx";
import EsercizioCard from "./EsercizioCard.jsx";
import { supabase } from "../supabase.js";
import * as api from "../api/atleta.js";
import { typeColor, typeBg } from "./Calendar.jsx";

// ── Misure section ────────────────────────────────────────────────────────────
export function MisureSection({atletaId, readOnly=false, externalMisure=null, ptId=null, supabaseAtletaId=null}) {
  const todayStr = fmtDate(new Date());
  const [misure, setMisure] = useState(()=> externalMisure!==null ? externalMisure : []);
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
        if(error) console.error("[misurazioni load]", error);
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

// ── Progressi screen (atleta view) ────────────────────────────────────────────
function AtletaProgressi({scheda, user, sessioni, misurazioni}) {
  const ordine=scheda?Object.values(scheda.giorni).flat().map(ex=>ex.name):[];
  return (
    <div className="cliente-body">
      <div className="prog-section">
        <div className="prog-section-head">Esercizi</div>
        <ProgressiEsercizi sessioni={sessioni||[]} ordine={ordine} vuoto="Registra i tuoi allenamenti per vedere i progressi."/>
      </div>
      <div className="prog-section" style={{marginTop:8}}>
        <div className="prog-section-head">📏 Le mie misurazioni</div>
        <MisureSection atletaId={user.id} readOnly={true} externalMisure={misurazioni||[]}/>
      </div>
    </div>
  );
}

// ── Calendario mensile storico allenamenti ────────────────────────────────────
const MONTHS_CAL = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const WEEKDAYS_CAL = ["L","M","M","G","V","S","D"];

function MonthCalendar({year, month, onPrev, onNext, sessionsByDate, selectedDate, onDaySelect, todayStr}) {
  const pad = n => String(n).padStart(2,"0");
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0…Sun=6
  const daysInMonth = new Date(year, month+1, 0).getDate();

  const cells = [];
  for(let i=0; i<firstWeekday; i++) cells.push(null);
  for(let d=1; d<=daysInMonth; d++) cells.push(d);
  while(cells.length % 7 !== 0) cells.push(null);

  const now = new Date();
  const isCurrentMonth = year===now.getFullYear() && month===now.getMonth();

  return (
    <div style={{marginBottom:20}}>
      {/* Month nav */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <button className="date-nav-btn" onClick={onPrev} style={{fontSize:20,padding:"4px 12px"}}>‹</button>
        <span style={{fontWeight:700,fontSize:15,color:"var(--text)",letterSpacing:.5}}>{MONTHS_CAL[month]} {year}</span>
        <button className="date-nav-btn" onClick={onNext} disabled={isCurrentMonth} style={{fontSize:20,padding:"4px 12px"}}>›</button>
      </div>

      {/* Weekday header */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:3}}>
        {WEEKDAYS_CAL.map((d,i)=>(
          <div key={i} style={{textAlign:"center",fontSize:9,fontWeight:700,letterSpacing:.8,color:"var(--muted)",textTransform:"uppercase",padding:"2px 0"}}>{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
        {cells.map((day,idx)=>{
          if(!day) return <div key={idx}/>;
          const dateStr=`${year}-${pad(month+1)}-${pad(day)}`;
          const sessions=sessionsByDate[dateStr]||[];
          const hasSession=sessions.length>0;
          const isToday=dateStr===todayStr;
          const isSelected=dateStr===selectedDate;
          const firstLabel=sessions[0]?.dayLabel||"";
          const isFuture=dateStr>todayStr;
          const extra=sessions.length>1?sessions.length-1:0;

          return (
            <div
              key={idx}
              onClick={()=>{ if(!isFuture) onDaySelect(dateStr,sessions[0]?.giornoKey); }}
              style={{
                position:"relative",
                minHeight:54,
                borderRadius:8,
                border:"1px solid var(--border)",
                background:isSelected?"var(--card2)":"var(--card)",
                outline:isToday?"2px solid var(--accent)":isSelected?"2px solid var(--accent2)":"2px solid transparent",
                outlineOffset:"-2px",
                cursor:isFuture?"default":"pointer",
                opacity:isFuture?.35:1,
                overflow:"hidden",
                display:"flex",
                flexDirection:"column",
                alignItems:"center",
                padding:"6px 3px 5px",
                gap:3,
                transition:"outline .1s",
              }}
            >
              {/* accent fill layer — opacity-based so it follows var(--accent) across themes */}
              {hasSession&&(
                <div style={{position:"absolute",inset:0,background:"var(--accent)",opacity:.13,borderRadius:7,pointerEvents:"none"}}/>
              )}

              {/* Day number */}
              <span style={{position:"relative",fontSize:12,fontWeight:hasSession?700:400,color:hasSession?"var(--text)":"var(--muted)",lineHeight:1}}>
                {day}
              </span>

              {/* Session label + overflow badge */}
              {hasSession&&(
                <div style={{position:"relative",width:"100%",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                  <span style={{fontSize:9,fontWeight:700,color:"var(--accent)",textAlign:"center",width:"100%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",letterSpacing:.2,padding:"0 2px",lineHeight:1.25}}>
                    {firstLabel.length>9?firstLabel.slice(0,9)+"…":firstLabel}
                  </span>
                  {extra>0&&(
                    <span style={{fontSize:8,fontWeight:700,color:"var(--muted)",background:"var(--card2)",borderRadius:3,padding:"1px 4px",lineHeight:1.4}}>+{extra}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── AtletaView ────────────────────────────────────────────────────────────────
// Dati via token di sessione atleta (src/api/atleta.js). Se il token non è più
// valido (atleta archiviato, PT disattivato, token scaduto) si torna al login.
export default function AtletaView({user, onLogout}) {
  const todayStr = fmtDate(new Date());

  const [atlView, setAtlView] = useState("scheda");
  const [scheda, setScheda] = useState(null);
  const [schedaCaricata, setSchedaCaricata] = useState(false);
  const [activeDay, setActiveDay] = useState(null);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const isToday = selectedDate === todayStr;
  const [stati, setStati] = useState({});   // exKey → stato card (peso, reps, serie, nota, salta)
  const [saved, setSaved] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState(null);
  const [loadErr, setLoadErr] = useState(null);
  const [pdfStateAtleta, setPdfStateAtleta] = useState(null);
  const [calEvents, setCalEvents] = useState([]);
  const [apptExpanded, setApptExpanded] = useState(false);
  const [supaSessions, setSupaSessions] = useState(null);
  const [schedaMeta, setSchedaMeta] = useState(null);
  const [supaMisurazioni, setSupaMisurazioni] = useState(null);
  const [calMonth, setCalMonth] = useState(()=>{ const n=new Date(); return {year:n.getFullYear(),month:n.getMonth()}; });

  // Errore di caricamento: sessione scaduta → logout, altrimenti messaggio
  const gestisciErrore = (e) => {
    if(e instanceof api.SessioneScaduta){ onLogout(); return; }
    console.error("[atleta]", e);
    setLoadErr("Non riesco a caricare i dati. Controlla la connessione e riapri l'app.");
  };

  useEffect(()=>{
    api.getScheda().then(data=>{
      setSchedaCaricata(true);
      if(!data) return;
      const giorni={}, dayNames={}, giornoIds={};
      const sortedG=[...(data.scheda_giorni||[])].sort((a,b)=>a.ordine-b.ordine);
      sortedG.forEach(g=>{
        const key=g.giorno_key||`G${g.ordine}`;
        dayNames[key]=g.nome||`Giorno ${key}`;
        giornoIds[key]=g.id;
        giorni[key]=(g.scheda_esercizi||[]).sort((a,b)=>a.ordine-b.ordine).map(ex=>{
          const exFull=EXERCISES.find(e=>e.id===ex.esercizio_id_int);
          return {
            id:ex.esercizio_id_int||0, exKey:ex.id, exDbId:ex.id,
            name:ex.nome||exFull?.name||"", sets:ex.serie||3, reps:ex.reps||"10",
            rest:ex.rest_sec||90, cat:exFull?.cat||"",
          };
        });
      });
      setScheda({id:data.id, nome:data.nome||"", cognome:"", pt:user.ptNome||"", obiettivo:data.obiettivo||"", livello:data.livello||"", assegnataIl:data.assegnata_il||"", giorni, dayNames});
      setSchedaMeta({id:data.id, giornoIds});
      if(sortedG.length) setActiveDay(sortedG[0].giorno_key||Object.keys(giorni)[0]);
    }).catch(e=>{ setSchedaCaricata(true); gestisciErrore(e); });

    api.getAppuntamenti().then(data=>{
      setCalEvents((data||[]).map(r=>({id:r.id,date:r.data,time:(r.ora_inizio||"00:00").slice(0,5),clientName:user.name,type:r.tipo||"Allenamento"})));
    }).catch(gestisciErrore);

    api.getSessioni().then(data=>setSupaSessions(data||[])).catch(e=>{ setSupaSessions([]); gestisciErrore(e); });

    api.getMisurazioni().then(data=>{
      setSupaMisurazioni((data||[]).map(r=>({
        data:r.data, peso:r.peso_kg?String(r.peso_kg):"", vita:r.vita_cm?String(r.vita_cm):"",
        fianchi:r.fianchi_cm?String(r.fianchi_cm):"", petto:r.petto_cm?String(r.petto_cm):"",
        braccio:r.braccio_cm?String(r.braccio_cm):"",
        grassoPerc:r.grasso_percent?String(r.grasso_percent):"",
        fcRiposo:r.fc_riposo?String(r.fc_riposo):"",
      })));
    }).catch(gestisciErrore);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[user.id]);

  // Stato delle card per data + giorno: sessione salvata se c'è, altrimenti "ultima volta"
  useEffect(()=>{
    if(!activeDay||!supaSessions||!schedaMeta||!scheda) return;
    const gid=schedaMeta.giornoIds[activeDay];
    const sess=supaSessions.find(s=>s.data===selectedDate&&s.giorno_id===gid);
    const nuovi={};
    (scheda.giorni[activeDay]||[]).forEach(ex=>{
      const salvate=sess?righeEsercizio(sess,ex):[];
      const st=statoIniziale(ex, salvate, ultimaVolta(supaSessions, ex, selectedDate));
      if(sess && !salvate.length) st.salta=true;   // nella sessione salvata non c'era
      nuovi[ex.exKey]=st;
    });
    setStati(nuovi); setSaved(!!sess);
  },[activeDay, selectedDate, supaSessions, schedaMeta, scheda]);

  // Cambio giorno/data: via i messaggi del salvataggio precedente
  useEffect(()=>{ setJustSaved(false); setSaveErr(null); },[activeDay, selectedDate]);

  const handleSave = async ()=>{
    if(saving) return;
    setSaveErr(null);
    if(selectedDate>todayStr){ setSaveErr("Non puoi registrare un allenamento in una data futura."); return; }
    const gid=schedaMeta?.giornoIds[activeDay];
    const esercizi=scheda?.giorni[activeDay]||[];
    const serie=esercizi.flatMap(ex=>stati[ex.exKey]?righeDaStato(ex,stati[ex.exKey]):[]);
    if(!serie.length){ setSaveErr("Hai segnato tutti gli esercizi come saltati: niente da salvare."); return; }
    const note=esercizi
      .filter(ex=>stati[ex.exKey]&&!stati[ex.exKey].salta&&stati[ex.exKey].nota?.trim())
      .map(ex=>({scheda_esercizio_id:ex.exDbId, nome_esercizio:ex.name, nota:stati[ex.exKey].nota.trim()}));
    setSaving(true);
    try {
      const idSessione=await api.saveSessione(gid, selectedDate, serie);
      if(note.length) await api.setNote(idSessione, note);
      const nuove=await api.getSessioni();
      setSupaSessions(nuove||[]);
      setSaved(true); setJustSaved(true);
      window.scrollTo({top:0,behavior:"smooth"});
      setTimeout(()=>setJustSaved(false),2500);
    } catch(e){
      if(e instanceof api.SessioneScaduta){ onLogout(); return; }
      console.error("[salva sessione]", e);
      setSaveErr("⚠️ Sessione NON salvata: problema di connessione. I dati inseriti restano qui, riprova tra poco.");
    } finally {
      setSaving(false);
    }
  };

  const handlePDFAtleta = async () => {
    if(!scheda) return;
    setPdfStateAtleta({progress:0,label:"Preparazione…"});
    try {
      await buildPDF({
        nome: scheda.nome||"", cognome: scheda.cognome||"",
        obiettivo: scheda.obiettivo||"", livello: scheda.livello||"",
        giorni: scheda.giorni,
        onProgress:(p,l)=>setPdfStateAtleta({progress:p,label:l})
      });
    } catch(e){console.error(e);}
    finally{setPdfStateAtleta(null);}
  };

  const _rawSupa = supaSessions||[];
  const sessionTotal = _rawSupa.length;
  const latestSessionDate = sessionTotal > 0
    ? [..._rawSupa].sort((a,b)=>b.data.localeCompare(a.data))[0].data
    : null;
  const _sessionDates = new Set(_rawSupa.map(s=>s.data));
  let sessionStreak = 0;
  if(_sessionDates.has(todayStr)) {
    const _sd = new Date(todayStr+"T12:00");
    while(_sessionDates.has(fmtDate(_sd))){ sessionStreak++; _sd.setDate(_sd.getDate()-1); }
  }
  const futureAppts = calEvents
    .filter(e=>e.date>=todayStr)
    .sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time));
  const visibleAppts = apptExpanded ? futureAppts : futureAppts.slice(0,3);

  const header = (
    <>
      <div className="cliente-header">
        <div className="sidebar-logo" style={{marginBottom:0,cursor:"default",userSelect:"none"}}>PT<span style={{color:"var(--text)"}}>Studio</span></div>
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
      {loadErr&&<div className="cliente-body" style={{paddingBottom:0}}><div className="session-saved-banner" style={{background:"rgba(255,71,87,.08)",borderColor:"rgba(255,71,87,.3)",color:"var(--danger)"}}>{loadErr}</div></div>}
    </>
  );

  const appuntamenti = futureAppts.length>0 && (
    <div className="appt-section">
      <div className="appt-section-title">📅 Prossimi appuntamenti</div>
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
    </div>
  );

  if(!scheda) return (
    <div style={{minHeight:"100vh",background:"var(--bg)"}}>
      {header}
      <div className="cliente-body" style={{paddingTop:20}}>
        {appuntamenti}
        {schedaCaricata&&(
          <div style={{textAlign:"center",paddingTop:28}}>
            <div style={{fontSize:48,marginBottom:16}}>📋</div>
            <div style={{fontSize:18,fontWeight:600,color:"var(--text)",marginBottom:8}}>Nessuna scheda assegnata</div>
            <div style={{fontSize:14,color:"var(--muted)",lineHeight:1.6}}>Il tuo PT non ti ha ancora assegnato una scheda.</div>
          </div>
        )}
        {!schedaCaricata&&<div style={{textAlign:"center",color:"var(--muted)",paddingTop:28}}>Caricamento…</div>}
      </div>
    </div>
  );

  const giorni = Object.keys(scheda.giorni);
  const esercizi = scheda.giorni[activeDay]||[];
  const dayNamesScheda = scheda.dayNames||{};
  const activeDayLabel = dayNamesScheda[activeDay] || `Giorno ${activeDay}`;

  // Mappa data → sessioni per il calendario (giorno_id → lettera del giorno)
  const _giornoIdToKey = schedaMeta
    ? Object.fromEntries(Object.entries(schedaMeta.giornoIds).map(([k,v])=>[v,k]))
    : {};
  const sessionsByDate = {};
  _rawSupa.forEach(s=>{
    const giornoKey=_giornoIdToKey[s.giorno_id];
    if(!giornoKey) return;
    const dayLabel = scheda?.dayNames?.[giornoKey] || `Giorno ${giornoKey}`;
    (sessionsByDate[s.data] = sessionsByDate[s.data] || []).push({giornoKey, dayLabel});
  });

  const saveBtnLabel = saving ? "Salvataggio…" : isToday
    ? (saved ? `Aggiorna sessione — ${activeDayLabel}` : `Salva sessione — ${activeDayLabel}`)
    : `${saved?"Aggiorna":"Salva"} sessione del ${fmtDateShort(selectedDate)} — ${activeDayLabel}`;

  return (
    <div style={{minHeight:"100vh",background:"var(--bg)"}}>
      {header}

      {atlView==="progressi"&&<AtletaProgressi scheda={scheda} user={user} sessioni={_rawSupa} misurazioni={supaMisurazioni}/>}

      {atlView==="scheda"&&<div className="cliente-body">
        {appuntamenti}

        <div className="scheda-info-card">
          <div className="scheda-info-title">{scheda.nome||"La tua scheda"}</div>
          <div className="scheda-info-meta">
            {scheda.pt&&<span>👤 PT: <strong style={{color:"var(--text)"}}>{scheda.pt}</strong></span>}
            {scheda.obiettivo&&<span>🎯 {scheda.obiettivo}</span>}
            {scheda.livello&&<span>📊 {scheda.livello}</span>}
            <span>📅 Assegnata il {scheda.assegnataIl?fmtDateShort(scheda.assegnataIl):"—"}</span>
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

        <MonthCalendar
          year={calMonth.year}
          month={calMonth.month}
          onPrev={()=>setCalMonth(({year:y,month:m})=>m===0?{year:y-1,month:11}:{year:y,month:m-1})}
          onNext={()=>setCalMonth(({year:y,month:m})=>m===11?{year:y+1,month:0}:{year:y,month:m+1})}
          sessionsByDate={sessionsByDate}
          selectedDate={selectedDate}
          onDaySelect={(dateStr,giornoKey)=>{setSelectedDate(dateStr);if(giornoKey)setActiveDay(giornoKey);}}
          todayStr={todayStr}
        />
        <div style={{textAlign:"center",fontSize:12,fontWeight:600,color:isToday?"var(--muted)":"var(--accent2)",marginBottom:12,letterSpacing:.3}}>
          {isToday?`Oggi — ${fmtDateLong(selectedDate)}`:fmtDateLong(selectedDate)}
        </div>

        {justSaved&&(
          <div className="session-saved-banner" style={{background:"rgba(71,255,232,.15)",borderColor:"rgba(71,255,232,.4)",fontWeight:700}}>
            ✓ Sessione salvata con successo!
          </div>
        )}
        {saveErr&&(
          <div className="session-saved-banner" style={{background:"rgba(255,71,87,.1)",borderColor:"rgba(255,71,87,.4)",color:"var(--danger)",fontWeight:700}}>
            {saveErr}
          </div>
        )}
        {!justSaved&&!saveErr&&saved&&(
          <div className="session-saved-banner">
            {isToday
              ? "↩ Allenamento di oggi già salvato — puoi modificarlo e risalvare"
              : `↩ Allenamento del ${fmtDateShort(selectedDate)} già salvato — puoi modificarlo e risalvare`
            }
          </div>
        )}

        {esercizi.map(ex=>stati[ex.exKey]&&(
          <EsercizioCard
            key={`${ex.exKey}-${selectedDate}`}
            ex={ex}
            stato={stati[ex.exKey]}
            ultima={ultimaVolta(_rawSupa, ex, selectedDate)}
            onChange={st=>setStati(p=>({...p,[ex.exKey]:st}))}
          />
        ))}

        <button className="save-session-btn" onClick={handleSave} disabled={saving} style={saving?{opacity:.6}:undefined}>
          {saveBtnLabel}
        </button>
      </div>}
    </div>
  );
}
