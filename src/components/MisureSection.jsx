import { useState, useEffect } from "react";
import { LINE_COLORS, MISURE_FIELDS } from "../data.js";
import { fmtDate, fmtDateShort } from "../utils.js";
import { ProgressiMultiChart } from "./ProgressiEsercizi.jsx";
import { supabase } from "../supabase.js";

// ── Misure section ────────────────────────────────────────────────────────────
export function MisureSection({readOnly=false, externalMisure=null, ptId=null, supabaseAtletaId=null}) {
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
