import { useState, useEffect } from "react";
import { LINE_COLORS, MISURE_FIELDS } from "../data.js";
import { fmtDate, fmtDateShort, parseNum } from "../utils.js";
import { ProgressiMultiChart } from "./ProgressiEsercizi.jsx";
import { supabase } from "../supabase.js";
import { useTranslation } from "react-i18next";
import { valore, locale, fmtNum } from "../i18n/index.js";

// ── Misure section ────────────────────────────────────────────────────────────
export function MisureSection({readOnly=false, externalMisure=null, ptId=null, supabaseAtletaId=null}) {
  const { t } = useTranslation();
  const etichetta = f => valore("misura", f.key);
  const todayStr = fmtDate(new Date());
  const [misure, setMisure] = useState(()=> externalMisure!==null ? externalMisure : []);
  const VUOTO = {peso:"", vita:"", fianchi:"", petto:"", braccio:"", grassoPerc:"", fcRiposo:""};
  const [form, setForm] = useState({data:todayStr, ...VUOTO});
  const [errore, setErrore] = useState(null);
  const [salvando, setSalvando] = useState(false);
  // B8: se in quella data c'è già una misura, il modulo parte dai suoi valori (prima si sovrascrivevano con vuoto)
  const formDa = (lista, data) => { const m = lista.find(x=>x.data===data); return m ? {data, ...VUOTO, ...Object.fromEntries(Object.keys(VUOTO).map(k=>[k, m[k] ? String(m[k]).replace(".", ",") : ""]))} : {data, ...VUOTO}; };
  const giaPresente = misure.some(m=>m.data===form.data);
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
        const lista=(data||[]).map(r=>({
          dbId: r.id,
          data: r.data,
          peso: r.peso_kg!=null ? String(r.peso_kg) : "",
          vita: r.vita_cm!=null ? String(r.vita_cm) : "",
          fianchi: r.fianchi_cm!=null ? String(r.fianchi_cm) : "",
          petto: r.petto_cm!=null ? String(r.petto_cm) : "",
          braccio: r.braccio_cm!=null ? String(r.braccio_cm) : "",
          grassoPerc: r.grasso_percent!=null ? String(r.grasso_percent) : "",
          fcRiposo: r.fc_riposo!=null ? String(r.fc_riposo) : "",
        }));
        setMisure(lista);
        setForm(f=>Object.keys(VUOTO).some(k=>f[k]) ? f : formDa(lista, f.data));
      });
  },[supabaseAtletaId]);

  const handleSave = async () => {
    if(!Object.keys(VUOTO).some(k=>parseNum(form[k])!=null)) return;
    setErrore(null);
    if(supabaseAtletaId){
      const existing = misure.find(m=>m.data===form.data);
      const payload = {
        peso_kg: parseNum(form.peso),
        vita_cm: parseNum(form.vita),
        fianchi_cm: parseNum(form.fianchi),
        petto_cm: parseNum(form.petto),
        braccio_cm: parseNum(form.braccio),
        grasso_percent: parseNum(form.grassoPerc),
        fc_riposo: parseNum(form.fcRiposo)!=null ? Math.round(parseNum(form.fcRiposo)) : null,
      };
      const salvata={...form, ...Object.fromEntries(Object.keys(VUOTO).map(k=>[k, parseNum(form[k])!=null?String(parseNum(form[k])):""]))};
      setSalvando(true);
      try {
        if(existing?.dbId){
          const {error}=await supabase.from("misurazioni").update(payload).eq("id",existing.dbId);
          if(error) throw error;
          setMisure(prev=>prev.map(m=>m.data===form.data?{...m,...salvata}:m));
        } else {
          const {data,error}=await supabase.from("misurazioni").insert({
            ...payload, pt_id:ptId, atleta_id:supabaseAtletaId, data:form.data,
          }).select().single();
          if(error||!data) throw error||new Error("insert");
          setMisure(prev=>[...prev.filter(m=>m.data!==form.data),{...salvata, dbId:data.id}].sort((a,b)=>a.data.localeCompare(b.data)));
        }
      } catch(e) {
        // B9: errore visibile e modulo pieno, così si può riprovare
        console.error("[misurazioni salva]", e);
        setErrore(t("misure.errSalvataggio"));
        return;
      } finally { setSalvando(false); }
    }
    setForm({data:todayStr, ...VUOTO});
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
      id:f.key, name:`${f.emoji} ${etichetta(f)}`,
      color:LINE_COLORS[i%LINE_COLORS.length],
      points:misure
        .filter(m=>m[f.key]&&+m[f.key]>0)
        .map(m=>({date:m.data,kg:+m[f.key]}))
    }));

  const lastMisura = misure.length > 0 ? misure[misure.length-1] : null;

  return (
    <div>
      {lastMisura&&(
        <div style={{fontSize:"0.75rem",color:"var(--muted)",marginBottom:12}}>
          {t("misure.ultima")} <strong style={{color:"var(--text)"}}>
            {new Date(lastMisura.data+"T12:00").toLocaleDateString(locale(),{day:"numeric",month:"short",year:"numeric"})}
          </strong>
        </div>
      )}
      {!readOnly&&(
        <div style={{background:"var(--card2)",border:"1px solid var(--border)",borderRadius:10,padding:"14px 16px",marginBottom:14}}>
          <div style={{fontSize:"0.6875rem",fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:"var(--muted)",marginBottom:10}}>{t("misure.nuova")}</div>
          <div className="form-row" style={{marginBottom:10}}>
            <label className="field-label">{t("comune.data")}<input className="field-input" type="date" value={form.data} onChange={e=>{ setErrore(null); setForm(formDa(misure, e.target.value)); }}/></label>
          </div>
          {giaPresente&&<div className="misure-gia">{t("misure.giaPresenti")}</div>}
          <div className="form-row" style={{marginBottom:10}}>
            <label className="field-label">{etichetta({key:"peso"})} (kg)<input className="field-input" type="text" inputMode="decimal" placeholder="78,5" value={form.peso} onChange={e=>setForm(p=>({...p,peso:e.target.value}))}/></label>
            <label className="field-label">{etichetta({key:"vita"})} (cm)<input className="field-input" type="text" inputMode="decimal" placeholder="82" value={form.vita} onChange={e=>setForm(p=>({...p,vita:e.target.value}))}/></label>
          </div>
          <button className="btn-ghost" style={{fontSize:"0.6875rem",padding:"5px 12px",marginBottom:showAvanzati?8:0}} onClick={()=>setShowAvanzati(v=>!v)}>
            {showAvanzati?`▲ ${t("misure.nascondiAvanzati")}`:`➕ ${t("misure.datiAvanzati")}`}
          </button>
          {showAvanzati&&(
            <div className="misure-avanzati">
              <div className="form-row">
                <label className="field-label">{etichetta({key:"fianchi"})} (cm)<input className="field-input" type="text" inputMode="decimal" placeholder="96" value={form.fianchi} onChange={e=>setForm(p=>({...p,fianchi:e.target.value}))}/></label>
                <label className="field-label">{etichetta({key:"petto"})} (cm)<input className="field-input" type="text" inputMode="decimal" placeholder="100" value={form.petto} onChange={e=>setForm(p=>({...p,petto:e.target.value}))}/></label>
              </div>
              <div className="form-row">
                <label className="field-label">{etichetta({key:"braccio"})} (cm)<input className="field-input" type="text" inputMode="decimal" placeholder="36" value={form.braccio} onChange={e=>setForm(p=>({...p,braccio:e.target.value}))}/></label>
                <label className="field-label">{etichetta({key:"fcRiposo"})} (bpm)<input className="field-input" type="text" inputMode="decimal" placeholder="65" value={form.fcRiposo} onChange={e=>setForm(p=>({...p,fcRiposo:e.target.value}))}/></label>
              </div>
              <label className="field-label">{t("misure.massaGrassa")}<input className="field-input" type="text" inputMode="decimal" placeholder="18,5" value={form.grassoPerc} onChange={e=>setForm(p=>({...p,grassoPerc:e.target.value}))}/></label>
            </div>
          )}
          {errore&&<div className="misure-errore" role="alert">{errore}</div>}
          <button className="btn-primary" style={{marginTop:10,width:"100%"}} onClick={handleSave} disabled={salvando}>{salvando?t("comune.salvataggio"):giaPresente?t("misure.aggiorna"):t("misure.salva")}</button>
        </div>
      )}

      {misure.length===0?(
        <div style={{color:"var(--muted)",fontSize:"0.8125rem",padding:"8px 0"}}>
          {readOnly?t("misure.vuotaAtleta"):t("misure.vuota")}
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
                    <span key={f.key} className="misura-badge">{f.emoji} {etichetta(f)} {fmtNum(m[f.key])} {f.unit}</span>
                  ))}
                  <div style={{flex:1}}/>
                  {!readOnly&&(
                    <button className="day-event-btn" onClick={()=>setDeleteConfirm(deleteConfirm===realIdx?null:realIdx)}>🗑️</button>
                  )}
                </div>
                {deleteConfirm===realIdx&&(
                  <div className="day-delete-confirm" style={{marginBottom:7}}>
                    <span style={{fontSize:"0.8125rem",color:"var(--text)"}}>{t("misure.eliminareConferma")}</span>
                    <div style={{display:"flex",gap:8}}>
                      <button className="btn-ghost" style={{padding:"5px 12px",fontSize:"0.75rem"}} onClick={()=>setDeleteConfirm(null)}>{t("comune.annulla")}</button>
                      <button className="btn-danger" onClick={()=>handleDelete(realIdx)}>{t("comune.elimina")}</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {misure.length>3&&(
            <button className="appt-expand-btn" onClick={()=>setExpanded(v=>!v)}>
              {expanded?`${t("comune.mostraMeno")} ▲`:`${t("comune.vediTutte",{n:misure.length})} ▼`}
            </button>
          )}
        </>
      )}

      {misure.length<2?(
        <div style={{color:"var(--muted)",fontSize:"0.8125rem",marginTop:12,padding:"10px 0",textAlign:"center"}}>
          {misure.length===0?"":readOnly?"":t("misure.almeno2")}
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
                >{f.emoji} {etichetta(f)}</button>
              );
            })}
          </div>
          {chartLines.length===0?(
            <div style={{color:"var(--muted)",fontSize:"0.8125rem",textAlign:"center",padding:"8px 0"}}>
              {t("misure.selezionaMetrica")}
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
