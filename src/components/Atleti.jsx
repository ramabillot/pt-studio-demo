import React, { useState, useEffect } from "react";
import { OBIETTIVI, LIVELLI, DAYS, EXERCISES, CAT_COLORS } from "../data.js";
import { loadAtleti, persistAtleti, getInitials, calcEta, saveMisure } from "../utils.js";
import { DEMO_MISURE_0 } from "../utils.js";
import { supabase } from "../supabase.js";
import { BackBtn } from "./Sidebar.jsx";
import { SchedaDemoSection } from "./Builder.jsx";
import { MisureSection, ProgressiSectionPT } from "./AtletaView.jsx";

const COLORS=["#e8ff47","#47ffe8","#ff9f47","#ff47a3","#a47ffe","#47a3ff"];

function rowToAtleta(row) {
  return {
    id:          row.id,
    pt_id:       row.pt_id,
    nome:        row.nome,
    cognome:     row.cognome,
    username:    row.username,
    pin:         row.pin,
    sesso:       row.sesso || "",
    dataNascita: row.data_nascita || "",
    altezza:     row.altezza_cm ? String(row.altezza_cm) : "",
    obiettivo:   row.obiettivo || "",
    livello:     row.livello || "",
    note:        row.note_pt || "",
    telefono:    row.telefono || "",
    email:       row.email || "",
    color:       row.color || COLORS[0],
    lastSeen:    "—",
    schede:      Array.isArray(row.schede) ? (row.schede[0]?.count || 0) : 0,
  };
}

const FORM_EMPTY = {nome:"",cognome:"",username:"",pin:"",obiettivo:"",livello:"",altezza:"",dataNascita:"",sesso:"",note:"",telefono:"",email:""};

