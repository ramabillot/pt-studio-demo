import { useState, useEffect } from "react";
import { OBIETTIVI, LIVELLI, EXERCISES } from "../data.js";
import { getInitials, calcEta } from "../utils.js";
import { supabase } from "../supabase.js";
import { linkAtleta } from "../lib/app.js";
import { BackBtn } from "./Sidebar.jsx";
import { MisureSection } from "./MisureSection.jsx";
import AllenamentiAtletaPT from "./AllenamentiAtletaPT.jsx";
import { useTranslation, Trans } from "react-i18next";
import { valore, nomeGiorno } from "../i18n/index.js";

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
    archivedAt:  row.archived_at || null,
  };
}

const FORM_EMPTY = {nome:"",cognome:"",username:"",pin:"",obiettivo:"",livello:"",altezza:"",dataNascita:"",sesso:"",note:"",telefono:"",email:""};

export default function Atleti({setView, setBuilderPreload, user}) {
  const { t } = useTranslation();
  const [atleti,setAtleti]=useState([]);
  const [loading,setLoading]=useState(true);
  const [selected,setSelected]=useState(null);
  const [showForm,setShowForm]=useState(false);
  const [editingProfilo,setEditingProfilo]=useState(false);
  const [editProfiloForm,setEditProfiloForm]=useState(null);
  const [limitErr,setLimitErr]=useState("");
  const [profiloErr,setProfiloErr]=useState("");
  const [archiveConfirm,setArchiveConfirm]=useState(false);
  const [hardDelete,setHardDelete]=useState({show:false,typed:""});
  const [showArchived,setShowArchived]=useState(false);
  const [form,setForm]=useState(FORM_EMPTY);
  const [atletaScheda,setAtletaScheda]=useState(null);
  const [loadingScheda,setLoadingScheda]=useState(false);
  const [changePIN,setChangePIN]=useState({show:false,pin:"",err:""});
  const [copied,setCopied]=useState(null);

  useEffect(()=>{
    setLoading(true);
    supabase.from("atleti").select("*, schede(count)").eq("pt_id",user.supabaseId)
      .order("created_at",{ascending:true})
      .then(({data,error})=>{
        setLoading(false);
        if(error){ console.error("[atleti load]",error); return; }
        setAtleti((data||[]).map(rowToAtleta));
      });
  },[user?.supabaseId]);

  const activeAtleti=atleti.filter(a=>!a.archivedAt);
  const archivedAtleti=atleti.filter(a=>!!a.archivedAt);

  const addAtleta=async()=>{
    if(!form.nome||!form.cognome) return;
    if(!form.username.trim()){ setLimitErr(t("atleti.errUsername")); return; }
    if(!/^\d{4}$/.test(form.pin)){ setLimitErr(t("atleti.errPin")); return; }
    if(user?.max_atleti != null && activeAtleti.length >= user.max_atleti){
      setLimitErr(t("atleti.errLimite",{n:user.max_atleti}));
      return;
    }
    setLimitErr("");

    {
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
        color:       COLORS[activeAtleti.length%COLORS.length],
      }).select().single();
      if(error){
        setLimitErr(error.code==="23505" ? t("atleti.errUsernameUsato") : error.message);
        return;
      }
      setAtleti(prev=>[...prev,rowToAtleta(data)]);
    }
    setForm(FORM_EMPTY);
    setShowForm(false);
  };

  const saveProfilo=async()=>{
    if(!editProfiloForm) return;
    setProfiloErr("");

    {
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
    }
    setEditingProfilo(false);
  };

  const archiveAtleta=async()=>{
    if(!selected) return;
    const now=new Date().toISOString();
    const {error}=await supabase.from("atleti").update({archived_at:now}).eq("id",selected.id);
    if(error){ console.error("[archive]",error); return; }
    setAtleti(prev=>prev.map(a=>a.id===selected.id?{...a,archivedAt:now}:a));
    setSelected(null);
    setArchiveConfirm(false);
  };

  const restoreAtleta=async(atletaId)=>{
    const {error}=await supabase.from("atleti").update({archived_at:null}).eq("id",atletaId);
    if(error){ console.error("[restore]",error); return; }
    setAtleti(prev=>prev.map(a=>a.id===atletaId?{...a,archivedAt:null}:a));
    setSelected(null);
  };

  const hardDeleteAtleta=async()=>{
    if(!selected) return;
    const {error}=await supabase.from("atleti").delete().eq("id",selected.id);
    if(error){ console.error("[hard delete]",error); return; }
    setAtleti(prev=>prev.filter(a=>a.id!==selected.id));
    setSelected(null);
    setHardDelete({show:false,typed:""});
  };

  useEffect(()=>{
    if(!selected){ setAtletaScheda(null); return; }
    setLoadingScheda(true);
    supabase.from("schede")
      .select("*, scheda_giorni(*, scheda_esercizi(*))")
      .eq("atleta_id",selected.id)
      .eq("attiva",true)
      .order("created_at",{ascending:false})
      .limit(1)
      .maybeSingle()
      .then(({data})=>{ setAtletaScheda(data||null); setLoadingScheda(false); });
  },[selected?.id]);

  const schedaToPreload=(scheda,atleta)=>{
    const giorni={A:[],B:[],C:[],D:[],E:[],F:[],G:[]};
    const dayNames={A:"",B:"",C:"",D:"",E:"",F:"",G:""};
    const giornoIds={};
    (scheda.scheda_giorni||[])
      .sort((a,b)=>a.ordine-b.ordine)
      .forEach(g=>{
        const key=g.giorno_key||String.fromCharCode(65+g.ordine);
        dayNames[key]=g.nome||"";
        giornoIds[key]=g.id;
        giorni[key]=(g.scheda_esercizi||[])
          .sort((a,b)=>a.ordine-b.ordine)
          .map((ex,i)=>{
            const exFull=EXERCISES.find(e=>e.id===ex.esercizio_id_int)||{};
            return {
              ...exFull,
              id:ex.esercizio_id_int||null,
              dbId:ex.id,                       // id scheda_esercizi → aggiornamento sul posto
              name:ex.nome||exFull.name||"",
              muscles:exFull.muscles||"",
              sets:ex.serie||3,
              reps:ex.reps||"10",               // testo: conserva intervalli tipo "8-10"
              rest:ex.rest_sec||90,
              uid:`${g.id}-${i}`,
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
      giornoIds,
      schedaNome:scheda.nome||"",
    };
  };

  const savePINChange=async()=>{
    if(!/^\d{4}$/.test(changePIN.pin)){ setChangePIN(p=>({...p,err:t("atleti.errPin")})); return; }
    const {error}=await supabase.from("atleti").update({pin:changePIN.pin}).eq("id",selected.id);
    if(error){ setChangePIN(p=>({...p,err:error.message})); return; }
    setAtleti(prev=>prev.map(a=>a.id===selected.id?{...a,pin:changePIN.pin}:a));
    setSelected(prev=>({...prev,pin:changePIN.pin}));
    setChangePIN({show:false,pin:"",err:""});
  };

  const copyToClipboard=(text,key)=>{
    navigator.clipboard.writeText(text).then(()=>{ setCopied(key); setTimeout(()=>setCopied(null),1800); });
  };

  // Messaggio di accesso per l'atleta: link diretto (username già compilato) + PIN + invito a installare
  // Nella lingua dell'app del PT (più avanti: lingua scelta per l'atleta)
  const messaggioAccesso=(a)=>[
    a.nome ? t("atleti.msgCiaoNome",{nome:a.nome}) : t("atleti.msgCiao"),
    ``,
    `👉 ${linkAtleta(a.username)}`,
    `👤 Username: ${a.username}`,
    `🔑 PIN: ${a.pin}`,
    ``,
    t("atleti.msgIstruzioni"),
  ].join("\n");
  const whatsappUrl=(a)=>{
    const tel=(a.telefono||"").replace(/[^\d+]/g,"").replace(/^00/,"+");
    const num=tel.startsWith("+")?tel.slice(1):(tel?`39${tel}`:"");
    return `https://wa.me/${num}?text=${encodeURIComponent(messaggioAccesso(a))}`;
  };

  const openSelected=(a)=>{
    setSelected(a);
    setArchiveConfirm(false);
    setHardDelete({show:false,typed:""});
    setEditingProfilo(false);
    setProfiloErr("");
    setChangePIN({show:false,pin:"",err:""});
  };
  const closeSelected=()=>{
    setSelected(null);
    setArchiveConfirm(false);
    setHardDelete({show:false,typed:""});
    setChangePIN({show:false,pin:"",err:""});
  };

  const subtitleText=loading
    ? t("comune.caricamento")
    : `${t("atleti.nAttivi",{count:activeAtleti.length})}${archivedAtleti.length>0?` · ${t("atleti.nArchiviati",{count:archivedAtleti.length})}`:""}`;

  return (
    <div>
      <BackBtn setView={setView}/>
      <div className="page-head" style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
        <div>
          <div className="page-title">{t("nav.atleti")}</div>
          <div className="page-sub">{subtitleText}</div>
        </div>
        <button className="btn-primary" onClick={()=>{setShowForm(true);setLimitErr("");}}>+ {t("atleti.nuovo")}</button>
      </div>

      {loading&&(
        <div style={{color:"var(--muted)",fontSize:"0.875rem",textAlign:"center",padding:"32px 0"}}>{t("atleti.caricamento")}</div>
      )}

      <div className="clients-grid">
        {activeAtleti.map(a=>(
          <div className="client-item" key={a.id} onClick={()=>openSelected(a)}>
            <div className="avatar" style={{background:a.color}}>{getInitials(a.nome,a.cognome)}</div>
            <div className="client-info">
              <div className="client-name">{a.nome} {a.cognome}</div>
              <div className="client-tags">
                {a.obiettivo&&<span className="tag">{valore("obiettivo",a.obiettivo)}</span>}
                {a.livello&&<span className="tag">{valore("livello",a.livello)}</span>}
              </div>
              <div className="client-meta">
                                <span>📋 {t("atleti.nSchede",{count:a.schede})}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Sezione archiviati ── */}
      {archivedAtleti.length>0&&(
        <div style={{marginTop:20}}>
          <button
            onClick={()=>setShowArchived(p=>!p)}
            style={{background:"none",border:"none",color:"var(--muted)",fontFamily:"'DM Sans',sans-serif",fontSize:"0.8125rem",fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6,padding:"4px 0",marginBottom:showArchived?10:0}}
          >
            <span style={{fontSize:"0.625rem"}}>{showArchived?"▼":"▶"}</span>
            {t("atleti.archiviati",{n:archivedAtleti.length})}
          </button>
          {showArchived&&archivedAtleti.map(a=>(
            <div key={a.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"var(--card)",border:"1px solid var(--border)",borderRadius:10,marginBottom:8,opacity:.65}}>
              <div className="avatar" style={{background:a.color,width:36,height:36,fontSize:"0.8125rem"}}>{getInitials(a.nome,a.cognome)}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:"0.875rem",fontWeight:600,color:"var(--muted)"}}>{a.nome} {a.cognome}</div>
                {a.obiettivo&&<div style={{fontSize:"0.75rem",color:"var(--muted)",opacity:.7}}>{valore("obiettivo",a.obiettivo)}</div>}
              </div>
              <button
                className="btn-ghost"
                style={{fontSize:"0.6875rem",padding:"4px 10px",flexShrink:0}}
                onClick={()=>openSelected(a)}
              >{t("atleti.dettagli")}</button>
              <button
                className="btn-ghost"
                style={{fontSize:"0.6875rem",padding:"4px 10px",color:"var(--accent2)",borderColor:"rgba(71,255,232,.25)",flexShrink:0}}
                onClick={()=>restoreAtleta(a.id)}
              >{t("atleti.ripristina")}</button>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal atleta ── */}
      {selected&&(
        <div className="overlay" onClick={closeSelected}>
          <div className="client-modal" onClick={e=>e.stopPropagation()}>
            <div className="client-modal-header">
              <div className="avatar" style={{background:selected.color,width:52,height:52,fontSize:"1.125rem"}}>{getInitials(selected.nome,selected.cognome)}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:"1.25rem",fontWeight:700,display:"flex",alignItems:"center",gap:8}}>
                  {selected.nome} {selected.cognome}
                  {selected.archivedAt&&(
                    <span style={{fontSize:"0.625rem",fontWeight:700,letterSpacing:.8,textTransform:"uppercase",background:"rgba(255,159,71,.12)",color:"#ff9f47",padding:"2px 8px",borderRadius:100}}>{t("atleti.archiviato")}</span>
                  )}
                </div>
                <div style={{fontSize:"0.8125rem",color:"var(--muted)",marginTop:2}}>{valore("obiettivo",selected.obiettivo)} · {valore("livello",selected.livello)}</div>
              </div>
              <button className="modal-close" aria-label={t("comune.chiudi")} onClick={closeSelected}>✕</button>
            </div>
            <div className="client-modal-body">

              {/* ── Credenziali accesso ── */}
              <div style={{marginBottom:20,padding:"12px 14px",background:"var(--card2)",border:"1px solid var(--border)",borderRadius:10}}>
                <div style={{fontSize:"0.75rem",fontWeight:600,letterSpacing:1,textTransform:"uppercase",color:"var(--muted)",marginBottom:10}}>{t("atleti.credenziali")}</div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:"0.75rem",color:"var(--muted)",width:72,flexShrink:0}}>{t("login.username")}</span>
                    <code style={{flex:1,fontSize:"0.8125rem",color:"var(--text)",background:"rgba(255,255,255,.06)",padding:"4px 8px",borderRadius:6}}>{selected.username}</code>
                    <button className="btn-ghost" style={{fontSize:"0.6875rem",padding:"4px 10px",flexShrink:0}} onClick={()=>copyToClipboard(selected.username,"username")}>
                      {copied==="username"?`✓ ${t("atleti.copiato")}`:t("atleti.copia")}
                    </button>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:"0.75rem",color:"var(--muted)",width:72,flexShrink:0}}>PIN</span>
                    <code style={{flex:1,fontSize:"0.8125rem",color:"var(--text)",background:"rgba(255,255,255,.06)",padding:"4px 8px",borderRadius:6}}>{selected.pin}</code>
                    <button className="btn-ghost" style={{fontSize:"0.6875rem",padding:"4px 10px",flexShrink:0}} onClick={()=>copyToClipboard(selected.pin,"pin")}>
                      {copied==="pin"?`✓ ${t("atleti.copiato")}`:t("atleti.copia")}
                    </button>
                  </div>
                </div>
                {!selected.archivedAt&&(
                  <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:12}}>
                    <a className="btn-primary" style={{fontSize:"0.75rem",padding:"7px 14px",textDecoration:"none"}} href={whatsappUrl(selected)} target="_blank" rel="noopener noreferrer">
                      {t("atleti.inviaWhatsapp")}
                    </a>
                    <button className="btn-ghost" style={{fontSize:"0.75rem",padding:"7px 14px"}} onClick={()=>copyToClipboard(messaggioAccesso(selected),"messaggio")}>
                      {copied==="messaggio"?`✓ ${t("atleti.messaggioCopiato")}`:t("atleti.copiaMessaggio")}
                    </button>
                  </div>
                )}
                {!selected.archivedAt&&(
                  <div style={{marginTop:10}}>
                    {!changePIN.show?(
                      <button className="btn-ghost" style={{fontSize:"0.6875rem",padding:"4px 10px"}} onClick={()=>setChangePIN({show:true,pin:"",err:""})}>🔑 {t("atleti.cambiaPin")}</button>
                    ):(
                      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                        <input
                          className="field-input"
                          type="text"
                          inputMode="numeric"
                          maxLength={4}
                          placeholder={t("atleti.phNuovoPin")}
                          value={changePIN.pin}
                          onChange={e=>setChangePIN(p=>({...p,pin:e.target.value.replace(/\D/g,""),err:""}))}
                          style={{width:150,letterSpacing:"0.3em"}}
                        />
                        <button className="btn-primary" style={{fontSize:"0.75rem",padding:"6px 14px"}} onClick={savePINChange}>{t("atleti.salvaPin")}</button>
                        <button className="btn-ghost" style={{fontSize:"0.75rem",padding:"6px 10px"}} onClick={()=>setChangePIN({show:false,pin:"",err:""})}>{t("comune.annulla")}</button>
                        {changePIN.err&&<span style={{fontSize:"0.75rem",color:"var(--danger)"}}>{changePIN.err}</span>}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {!selected.archivedAt&&(
                <>
                  <div style={{fontSize:"0.75rem",fontWeight:600,letterSpacing:1,textTransform:"uppercase",color:"var(--muted)",marginBottom:12}}>{t("atleti.schedaAssegnata")}</div>
                  {loadingScheda?(
                      <div style={{color:"var(--muted)",fontSize:"0.875rem"}}>{t("atleti.caricamentoScheda")}</div>
                    ):atletaScheda?(
                      <div>
                        {(atletaScheda.scheda_giorni||[]).sort((a,b)=>a.ordine-b.ordine).map(g=>{
                          const key=g.giorno_key||String.fromCharCode(65+g.ordine);
                          const label=g.nome&&nomeGiorno(g.nome,key)===g.nome?`${key} — ${g.nome}`:nomeGiorno(g.nome,key);
                          return <span key={g.id} className="scheda-chip">📋 {label} · {t("libreria.nEsercizi",{count:(g.scheda_esercizi||[]).length})}</span>;
                        })}
                        <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
                          <button className="btn-primary" style={{fontSize:"0.75rem",padding:"6px 14px"}} onClick={()=>{
                            setBuilderPreload(schedaToPreload(atletaScheda,selected));
                            closeSelected();
                            setView("builder");
                          }}>✏️ {t("atleti.modificaBuilder")}</button>
                        </div>
                      </div>
                    ):(
                      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                        <div style={{color:"var(--muted)",fontSize:"0.875rem",flex:1}}>{t("atleti.nessunaScheda")}</div>
                        <button className="btn-ghost" style={{fontSize:"0.75rem",padding:"6px 14px"}} onClick={()=>{
                          setBuilderPreload({
                            atleta:selected,atletaId:selected.id,
                            nome:selected.nome,cognome:selected.cognome,
                            obiettivo:selected.obiettivo||"",livello:selected.livello||"",
                            giorni:{A:[],B:[],C:[],D:[],E:[],F:[],G:[]},
                            dayNames:{A:"",B:"",C:"",D:"",E:"",F:"",G:""},
                          });
                          closeSelected();
                          setView("builder");
                        }}>+ {t("atleti.creaScheda")}</button>
                      </div>
                    )}
                </>
              )}

              <div style={{marginTop:24}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                  <div style={{fontSize:"0.75rem",fontWeight:600,letterSpacing:1,textTransform:"uppercase",color:"var(--muted)"}}>{t("atleti.profilo")}</div>
                  {!editingProfilo&&!selected.archivedAt&&(
                    <button className="btn-ghost" style={{fontSize:"0.6875rem",padding:"4px 10px"}} onClick={()=>{setProfiloErr("");setEditProfiloForm({obiettivo:selected.obiettivo||"",livello:selected.livello||"",altezza:selected.altezza||"",dataNascita:selected.dataNascita||"",sesso:selected.sesso||"",note:selected.note||"",telefono:selected.telefono||"",email:selected.email||""});setEditingProfilo(true);}}>✏️ {t("comune.modifica")}</button>
                  )}
                </div>
                {editingProfilo&&editProfiloForm?(
                  <div style={{background:"var(--card2)",border:"1px solid var(--border)",borderRadius:10,padding:"14px 16px",marginBottom:10}}>
                    <div className="form-row" style={{marginBottom:10}}>
                      <label className="field-label">{t("comune.obiettivo")}<select className="field-select" value={editProfiloForm.obiettivo} onChange={e=>setEditProfiloForm(p=>({...p,obiettivo:e.target.value}))}><option value="">— {t("comune.seleziona")} —</option>{OBIETTIVI.map(o=><option key={o} value={o}>{valore("obiettivo",o)}</option>)}</select></label>
                      <label className="field-label">{t("comune.livello")}<select className="field-select" value={editProfiloForm.livello} onChange={e=>setEditProfiloForm(p=>({...p,livello:e.target.value}))}><option value="">— {t("comune.seleziona")} —</option>{LIVELLI.map(l=><option key={l} value={l}>{valore("livello",l)}</option>)}</select></label>
                    </div>
                    <div className="form-row" style={{marginBottom:10}}>
                      <label className="field-label">{t("atleti.altezza")} (cm)<input className="field-input" type="number" min={100} max={250} placeholder="175" value={editProfiloForm.altezza} onChange={e=>setEditProfiloForm(p=>({...p,altezza:e.target.value}))}/></label>
                      <label className="field-label">{t("atleti.dataNascita")}<input className="field-input" type="date" value={editProfiloForm.dataNascita} onChange={e=>setEditProfiloForm(p=>({...p,dataNascita:e.target.value}))}/></label>
                    </div>
                    <label className="field-label" style={{marginBottom:10}}>{t("atleti.sesso")}<select className="field-select" value={editProfiloForm.sesso} onChange={e=>setEditProfiloForm(p=>({...p,sesso:e.target.value}))}><option value="">— {t("atleti.nonSpecificato")} —</option><option value="M">M</option><option value="F">F</option><option value="Altro">{valore("sesso","Altro")}</option></select></label>
                    <label className="field-label" style={{marginBottom:10}}>{t("atleti.notePT")}<textarea className="field-input" rows={3} placeholder={t("atleti.phNote")} value={editProfiloForm.note} onChange={e=>setEditProfiloForm(p=>({...p,note:e.target.value}))} style={{resize:"vertical",fontFamily:"'DM Sans',sans-serif",fontSize:"0.875rem"}}/></label>
                    <div className="form-row" style={{marginBottom:10}}>
                      <label className="field-label">{t("atleti.telefono")}<input className="field-input" type="tel" placeholder="+39 333 1234567" value={editProfiloForm.telefono||""} onChange={e=>setEditProfiloForm(p=>({...p,telefono:e.target.value}))}/></label>
                      <label className="field-label">{t("atleti.email")}<input className="field-input" type="email" placeholder="atleta@email.com" value={editProfiloForm.email||""} onChange={e=>setEditProfiloForm(p=>({...p,email:e.target.value}))}/></label>
                    </div>
                    {profiloErr&&<div style={{color:"var(--danger)",fontSize:"0.75rem",marginBottom:8}}>{profiloErr}</div>}
                    <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                      <button className="btn-ghost" style={{fontSize:"0.75rem",padding:"6px 14px"}} onClick={()=>setEditingProfilo(false)}>{t("comune.annulla")}</button>
                      <button className="btn-primary" style={{fontSize:"0.75rem",padding:"6px 14px"}} onClick={saveProfilo}>{t("comune.salva")}</button>
                    </div>
                  </div>
                ):(
                  <div className="profilo-grid">
                    <div className="profilo-cell">
                      <div className="profilo-cell-label">{t("atleti.altezza")}</div>
                      <div className="profilo-cell-val">{selected.altezza?`${selected.altezza} cm`:"—"}</div>
                    </div>
                    <div className="profilo-cell">
                      <div className="profilo-cell-label">{t("atleti.eta")}</div>
                      <div className="profilo-cell-val">{selected.dataNascita&&calcEta(selected.dataNascita)!==null?t("atleti.anni",{n:calcEta(selected.dataNascita)}):"—"}</div>
                    </div>
                    <div className="profilo-cell">
                      <div className="profilo-cell-label">{t("atleti.sesso")}</div>
                      <div className="profilo-cell-val">{valore("sesso",selected.sesso)||"—"}</div>
                    </div>
                    <div className="profilo-cell" style={{gridColumn:"1/-1"}}>
                      <div className="profilo-cell-label">{t("atleti.notePT")}</div>
                      <div className="profilo-cell-val" style={{fontSize:"0.8125rem",whiteSpace:"pre-wrap"}}>{selected.note||"—"}</div>
                    </div>
                    {(selected.telefono||selected.email)&&(
                      <div className="profilo-cell" style={{gridColumn:"1/-1"}}>
                        <div className="profilo-cell-label">{t("atleti.contatti")}</div>
                        <div className="profilo-cell-val" style={{fontSize:"0.8125rem",display:"flex",gap:16,flexWrap:"wrap"}}>
                          {selected.telefono&&<span>📞 {selected.telefono}</span>}
                          {selected.email&&<span>✉️ {selected.email}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{marginTop:16,padding:"14px 16px",background:"var(--card2)",borderRadius:10,border:"1px solid var(--border)"}}>
                <div style={{fontSize:"0.75rem",fontWeight:600,letterSpacing:1,textTransform:"uppercase",color:"var(--muted)",marginBottom:8}}>{t("nav.statistiche")}</div>
                <div style={{display:"flex",gap:24,fontSize:"0.875rem"}}>
                  <div><span style={{color:"var(--muted)"}}>{t("atleti.schede")} </span><strong style={{color:"var(--accent)"}}>{selected.schede||0}</strong></div>
                </div>
              </div>

              {!selected.archivedAt&&(
                <>
                  <div style={{marginTop:24}}>
                    <div style={{fontSize:"0.75rem",fontWeight:600,letterSpacing:1,textTransform:"uppercase",color:"var(--muted)",marginBottom:12}}>📏 {t("atleti.misurazioni")}</div>
                    <MisureSection
                      ptId={user?.supabaseId}
                      supabaseAtletaId={selected.id}
                    />
                  </div>
                  <div style={{marginTop:24}}>
                    <AllenamentiAtletaPT atletaId={selected.id}/>
                  </div>
                </>
              )}

              {/* ── Azioni distruttive ── */}
              <div style={{marginTop:24,paddingTop:16,borderTop:"1px solid var(--border)",display:"flex",flexDirection:"column",gap:10}}>
                {selected.archivedAt?(
                  // Atleta archiviato → ripristina o elimina definitivamente
                  <>
                    <button
                      style={{background:"rgba(71,255,232,.08)",border:"1px solid rgba(71,255,232,.2)",color:"var(--accent2)",fontFamily:"'DM Sans',sans-serif",fontSize:"0.8125rem",fontWeight:700,padding:"9px 16px",borderRadius:9,cursor:"pointer",alignSelf:"flex-start"}}
                      onClick={()=>restoreAtleta(selected.id)}
                    >↩ {t("atleti.ripristinaAtleta")}</button>
                    {!hardDelete.show?(
                      <button className="btn-ghost" style={{fontSize:"0.75rem",color:"var(--muted)",alignSelf:"flex-start"}} onClick={()=>setHardDelete({show:true,typed:""})}>{t("atleti.eliminaDef")}…</button>
                    ):(
                      <HardDeleteConfirm
                        name={`${selected.nome} ${selected.cognome}`}
                        typed={hardDelete.typed}
                        onChange={v=>setHardDelete(p=>({...p,typed:v}))}
                        onCancel={()=>setHardDelete({show:false,typed:""})}
                        onConfirm={hardDeleteAtleta}
                      />
                    )}
                  </>
                ):(
                  // Atleta attivo → archivia o elimina definitivamente
                  <>
                    {!archiveConfirm&&!hardDelete.show&&(
                      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                        <button className="btn-ghost" style={{fontSize:"0.75rem"}} onClick={()=>setArchiveConfirm(true)}>{t("atleti.archiviaAtleta")}</button>
                        <button className="btn-ghost" style={{fontSize:"0.75rem",color:"var(--muted)"}} onClick={()=>setHardDelete({show:true,typed:""})}>{t("atleti.eliminaDef")}…</button>
                      </div>
                    )}
                    {archiveConfirm&&(
                      <div style={{background:"rgba(255,159,71,.06)",border:"1px solid rgba(255,159,71,.2)",borderRadius:9,padding:"12px 14px"}}>
                        <div style={{fontSize:"0.8125rem",color:"var(--text)",marginBottom:10}}>
                          <Trans i18nKey="atleti.archiviareConferma" values={{nome:`${selected.nome} ${selected.cognome}`}} components={{b:<strong/>}}/>
                        </div>
                        <div style={{display:"flex",gap:8}}>
                          <button className="btn-ghost" style={{fontSize:"0.75rem",padding:"5px 12px"}} onClick={()=>setArchiveConfirm(false)}>{t("comune.annulla")}</button>
                          <button style={{background:"rgba(255,159,71,.15)",border:"1px solid rgba(255,159,71,.3)",color:"#ff9f47",fontFamily:"'DM Sans',sans-serif",fontSize:"0.75rem",fontWeight:700,padding:"5px 14px",borderRadius:8,cursor:"pointer"}} onClick={archiveAtleta}>{t("atleti.archivia")}</button>
                        </div>
                      </div>
                    )}
                    {hardDelete.show&&(
                      <HardDeleteConfirm
                        name={`${selected.nome} ${selected.cognome}`}
                        typed={hardDelete.typed}
                        onChange={v=>setHardDelete(p=>({...p,typed:v}))}
                        onCancel={()=>setHardDelete({show:false,typed:""})}
                        onConfirm={hardDeleteAtleta}
                      />
                    )}
                  </>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── Form nuovo atleta ── */}
      {showForm&&(
        <div className="overlay" onClick={()=>setShowForm(false)}>
          <div className="form-modal" style={{maxWidth:520}} onClick={e=>e.stopPropagation()}>
            <div className="form-modal-header">
              <div className="modal-title">{t("atleti.nuovoTitolo")}</div>
              <button className="modal-close" aria-label={t("comune.chiudi")} onClick={()=>setShowForm(false)}>✕</button>
            </div>
            <div className="form-modal-body">
              <div className="form-row">
                <label className="field-label">{t("comune.nome")}<input className="field-input" type="text" placeholder={t("login.phNome")} value={form.nome} onChange={e=>setForm(p=>({...p,nome:e.target.value}))}/></label>
                <label className="field-label">{t("comune.cognome")}<input className="field-input" type="text" placeholder={t("login.phCognome")} value={form.cognome} onChange={e=>setForm(p=>({...p,cognome:e.target.value}))}/></label>
              </div>
              <div className="form-row">
                <label className="field-label">Username<input className="field-input" type="text" placeholder={t("atleti.phUsername")} value={form.username} onChange={e=>setForm(p=>({...p,username:e.target.value}))}/></label>
                <label className="field-label">{t("atleti.pin4")}<input className="field-input" type="text" inputMode="numeric" maxLength={4} placeholder="••••" value={form.pin} onChange={e=>setForm(p=>({...p,pin:e.target.value.replace(/\D/g,"")}))} style={{letterSpacing:"0.3em"}}/></label>
              </div>
              <div className="form-row">
                <label className="field-label">{t("comune.obiettivo")}<select className="field-select" value={form.obiettivo} onChange={e=>setForm(p=>({...p,obiettivo:e.target.value}))}><option value="">— {t("comune.seleziona")} —</option>{OBIETTIVI.map(o=><option key={o} value={o}>{valore("obiettivo",o)}</option>)}</select></label>
                <label className="field-label">{t("comune.livello")}<select className="field-select" value={form.livello} onChange={e=>setForm(p=>({...p,livello:e.target.value}))}><option value="">— {t("comune.seleziona")} —</option>{LIVELLI.map(l=><option key={l} value={l}>{valore("livello",l)}</option>)}</select></label>
              </div>
              <div className="form-row">
                <label className="field-label">{t("atleti.altezza")} (cm)<input className="field-input" type="number" min={100} max={250} placeholder="175" value={form.altezza} onChange={e=>setForm(p=>({...p,altezza:e.target.value}))}/></label>
                <label className="field-label">{t("atleti.dataNascita")}<input className="field-input" type="date" value={form.dataNascita} onChange={e=>setForm(p=>({...p,dataNascita:e.target.value}))}/></label>
              </div>
              <label className="field-label">{t("atleti.sesso")}<select className="field-select" value={form.sesso} onChange={e=>setForm(p=>({...p,sesso:e.target.value}))}><option value="">— {t("atleti.nonSpecificato")} —</option><option value="M">M</option><option value="F">F</option><option value="Altro">{valore("sesso","Altro")}</option></select></label>
              <label className="field-label">{t("atleti.notePT")}<textarea className="field-input" rows={3} placeholder={t("atleti.phNote")} value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))} style={{resize:"vertical",fontFamily:"'DM Sans',sans-serif",fontSize:"0.875rem"}}/></label>
              <div className="form-row">
                <label className="field-label">{t("atleti.telefono")} <span style={{color:"var(--muted)",fontSize:"0.6875rem"}}>({t("atleti.opzionale")})</span><input className="field-input" type="tel" placeholder="+39 333 1234567" value={form.telefono} onChange={e=>setForm(p=>({...p,telefono:e.target.value}))}/></label>
                <label className="field-label">{t("atleti.email")} <span style={{color:"var(--muted)",fontSize:"0.6875rem"}}>({t("atleti.opzionale")})</span><input className="field-input" type="email" placeholder="atleta@email.com" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))}/></label>
              </div>
            </div>
            {limitErr&&<div style={{color:"var(--danger)",fontSize:"0.8125rem",padding:"10px 16px",background:"rgba(255,71,87,.07)",border:"1px solid rgba(255,71,87,.2)",borderRadius:8,margin:"0 0 4px"}}>{limitErr}</div>}
            <div className="form-actions">
              <button className="btn-ghost" onClick={()=>{setShowForm(false);setLimitErr("");}}>{t("comune.annulla")}</button>
              <button className="btn-primary" onClick={addAtleta}>{t("builder.aggiungi")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HardDeleteConfirm({name, typed, onChange, onCancel, onConfirm}) {
  const { t } = useTranslation();
  return (
    <div style={{background:"rgba(255,71,87,.06)",border:"1px solid rgba(255,71,87,.25)",borderRadius:9,padding:"14px 16px"}}>
      <div style={{fontSize:"0.8125rem",color:"var(--text)",marginBottom:4,fontWeight:600}}>{t("atleti.eliminazioneDef")}</div>
      <div style={{fontSize:"0.75rem",color:"var(--muted)",lineHeight:1.5,marginBottom:12}}>
        <Trans i18nKey="atleti.eliminaTesto" values={{nome:name}} components={{b:<strong style={{color:"var(--text)"}}/>}}/>
      </div>
      <div style={{fontSize:"0.75rem",color:"var(--muted)",marginBottom:6}}>
        <Trans i18nKey="atleti.digita" values={{nome:name}} components={{b:<strong style={{color:"var(--text)"}}/>}}/>
      </div>
      <input
        className="field-input"
        type="text"
        value={typed}
        onChange={e=>onChange(e.target.value)}
        placeholder={name}
        style={{marginBottom:10,fontSize:"0.8125rem"}}
      />
      <div style={{display:"flex",gap:8}}>
        <button className="btn-ghost" style={{fontSize:"0.75rem",padding:"5px 12px"}} onClick={onCancel}>{t("comune.annulla")}</button>
        <button
          className="btn-danger"
          style={{fontSize:"0.75rem",padding:"5px 14px",opacity:typed===name?1:.4,cursor:typed===name?"pointer":"default"}}
          disabled={typed!==name}
          onClick={onConfirm}
        >{t("atleti.eliminaDef")}</button>
      </div>
    </div>
  );
}
