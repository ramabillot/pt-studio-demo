// ── Lato PT: ultimi allenamenti dell'atleta (serie fatte + note) e grafico progressi ──
import { useState, useEffect } from "react";
import { supabase } from "../supabase.js";
import { fmtDateShort } from "../utils.js";
import ProgressiEsercizi from "./ProgressiEsercizi.jsx";
import { righeRiepilogo } from "../lib/allenamento.js";
import { useTranslation } from "react-i18next";
import { nomeEsercizio, nomeGiorno } from "../i18n/index.js";

const titolo = { fontSize:"0.75rem", fontWeight:600, letterSpacing:1, textTransform:"uppercase", color:"var(--muted)", marginBottom:12 };

export default function AllenamentiAtletaPT({atletaId}) {
  const { t } = useTranslation();
  const [sessioni,setSessioni]=useState(null);
  const [errore,setErrore]=useState(false);
  const [tutte,setTutte]=useState(false);

  useEffect(()=>{
    let vivo=true;
    supabase.from("sessioni")
      .select("id, data, giorno_id, scheda_giorni(nome, giorno_key), sessione_serie(esercizio_id, nome_esercizio, serie_numero, reps, peso, nota)")
      .eq("atleta_id", atletaId)
      .order("data",{ascending:true})
      .then(({data,error})=>{
        if(!vivo) return;
        if(error){ console.error("[allenamenti PT]",error); setErrore(true); setSessioni([]); return; }
        setSessioni(data||[]);
      });
    return ()=>{ vivo=false; };
  },[atletaId]);

  if(sessioni===null) return <div style={{color:"var(--muted)",fontSize:"0.8125rem"}}>{t("allenamentiPT.caricamento")}</div>;
  if(errore) return <div style={{color:"var(--danger)",fontSize:"0.8125rem"}}>{t("allenamentiPT.errore")}</div>;

  const recenti=[...sessioni].sort((a,b)=>b.data.localeCompare(a.data));
  const visibili=tutte?recenti:recenti.slice(0,5);

  return (
    <div>
      <div style={titolo}>{t("allenamentiPT.ultimi")}</div>
      {recenti.length===0?(
        <div style={{color:"var(--muted)",fontSize:"0.8125rem",marginBottom:20}}>{t("progressi.vuoto")}</div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:10}}>
          {visibili.map(s=>{
            const righe=righeRiepilogo(s);
            const note=righe.filter(r=>r.nota);
            return (
              <div key={s.id} style={{background:"var(--card2)",border:"1px solid var(--border)",borderRadius:10,padding:"10px 14px"}}>
                <div style={{display:"flex",justifyContent:"space-between",gap:8,marginBottom:6}}>
                  <strong style={{fontSize:"0.8125rem",color:"var(--text)",textTransform:"capitalize"}}>{fmtDateShort(s.data)}</strong>
                  <span style={{fontSize:"0.75rem",color:"var(--accent)",fontWeight:700}}>{s.scheda_giorni?nomeGiorno(s.scheda_giorni.nome, s.scheda_giorni.giorno_key):""}</span>
                </div>
                {righe.map(r=>(
                  <div key={r.nome} style={{display:"flex",justifyContent:"space-between",gap:10,fontSize:"0.75rem",padding:"2px 0"}}>
                    <span style={{color:"var(--muted)",minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{nomeEsercizio(r.nome)}</span>
                    <span style={{color:"var(--text)",fontWeight:600,flexShrink:0,textAlign:"right"}}>{r.testo}</span>
                  </div>
                ))}
                {note.length>0&&(
                  <div style={{marginTop:6,paddingTop:6,borderTop:"1px solid var(--border)",display:"flex",flexDirection:"column",gap:3}}>
                    {note.map(r=><div key={r.nome} style={{fontSize:"0.75rem",color:"var(--text)"}}>📝 <span style={{color:"var(--muted)"}}>{nomeEsercizio(r.nome)}:</span> {r.nota}</div>)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {recenti.length>5&&(
        <button className="appt-expand-btn" style={{marginBottom:16}} onClick={()=>setTutte(v=>!v)}>
          {tutte?`${t("comune.mostraMeno")} ▲`:`${t("comune.vediTutti",{n:recenti.length})} ▼`}
        </button>
      )}
      <div style={{...titolo,marginTop:12}}>{t("atleta.tabProgressi")}</div>
      <ProgressiEsercizi sessioni={sessioni}/>
    </div>
  );
}
