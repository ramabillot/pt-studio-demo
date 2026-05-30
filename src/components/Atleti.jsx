import React, { useState, useEffect } from "react";
import { OBIETTIVI, LIVELLI, DAYS } from "../data.js";
import { loadAtleti, persistAtleti, getInitials, calcEta, saveMisure } from "../utils.js";
import { DEMO_MISURE_0 } from "../utils.js";
import { BackBtn } from "./Sidebar.jsx";
import { SchedaDemoSection } from "./Builder.jsx";
import { MisureSection, ProgressiSectionPT } from "./AtletaView.jsx";

export default function Atleti({setView, setBuilderPreload, user}) {
  const [atleti,setAtleti]=useState(()=>user?.isSupabase ? [] : loadAtleti());
  const [selected,setSelected]=useState(null);
  const [showForm,setShowForm]=useState(false);
  const [editingProfilo,setEditingProfilo]=useState(false);
  const [editProfiloForm,setEditProfiloForm]=useState(null);
  const [limitErr,setLimitErr]=useState("");
  const FORM_EMPTY = {nome:"",cognome:"",username:"",pin:"",obiettivo:"",livello:"",altezza:"",dataNascita:"",sesso:"",note:""};
  const [form,setForm]=useState(FORM_EMPTY);

  const COLORS=["#e8ff47","#47ffe8","#ff9f47","#ff47a3","#a47ffe","#47a3ff"];

  useEffect(()=>{
    const existing = localStorage.getItem("pt_misure_0");
    if(!existing) saveMisure(0, DEMO_MISURE_0);
  },[]);

  const addAtleta=()=>{
    if(!form.nome||!form.cognome) return;
    if(!form.username.trim()){ setLimitErr("Username obbligatorio"); return; }
    if(!/^\d{4}$/.test(form.pin)){ setLimitErr("Il PIN deve essere di esattamente 4 cifre numeriche"); return; }
    if(user?.isSupabase && user?.max_atleti != null && atleti.length >= user.max_atleti){
      setLimitErr(`Hai raggiunto il limite del tuo piano (${user.max_atleti} atleti). Contatta l'amministratore per aumentare il limite.`);
      return;
    }
    setLimitErr("");
    const updated=[...atleti,{id:Date.now(),color:COLORS[atleti.length%COLORS.length],lastSeen:"Adesso",schede:0,...form}];
    setAtleti(updated);
    persistAtleti(updated);
    setForm(FORM_EMPTY);
    setShowForm(false);
  };

  const saveProfilo=()=>{
    if(!editProfiloForm) return;
    const updated = atleti.map(a=>a.id===selected.id?{...a,...editProfiloForm}:a);
    setAtleti(updated);
    persistAtleti(updated);
    const updated_sel = updated.find(a=>a.id===selected.id);
    setSelected(updated_sel);
    setEditingProfilo(false);
  };

  return (
    <div>
      <BackBtn setView={setView}/>
      <div className="page-head" style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
        <div><div className="page-title">Atleti</div><div className="page-sub">{atleti.length} atleti attivi</div></div>
        <button className="btn-primary" onClick={()=>{setShowForm(true);setLimitErr("");}}>+ Nuovo atleta</button>
      </div>

      <div className="clients-grid">
        {atleti.map(a=>(
          <div className="client-item" key={a.id} onClick={()=>setSelected(a)}>
            <div className="avatar" style={{background:a.color}}>{getInitials(a.nome,a.cognome)}</div>
            <div className="client-info">
              <div className="client-name">{a.nome} {a.cognome}</div>
              <div className="client-tags">
                {a.obiettivo&&<span className="tag">{a.obiettivo}</span>}
                {a.livello&&<span className="tag">{a.livello}</span>}
              </div>
              <div className="client-meta">
                <span>🕐 {a.lastSeen}</span>
                <span>📋 {a.schede} schede</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selected&&(
        <div className="overlay" onClick={()=>setSelected(null)}>
          <div className="client-modal" onClick={e=>e.stopPropagation()}>
            <div className="client-modal-header">
              <div className="avatar" style={{background:selected.color,width:52,height:52,fontSize:18}}>{getInitials(selected.nome,selected.cognome)}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:20,fontWeight:700}}>{selected.nome} {selected.cognome}</div>
                <div style={{fontSize:13,color:"var(--muted)",marginTop:2}}>{selected.obiettivo} · {selected.livello}</div>
              </div>
              <button className="modal-close" onClick={()=>setSelected(null)}>✕</button>
            </div>
            <div className="client-modal-body">
              <div style={{fontSize:12,fontWeight:600,letterSpacing:1,textTransform:"uppercase",color:"var(--muted)",marginBottom:12}}>Scheda assegnata</div>
              {selected.isDemoAtleta?(
                <SchedaDemoSection setView={setView} onClose={()=>setSelected(null)} setBuilderPreload={setBuilderPreload}/>
              ):selected.schede>0?(
                Array.from({length:selected.schede},(_,i)=>(
                  <span key={i} className="scheda-chip">📋 Scheda {i+1} — Giorno {DAYS[i%3]}</span>
                ))
              ):<div style={{color:"var(--muted)",fontSize:14}}>Nessuna scheda assegnata ancora.</div>}

              <div style={{marginTop:24}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                  <div style={{fontSize:12,fontWeight:600,letterSpacing:1,textTransform:"uppercase",color:"var(--muted)"}}>Profilo</div>
                  {!editingProfilo&&(
                    <button className="btn-ghost" style={{fontSize:11,padding:"4px 10px"}} onClick={()=>{setEditProfiloForm({obiettivo:selected.obiettivo||"",livello:selected.livello||"",altezza:selected.altezza||"",dataNascita:selected.dataNascita||"",sesso:selected.sesso||"",note:selected.note||""});setEditingProfilo(true);}}>✏️ Modifica</button>
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
                  </div>
                )}
              </div>

              <div style={{marginTop:16,padding:"14px 16px",background:"var(--card2)",borderRadius:10,border:"1px solid var(--border)"}}>
                <div style={{fontSize:12,fontWeight:600,letterSpacing:1,textTransform:"uppercase",color:"var(--muted)",marginBottom:8}}>Statistiche</div>
                <div style={{display:"flex",gap:24,fontSize:14}}>
                  <div><span style={{color:"var(--muted)"}}>Ultimo accesso: </span><strong>{selected.lastSeen}</strong></div>
                  <div><span style={{color:"var(--muted)"}}>Schede: </span><strong style={{color:"var(--accent)"}}>{selected.schede||1}</strong></div>
                </div>
              </div>

              <div style={{marginTop:24}}>
                <div style={{fontSize:12,fontWeight:600,letterSpacing:1,textTransform:"uppercase",color:"var(--muted)",marginBottom:12}}>📏 Misurazioni</div>
                <MisureSection atletaId={selected.id}/>
              </div>

              <div style={{marginTop:24}}>
                <div style={{fontSize:12,fontWeight:600,letterSpacing:1,textTransform:"uppercase",color:"var(--muted)",marginBottom:12}}>Progressi allenamento</div>
                <ProgressiSectionPT atleta={selected}/>
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
