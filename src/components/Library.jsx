import { useState, useEffect } from "react";
import { EXERCISES, CATEGORIES, EX_IMAGES, CAT_COLORS } from "../data.js";
import { BackBtn } from "./Sidebar.jsx";
import { supabase } from "../supabase.js";
import { useTranslation } from "react-i18next";
import { nomeEsercizio, muscoliEsercizio, valore, ytCerca } from "../i18n/index.js";

export function VideoModal({ex,onClose}) {
  const { t } = useTranslation();
  const nome = nomeEsercizio(ex.name, ex.id);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{nome}</div>
          <button className="modal-close" onClick={onClose} aria-label={t("comune.chiudi")}>✕</button>
        </div>
        <div className="modal-video">
          <iframe src={`https://www.youtube.com/embed/${ex.yt}?autoplay=1&rel=0`} allow="autoplay; encrypted-media" allowFullScreen title={nome}/>
        </div>
        <div className="modal-body">
          <div className="modal-muscles"><strong>{t("libreria.muscoliCoinvolti")}</strong> {muscoliEsercizio(ex)}</div>
        </div>
      </div>
    </div>
  );
}

function ExCard({ex,onVideo,onDelete}) {
  const { t } = useTranslation();
  const nome = nomeEsercizio(ex.name, ex.id);
  const cc=CAT_COLORS[ex.cat]||"#e8ff47";
  const [imgOk,setImgOk]=useState(true);
  const [confirming,setConfirming]=useState(false);
  const slug=EX_IMAGES[ex.id];
  return (
    <div className="ex-card">
      {imgOk&&slug
        ?<img className="ex-thumb" src={`/exercises-custom/${slug}.jpg`} alt={nome}
            style={{objectFit:"contain",objectPosition:"center",background:"#fff"}}
            onError={()=>setImgOk(false)}/>
        :<div className="ex-thumb-ph">💪</div>
      }
      <div className="ex-body">
        <span className="ex-cat" style={{color:cc,background:`${cc}16`}}>{valore("categoria",ex.cat)}</span>
        <div className="ex-name">{nome}</div>
        <div className="ex-muscles"><strong>{t("libreria.muscoli")}</strong> {muscoliEsercizio(ex)||"—"}</div>
        {ex.yt&&onVideo?(
          <button className="video-btn" onClick={()=>onVideo(ex)}>
            <span className="play-icon">▶</span>{t("libreria.guardaVideo")}
          </button>
        ):(
          <a className="video-btn" href={ytCerca(nome)} target="_blank" rel="noopener noreferrer" style={{textDecoration:"none"}}>
            <span className="play-icon">▶</span>{t("card.cercaVideo")}
          </a>
        )}
        {onDelete&&(
          <div style={{marginTop:8,display:"flex",justifyContent:"flex-end"}}>
            {confirming?(
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>{onDelete();setConfirming(false);}} style={{background:"var(--danger)",border:"none",color:"#fff",fontFamily:"'DM Sans',sans-serif",fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:5,cursor:"pointer"}}>{t("comune.elimina")}</button>
                <button onClick={()=>setConfirming(false)} style={{background:"var(--card2)",border:"1px solid var(--border)",color:"var(--muted)",fontFamily:"'DM Sans',sans-serif",fontSize:11,padding:"3px 8px",borderRadius:5,cursor:"pointer"}}>{t("comune.annulla")}</button>
              </div>
            ):(
              <button onClick={()=>setConfirming(true)} style={{background:"none",border:"none",color:"var(--muted)",fontFamily:"'DM Sans',sans-serif",fontSize:11,fontWeight:600,cursor:"pointer",padding:"3px 0",transition:"color .15s"}} onMouseEnter={e=>e.currentTarget.style.color="var(--danger)"} onMouseLeave={e=>e.currentTarget.style.color="var(--muted)"}>✕ {t("comune.elimina")}</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Library({setView,user}) {
  const { t } = useTranslation();
  const [filter,setFilter]=useState("Tutte");
  const [search,setSearch]=useState("");
  const [modal,setModal]=useState(null);
  const [customExercises,setCustomExercises]=useState([]);
  const [showForm,setShowForm]=useState(false);
  const [nome,setNome]=useState("");
  const [categoria,setCategoria]=useState("");
  const [descrizione,setDescrizione]=useState("");
  const [saving,setSaving]=useState(false);

  const loadCustom=async()=>{
    const {data}=await supabase.from("esercizi_custom").select("*").order("created_at",{ascending:false});
    setCustomExercises(data||[]);
  };

  useEffect(()=>{ loadCustom(); },[user?.supabaseId]);

  const handleCreate=async(e)=>{
    e.preventDefault();
    if(!nome.trim()||!categoria) return;
    setSaving(true);
    const {error}=await supabase.from("esercizi_custom").insert({
      pt_id:user.supabaseId, nome:nome.trim(), categoria,
      descrizione:descrizione.trim()||null, immagine_url:null,
    });
    setSaving(false);
    if(!error){ setNome(""); setCategoria(""); setDescrizione(""); setShowForm(false); loadCustom(); }
  };

  const handleDelete=async(id)=>{
    await supabase.from("esercizi_custom").delete().eq("id",id);
    setCustomExercises(prev=>prev.filter(e=>e.id!==id));
  };

  // Unified list: system exercises + custom exercises normalized to the same shape.
  // Custom exercises use id "c:<uuid>" to avoid collisions with system integer ids.
  const customNorm=customExercises.map(ex=>({
    id:`c:${ex.id}`, cat:ex.categoria, name:ex.nome, muscles:ex.descrizione||"", yt:null,
    isCustom:true, customId:ex.id,
  }));
  const allExercises=[...EXERCISES,...customNorm];
  // Ricerca sul nome nella lingua scelta e su quello italiano (muscoli idem)
  const q=search.toLowerCase();
  const list=allExercises.filter(e=>
    (filter==="Tutte"||e.cat===filter)&&
    (!q||[e.name, nomeEsercizio(e.name,e.id), e.muscles, muscoliEsercizio(e)].some(s=>(s||"").toLowerCase().includes(q)))
  );

  return (
    <div>
      <BackBtn setView={setView}/>
      <div className="page-head"><div className="page-title">{t("libreria.titolo")}</div><div className="page-sub">{t("libreria.nEsercizi",{count:list.length})}</div></div>
      <div className="library-controls">
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input className="search-input" type="text" placeholder={t("libreria.cerca")} value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <div className="filters">
          {CATEGORIES.map(c=><button key={c} className={`filter-btn${filter===c?" active":""}`} onClick={()=>setFilter(c)}>{valore("categoria",c)}</button>)}
          {(
            <button onClick={()=>setShowForm(p=>!p)} style={{background:showForm?"rgba(232,255,71,.12)":"var(--card2)",border:"1px solid var(--border)",color:"var(--accent)",fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:700,padding:"5px 12px",borderRadius:8,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
              {showForm?`✕ ${t("comune.chiudi")}`:`+ ${t("libreria.nuovo")}`}
            </button>
          )}
        </div>
      </div>
      {showForm&&(
        <form onSubmit={handleCreate} style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,padding:"16px 18px",marginBottom:16}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <label style={{display:"flex",flexDirection:"column",gap:5,fontSize:11,fontWeight:700,letterSpacing:".8px",textTransform:"uppercase",color:"var(--muted)"}}>
              {t("comune.nome")} *
              <input className="field-input" type="text" value={nome} onChange={e=>setNome(e.target.value)} placeholder={t("libreria.phNome")} required style={{fontSize:14,padding:"9px 12px"}}/>
            </label>
            <label style={{display:"flex",flexDirection:"column",gap:5,fontSize:11,fontWeight:700,letterSpacing:".8px",textTransform:"uppercase",color:"var(--muted)"}}>
              {t("comune.categoria")} *
              <select className="field-select" value={categoria} onChange={e=>setCategoria(e.target.value)} required style={{fontSize:14,padding:"9px 12px"}}>
                <option value="">— {t("comune.seleziona")} —</option>
                {CATEGORIES.slice(1).map(c=><option key={c} value={c}>{valore("categoria",c)}</option>)}
              </select>
            </label>
          </div>
          <label style={{display:"flex",flexDirection:"column",gap:5,fontSize:11,fontWeight:700,letterSpacing:".8px",textTransform:"uppercase",color:"var(--muted)",marginBottom:10}}>
            {t("libreria.descrizione")}
            <textarea className="field-input" value={descrizione} onChange={e=>setDescrizione(e.target.value)} placeholder={t("libreria.phDescrizione")} rows={2} style={{fontSize:13,padding:"9px 12px",resize:"vertical",minHeight:56}}/>
          </label>
          <div style={{background:"var(--surface)",border:"1px dashed var(--border)",borderRadius:9,padding:"12px 14px",marginBottom:12,display:"flex",alignItems:"center",gap:10,opacity:.6}}>
            <span style={{fontSize:22}}>📷</span>
            <span style={{fontSize:12,color:"var(--muted)",fontWeight:500}}>{t("libreria.fotoPresto")}</span>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button type="button" className="btn-ghost" style={{fontSize:13,padding:"7px 14px"}} onClick={()=>setShowForm(false)}>{t("comune.annulla")}</button>
            <button type="submit" className="btn-primary" style={{fontSize:13,padding:"7px 16px"}} disabled={saving||!nome.trim()||!categoria}>
              {saving?t("comune.salvataggio"):t("libreria.crea")}
            </button>
          </div>
        </form>
      )}
      <div className="grid">
        {list.map(ex=>(
          <ExCard
            key={ex.id}
            ex={ex}
            onVideo={ex.yt?setModal:undefined}
            onDelete={ex.isCustom?()=>handleDelete(ex.customId):undefined}
          />
        ))}
      </div>
      {list.length===0&&<div style={{textAlign:"center",color:"var(--muted)",padding:"60px 0"}}>{t("libreria.nessunRisultato",{q:search})}</div>}
      {modal&&<VideoModal ex={modal} onClose={()=>setModal(null)}/>}
    </div>
  );
}