export default function Atleti({setView, setBuilderPreload, user}) {
  const [atleti,setAtleti]=useState(()=>user?.isSupabase ? [] : loadAtleti());
  const [loading,setLoading]=useState(!!user?.isSupabase);
  const [selected,setSelected]=useState(null);
  const [showForm,setShowForm]=useState(false);
  const [editingProfilo,setEditingProfilo]=useState(false);
  const [editProfiloForm,setEditProfiloForm]=useState(null);
  const [limitErr,setLimitErr]=useState("");
  const [profiloErr,setProfiloErr]=useState("");
  const [deleteConfirm,setDeleteConfirm]=useState(false);
  const [form,setForm]=useState(FORM_EMPTY);
  // Scheda Supabase dell'atleta selezionato
  const [atletaScheda,setAtletaScheda]=useState(null);
  const [loadingScheda,setLoadingScheda]=useState(false);
  // Credenziali
  const [changePIN,setChangePIN]=useState({show:false,pin:"",err:""});
  const [copied,setCopied]=useState(null); // "username" | "pin" | null

  // Seed demo misure only for demo mode
  useEffect(()=>{
    if(user?.isSupabase) return;
    const existing = localStorage.getItem("pt_misure_0");
    if(!existing) saveMisure(0, DEMO_MISURE_0);
  },[]);

  // Load athletes from Supabase for real users
  useEffect(()=>{
    if(!user?.isSupabase) return;
    setLoading(true);
    supabase.from("atleti").select("*, schede(count)").eq("pt_id",user.supabaseId)
      .order("created_at",{ascending:true})
      .then(({data,error})=>{
        setLoading(false);
        if(error){ console.error("[atleti load]",error); return; }
        setAtleti((data||[]).map(rowToAtleta));
      });
  },[user?.supabaseId]);

  const addAtleta=async()=>{
    if(!form.nome||!form.cognome) return;
    if(!form.username.trim()){ setLimitErr("Username obbligatorio"); return; }
    if(!/^\d{4}$/.test(form.pin)){ setLimitErr("Il PIN deve essere di esattamente 4 cifre numeriche"); return; }
    if(user?.isSupabase && user?.max_atleti != null && atleti.length >= user.max_atleti){
      setLimitErr(`Hai raggiunto il limite del tuo piano (${user.max_atleti} atleti). Contatta l'amministratore per aumentare il limite.`);
      return;
    }
    setLimitErr("");

    if(user?.isSupabase){
      const {data,error}=await supabase.from("atleti").insert({
        pt_id:       user.supabaseId,
        nome:        form.nome,
        cognome:     form.cognome,
        username:    form.username.trim().toLowerCase(),
        pin:         form.pin,
        sesso:       form.sesso,
        data_nascita: form.dataNascita || null,
        altezza_cm:  form.altezza ? parseInt(form.altezza) : null,
        obiettivo:   form.obiettivo,
        livello:     form.livello,
        note_pt:     form.note,
        telefono:    form.telefono||null,
        email:       form.email||null,
        color:       COLORS[atleti.length%COLORS.length],
      }).select().single();
      if(error){
        setLimitErr(error.code==="23505" ? "Username già in uso per questo account. Scegli un altro username." : error.message);
        return;
      }
      setAtleti(prev=>[...prev,rowToAtleta(data)]);
    } else {
      const updated=[...atleti,{id:Date.now(),color:COLORS[atleti.length%COLORS.length],lastSeen:"Adesso",schede:0,...form}];
      setAtleti(updated);
      persistAtleti(updated);
    }
    setForm(FORM_EMPTY);
    setShowForm(false);
  };

  const saveProfilo=async()=>{
    if(!editProfiloForm) return;
    setProfiloErr("");

    if(user?.isSupabase){
      const {error}=await supabase.from("atleti").update({
        obiettivo:   editProfiloForm.obiettivo,
        livello:     editProfiloForm.livello,
        altezza_cm:  editProfiloForm.altezza ? parseInt(editProfiloForm.altezza) : null,
        data_nascita: editProfiloForm.dataNascita || null,
        sesso:       editProfiloForm.sesso,
        note_pt:     editProfiloForm.note,
        telefono:    editProfiloForm.telefono||null,
        email:       editProfiloForm.email||null,
      }).eq("id",selected.id);
      if(error){ setProfiloErr(error.message); return; }
      const updated=atleti.map(a=>a.id===selected.id?{...a,...editProfiloForm}:a);
      setAtleti(updated);
      setSelected({...selected,...editProfiloForm});
    } else {
      const updated=atleti.map(a=>a.id===selected.id?{...a,...editProfiloForm}:a);
      setAtleti(updated);
      persistAtleti(updated);
      setSelected(updated.find(a=>a.id===selected.id));
    }
    setEditingProfilo(false);
  };

  const deleteAtleta=async()=>{
    if(!selected) return;
    if(user?.isSupabase){
      const {error}=await supabase.from("atleti").delete().eq("id",selected.id);
      if(error){ console.error("[atleti delete]",error); return; }
    } else {
      persistAtleti(atleti.filter(a=>a.id!==selected.id));
    }
    setAtleti(prev=>prev.filter(a=>a.id!==selected.id));
    setSelected(null);
    setDeleteConfirm(false);
  };

  // Carica scheda Supabase quando un atleta reale viene selezionato
  useEffect(()=>{
    if(!selected || !user?.isSupabase){ setAtletaScheda(null); return; }
    setLoadingScheda(true);
    supabase.from("schede")
      .select("*, scheda_giorni(*, scheda_esercizi(*))")
      .eq("atleta_id",selected.id)
      .maybeSingle()
      .then(({data})=>{ setAtletaScheda(data||null); setLoadingScheda(false); });
  },[selected?.id,user?.isSupabase]);

  // Converte una scheda Supabase nel formato locale giorni/dayNames per il Builder
  const schedaToPreload=(scheda,atleta)=>{
    const giorni={A:[],B:[],C:[],D:[],E:[],F:[],G:[]};
    const dayNames={A:"",B:"",C:"",D:"",E:"",F:"",G:""};
    (scheda.scheda_giorni||[])
      .sort((a,b)=>a.ordine-b.ordine)
      .forEach(g=>{
        const key=g.giorno_key||String.fromCharCode(65+g.ordine);
        dayNames[key]=g.nome||"";
        giorni[key]=(g.scheda_esercizi||[])
          .sort((a,b)=>a.ordine-b.ordine)
          .map((ex,i)=>{
            const exFull=EXERCISES.find(e=>e.id===ex.esercizio_id_int)||{};
            return {
              ...exFull,
              id:ex.esercizio_id_int||0,
              name:ex.nome||exFull.name||"",
              sets:ex.serie||3,
              reps:parseInt(ex.reps)||10,
              rest:ex.rest_sec||90,
              uid:Date.now()+i,
            };
          });
      });
    return {
      schedaId:scheda.id,
      atleta,
      atletaId:atleta.id,
      nome:atleta.nome,
      cognome:atleta.cognome,
      obiettivo:scheda.obiettivo||"",
      livello:scheda.livello||"",
      giorni,
      dayNames,
    };
  };

  const savePINChange=async()=>{
    if(!/^\d{4}$/.test(changePIN.pin)){ setChangePIN(p=>({...p,err:"Il PIN deve essere di 4 cifre numeriche"})); return; }
    const {error}=await supabase.from("atleti").update({pin:changePIN.pin}).eq("id",selected.id);
    if(error){ setChangePIN(p=>({...p,err:error.message})); return; }
    setAtleti(prev=>prev.map(a=>a.id===selected.id?{...a,pin:changePIN.pin}:a));
    setSelected(prev=>({...prev,pin:changePIN.pin}));
    setChangePIN({show:false,pin:"",err:""});
  };

  const copyToClipboard=(text,key)=>{
    navigator.clipboard.writeText(text).then(()=>{ setCopied(key); setTimeout(()=>setCopied(null),1800); });
  };

  const openSelected=(a)=>{ setSelected(a); setDeleteConfirm(false); setEditingProfilo(false); setProfiloErr(""); setChangePIN({show:false,pin:"",err:""}); };
  const closeSelected=()=>{ setSelected(null); setDeleteConfirm(false); setChangePIN({show:false,pin:"",err:""}); };

  return (
    <div>
      <BackBtn setView={setView}/>
      <div className="page-head" style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
        <div>
          <div className="page-title">Atleti</div>
          <div className="page-sub">{loading?"Caricamento…":`${atleti.length} atleti attivi`}</div>
        </div>
        <button className="btn-primary" onClick={()=>{setShowForm(true);setLimitErr("");}}>+ Nuovo atleta</button>
      </div>

      {loading&&(
        <div style={{color:"var(--muted)",fontSize:14,textAlign:"center",padding:"32px 0"}}>Caricamento atleti…</div>
      )}

      <div className="clients-grid">
        {atleti.map(a=>(
          <div className="client-item" key={a.id} onClick={()=>openSelected(a)}>
            <div className="avatar" style={{background:a.color}}>{getInitials(a.nome,a.cognome)}</div>
            <div className="client-info">
              <div className="client-name">{a.nome} {a.cognome}</div>
              <div className="client-tags">
                {a.obiettivo&&<span className="tag">{a.obiettivo}</span>}
                {a.livello&&<span className="tag">{a.livello}</span>}
              </div>
              <div className="client-meta">
                {!user?.isSupabase&&<span>🕐 {a.lastSeen}</span>}
                <span>📋 {a.schede} schede</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selected&&(
        <div className="overlay" onClick={closeSelected}>
          <div className="client-modal" onClick={e=>e.stopPropagation()}>
            <div className="client-modal-header">
              <div className="avatar" style={{background:selected.color,width:52,height:52,fontSize:18}}>{getInitials(selected.nome,selected.cognome)}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:20,fontWeight:700}}>{selected.nome} {selected.cognome}</div>
                <div style={{fontSize:13,color:"var(--muted)",marginTop:2}}>{selected.obiettivo} · {selected.livello}</div>
              </div>
              <button className="modal-close" onClick={closeSelected}>✕</button>
            </div>
            <div className="client-modal-body">

              {/* ── Credenziali accesso ── */}
              <div style={{marginBottom:20,padding:"12px 14px",background:"var(--card2)",border:"1px solid var(--border)",borderRadius:10}}>
                <div style={{fontSize:12,fontWeight:600,letterSpacing:1,textTransform:"uppercase",color:"var(--muted)",marginBottom:10}}>Credenziali accesso</div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:12,color:"var(--muted)",width:72,flexShrink:0}}>Username</span>
                    <code style={{flex:1,fontSize:13,color:"var(--text)",background:"rgba(255,255,255,.06)",padding:"4px 8px",borderRadius:6}}>{selected.username}</code>
                    <button className="btn-ghost" style={{fontSize:11,padding:"4px 10px",flexShrink:0}} onClick={()=>copyToClipboard(selected.username,"username")}>
                      {copied==="username"?"✓ Copiato":"Copia"}
                    </button>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:12,color:"var(--muted)",width:72,flexShrink:0}}>PIN</span>
                    <code style={{flex:1,fontSize:13,color:"var(--text)",background:"rgba(255,255,255,.06)",padding:"4px 8px",borderRadius:6}}>{selected.pin}</code>
                    <button className="btn-ghost" style={{fontSize:11,padding:"4px 10px",flexShrink:0}} onClick={()=>copyToClipboard(selected.pin,"pin")}>
                      {copied==="pin"?"✓ Copiato":"Copia"}
                    </button>
                  </div>
                </div>
                {user?.isSupabase&&(
                  <div style={{marginTop:10}}>
                    {!changePIN.show?(
                      <button className="btn-ghost" style={{fontSize:11,padding:"4px 10px"}} onClick={()=>setChangePIN({show:true,pin:"",err:""})}>🔑 Cambia PIN</button>
                    ):(
                      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                        <input
                          className="field-input"
                          type="text"
                          inputMode="numeric"
                          maxLength={4}
                          placeholder="Nuovo PIN (4 cifre)"
                          value={changePIN.pin}
                          onChange={e=>setChangePIN(p=>({...p,pin:e.target.value.replace(/\D/g,""),err:""}))}
                          style={{width:150,letterSpacing:"0.3em"}}
                        />
                        <button className="btn-primary" style={{fontSize:12,padding:"6px 14px"}} onClick={savePINChange}>Salva PIN</button>
                        <button className="btn-ghost" style={{fontSize:12,padding:"6px 10px"}} onClick={()=>setChangePIN({show:false,pin:"",err:""})}>Annulla</button>
                        {changePIN.err&&<span style={{fontSize:12,color:"var(--danger)"}}>{changePIN.err}</span>}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{fontSize:12,fontWeight:600,letterSpacing:1,textTransform:"uppercase",color:"var(--muted)",marginBottom:12}}>Scheda assegnata</div>
              {selected.isDemoAtleta?(
                <SchedaDemoSection setView={setView} onClose={()=>setSelected(null)} setBuilderPreload={setBuilderPreload}/>
              ):user?.isSupabase?(
                loadingScheda?(
                  <div style={{color:"var(--muted)",fontSize:14}}>Caricamento scheda…</div>
                ):atletaScheda?(
                  <div>
                    {(atletaScheda.scheda_giorni||[]).sort((a,b)=>a.ordine-b.ordine).map(g=>{
                      const key=g.giorno_key||String.fromCharCode(65+g.ordine);
                      const label=g.nome?`${key} — ${g.nome}`:`Giorno ${key}`;
                      return <span key={g.id} className="scheda-chip">📋 {label} · {(g.scheda_esercizi||[]).length} esercizi</span>;
                    })}
                    <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
                      <button className="btn-primary" style={{fontSize:12,padding:"6px 14px"}} onClick={()=>{
                        setBuilderPreload(schedaToPreload(atletaScheda,selected));
                        closeSelected();
                        setView("builder");
                      }}>✏️ Modifica nel Builder</button>
                    </div>
                  </div>
                ):(
                  <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                    <div style={{color:"var(--muted)",fontSize:14,flex:1}}>Nessuna scheda assegnata ancora.</div>
                    <button className="btn-ghost" style={{fontSize:12,padding:"6px 14px"}} onClick={()=>{
                      setBuilderPreload({
                        atleta:selected,atletaId:selected.id,
                        nome:selected.nome,cognome:selected.cognome,
                        obiettivo:selected.obiettivo||"",livello:selected.livello||"",
                        giorni:{A:[],B:[],C:[],D:[],E:[],F:[],G:[]},
                        dayNames:{A:"",B:"",C:"",D:"",E:"",F:"",G:""},
                      });
                      closeSelected();
                      setView("builder");
                    }}>+ Crea scheda</button>
                  </div>
                )
              ):selected.schede>0?(
                Array.from({length:selected.schede},(_,i)=>(
                  <span key={i} className="scheda-chip">📋 Scheda {i+1} — Giorno {DAYS[i%3]}</span>
                ))
              ):<div style={{color:"var(--muted)",fontSize:14}}>Nessuna scheda assegnata ancora.</div>}

              <div style={{marginTop:24}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                  <div style={{fontSize:12,fontWeight:600,letterSpacing:1,textTransform:"uppercase",color:"var(--muted)"}}>Profilo</div>
                  {!editingProfilo&&(
                    <button className="btn-ghost" style={{fontSize:11,padding:"4px 10px"}} onClick={()=>{setProfiloErr("");setEditProfiloForm({obiettivo:selected.obiettivo||"",livello:selected.livello||"",altezza:selected.altezza||"",dataNascita:selected.dataNascita||"",sesso:selected.sesso||"",note:selected.note||"",telefono:selected.telefono||"",email:selected.email||""});setEditingProfilo(true);}}>✏️ Modifica</button>
                  )}
                </div>
                {editingProfilo&&editProfiloForm?(
                  <div style={{background:"var(--card2)",border:"1px solid var(--border)",borderRadius:10,padding:"14px 16px",marginBottom:10}}>
                    <div className="form-row" style={{marginBottom:10}}>
                      <label className="field-label">Obiettivo<select className="field-select" value={editProfiloForm.obiettivo} onChange={e=>setEditProfiloForm(p=>({...p,obiettivo:e.target.value}))}><option value="">— seleziona —</option>{OBIETTIVI.map(o=><option key={o}>{o}</option>)}</select></label>
                      <label className="field-label">Livello<select className="field-select" value={editProfiloForm.livello} onChange={e=>setEditProfiloForm(p=>({...p,livello:e.target.value}))}><option value="">— seleziona —</option>{LIVELLI.map(l=><option key={l}>{l}</option>)}</select></label>
                    </div>
                    <div className="form-row" style={{marginBottom:10}}>
                      <label className="field-label">Altezza (cm)<input className="field-input" type="number" min={100} max={250} placeholder="175" value={editProfiloForm.altezza} onChange={e=>setEditProfiloForm(p=>({...p,altezza:e.target.value}))}/></label>
                      <label className="field-label">Data di nascita<input className="field-input" type="date" value={editProfiloForm.dataNascita} onChange={e=>setEditProfiloForm(p=>({...p,dataNascita:e.target.value}))}/></label>
                    </div>
                    <label className="field-label" style={{marginBottom:10}}>Sesso<select className="field-select" value={editProfiloForm.sesso} onChange={e=>setEditProfiloForm(p=>({...p,sesso:e.target.value}))}><option value="">— non specificato —</option><option value="M">M</option><option value="F">F</option><option value="Altro">Altro</option></select></label>
                    <label className="field-label" style={{marginBottom:10}}>Note PT<textarea className="field-input" rows={3} placeholder="Infortuni, note mediche, preferenze…" value={editProfiloForm.note} onChange={e=>setEditProfiloForm(p=>({...p,note:e.target.value}))} style={{resize:"vertical",fontFamily:"'DM Sans',sans-serif",fontSize:14}}/></label>
                    <div className="form-row" style={{marginBottom:10}}>
                      <label className="field-label">Telefono<input className="field-input" type="tel" placeholder="+39 333 1234567" value={editProfiloForm.telefono||""} onChange={e=>setEditProfiloForm(p=>({...p,telefono:e.target.value}))}/></label>
                      <label className="field-label">Email<input className="field-input" type="email" placeholder="atleta@email.com" value={editProfiloForm.email||""} onChange={e=>setEditProfiloForm(p=>({...p,email:e.target.value}))}/></label>
                    </div>
                    {profiloErr&&<div style={{color:"var(--danger)",fontSize:12,marginBottom:8}}>{profiloErr}</div>}
                    <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                      <button className="btn-ghost" style={{fontSize:12,padding:"6px 14px"}} onClick={()=>setEditingProfilo(false)}>Annulla</button>
                      <button className="btn-primary" style={{fontSize:12,padding:"6px 14px"}} onClick={saveProfilo}>Salva</button>
                    </div>
                  </div>
                ):(
                  <div className="profilo-grid">
                    <div className="profilo-cell">
                      <div className="profilo-cell-label">Altezza</div>
                      <div className="profilo-cell-val">{selected.altezza?`${selected.altezza} cm`:"—"}</div>
                    </div>
                    <div className="profilo-cell">
                      <div className="profilo-cell-label">Età</div>
                      <div className="profilo-cell-val">{selected.dataNascita&&calcEta(selected.dataNascita)!==null?`${calcEta(selected.dataNascita)} anni`:"—"}</div>
                    </div>
                    <div className="profilo-cell">
                      <div className="profilo-cell-label">Sesso</div>
                      <div className="profilo-cell-val">{selected.sesso||"—"}</div>
                    </div>
                    <div className="profilo-cell" style={{gridColumn:"1/-1"}}>
                      <div className="profilo-cell-label">Note PT</div>
                      <div className="profilo-cell-val" style={{fontSize:13,whiteSpace:"pre-wrap"}}>{selected.note||"—"}</div>
                    </div>
                    {(selected.telefono||selected.email)&&(
                      <div className="profilo-cell" style={{gridColumn:"1/-1"}}>
                        <div className="profilo-cell-label">Contatti</div>
                        <div className="profilo-cell-val" style={{fontSize:13,display:"flex",gap:16,flexWrap:"wrap"}}>
                          {selected.telefono&&<span>📞 {selected.telefono}</span>}
                          {selected.email&&<span>✉️ {selected.email}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{marginTop:16,padding:"14px 16px",background:"var(--card2)",borderRadius:10,border:"1px solid var(--border)"}}>
                <div style={{fontSize:12,fontWeight:600,letterSpacing:1,textTransform:"uppercase",color:"var(--muted)",marginBottom:8}}>Statistiche</div>
                <div style={{display:"flex",gap:24,fontSize:14}}>
                  {!user?.isSupabase&&<div><span style={{color:"var(--muted)"}}>Ultimo accesso: </span><strong>{selected.lastSeen}</strong></div>}
                  <div><span style={{color:"var(--muted)"}}>Schede: </span><strong style={{color:"var(--accent)"}}>{selected.schede||0}</strong></div>
                </div>
              </div>

              <div style={{marginTop:24}}>
                <div style={{fontSize:12,fontWeight:600,letterSpacing:1,textTransform:"uppercase",color:"var(--muted)",marginBottom:12}}>📏 Misurazioni</div>
                <MisureSection
                  atletaId={selected.id}
                  ptId={user?.supabaseId}
                  supabaseAtletaId={user?.isSupabase ? selected.id : null}
                />
              </div>

              <div style={{marginTop:24}}>
                <div style={{fontSize:12,fontWeight:600,letterSpacing:1,textTransform:"uppercase",color:"var(--muted)",marginBottom:12}}>Progressi allenamento</div>
                <ProgressiSectionPT atleta={selected} user={user}/>
              </div>

              <div style={{marginTop:24,paddingTop:16,borderTop:"1px solid var(--border)"}}>
                {!deleteConfirm?(
                  <button className="btn-danger" style={{fontSize:12}} onClick={()=>setDeleteConfirm(true)}>🗑️ Elimina atleta</button>
                ):(
                  <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                    <span style={{fontSize:13,color:"var(--text)"}}>Eliminare {selected.nome} {selected.cognome}? L'operazione non è reversibile.</span>
                    <div style={{display:"flex",gap:8}}>
                      <button className="btn-ghost" style={{fontSize:12,padding:"5px 12px"}} onClick={()=>setDeleteConfirm(false)}>Annulla</button>
                      <button className="btn-danger" onClick={deleteAtleta}>Elimina</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm&&(
        <div className="overlay" onClick={()=>setShowForm(false)}>
          <div className="form-modal" style={{maxWidth:520}} onClick={e=>e.stopPropagation()}>
            <div className="form-modal-header">
              <div className="modal-title">Nuovo Atleta</div>
              <button className="modal-close" onClick={()=>setShowForm(false)}>✕</button>
            </div>
            <div className="form-modal-body">
              <div className="form-row">
                <label className="field-label">Nome<input className="field-input" type="text" placeholder="Marco" value={form.nome} onChange={e=>setForm(p=>({...p,nome:e.target.value}))}/></label>
                <label className="field-label">Cognome<input className="field-input" type="text" placeholder="Rossi" value={form.cognome} onChange={e=>setForm(p=>({...p,cognome:e.target.value}))}/></label>
              </div>
              <div className="form-row">
                <label className="field-label">Username<input className="field-input" type="text" placeholder="marco_rossi" value={form.username} onChange={e=>setForm(p=>({...p,username:e.target.value}))}/></label>
                <label className="field-label">PIN (4 cifre)<input className="field-input" type="text" inputMode="numeric" maxLength={4} placeholder="••••" value={form.pin} onChange={e=>setForm(p=>({...p,pin:e.target.value.replace(/\D/g,"")}))} style={{letterSpacing:"0.3em"}}/></label>
              </div>
              <div className="form-row">
                <label className="field-label">Obiettivo<select className="field-select" value={form.obiettivo} onChange={e=>setForm(p=>({...p,obiettivo:e.target.value}))}><option value="">— seleziona —</option>{OBIETTIVI.map(o=><option key={o}>{o}</option>)}</select></label>
                <label className="field-label">Livello<select className="field-select" value={form.livello} onChange={e=>setForm(p=>({...p,livello:e.target.value}))}><option value="">— seleziona —</option>{LIVELLI.map(l=><option key={l}>{l}</option>)}</select></label>
              </div>
              <div className="form-row">
                <label className="field-label">Altezza (cm)<input className="field-input" type="number" min={100} max={250} placeholder="175" value={form.altezza} onChange={e=>setForm(p=>({...p,altezza:e.target.value}))}/></label>
                <label className="field-label">Data di nascita<input className="field-input" type="date" value={form.dataNascita} onChange={e=>setForm(p=>({...p,dataNascita:e.target.value}))}/></label>
              </div>
              <label className="field-label">Sesso<select className="field-select" value={form.sesso} onChange={e=>setForm(p=>({...p,sesso:e.target.value}))}><option value="">— non specificato —</option><option value="M">M</option><option value="F">F</option><option value="Altro">Altro</option></select></label>
              <label className="field-label">Note PT<textarea className="field-input" rows={3} placeholder="Infortuni, note mediche, preferenze…" value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))} style={{resize:"vertical",fontFamily:"'DM Sans',sans-serif",fontSize:14}}/></label>
              <div className="form-row">
                <label className="field-label">Telefono <span style={{color:"var(--muted)",fontSize:11}}>(opzionale)</span><input className="field-input" type="tel" placeholder="+39 333 1234567" value={form.telefono} onChange={e=>setForm(p=>({...p,telefono:e.target.value}))}/></label>
                <label className="field-label">Email <span style={{color:"var(--muted)",fontSize:11}}>(opzionale)</span><input className="field-input" type="email" placeholder="atleta@email.com" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))}/></label>
              </div>
            </div>
            {limitErr&&<div style={{color:"var(--danger)",fontSize:13,padding:"10px 16px",background:"rgba(255,71,87,.07)",border:"1px solid rgba(255,71,87,.2)",borderRadius:8,margin:"0 0 4px"}}>{limitErr}</div>}
            <div className="form-actions">
              <button className="btn-ghost" onClick={()=>{setShowForm(false);setLimitErr("");}}>Annulla</button>
              <button className="btn-primary" onClick={addAtleta}>Aggiungi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
