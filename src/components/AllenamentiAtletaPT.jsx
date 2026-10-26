// ── Lato PT: ultimi allenamenti dell'atleta (serie fatte + note) e grafico progressi ──
import { useState, useEffect } from "react";
import { supabase } from "../supabase.js";
import { fmtDateShort } from "../utils.js";
import ProgressiEsercizi from "./ProgressiEsercizi.jsx";
import { righeRiepilogo } from "../lib/allenamento.js";
import { riepilogoSessione } from "../lib/settimana.js";
import { useTranslation } from "react-i18next";
import { nomeEsercizio, nomeGiorno, locale } from "../i18n/index.js";

const titolo = { fontSize:"0.75rem", fontWeight:600, letterSpacing:1, textTransform:"uppercase", color:"var(--muted)", marginBottom:12 };

export default function AllenamentiAtletaPT({atletaId, settimane=null}) {
  const { t } = useTranslation();
  const [sessioni,setSessioni]=useState(null);
  const [errore,setErrore]=useState(false);
  const [tutte,setTutte]=useState(false);

  useEffect(()=>{
    let vivo=true;
    supabase.from("sessioni")
      .select("id, data, giorno_id, note, scheda_giorni(nome, giorno_key, scheda_esercizi(id, nome, serie, reps, tipo, nome_atleta, ordine)), sessione_serie(esercizio_id, nome_esercizio, serie_numero, reps, peso, nota, durata_sec, velocita, inclinazione, livello)")
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
      {settimane&&settimane.some(w=>w.ob>0)&&<>
        <div style={titolo}>{t("pt.andamento")}</div>
        <div className="dett-settimane">
          {settimane.map(w=>(
            <span key={w.lunedi} className="dett-sett">
              <i className={`${w.prima?"":w.fatti>=w.ob?"ok":w.fatti>0?"mezzo":""}${w.inCorso?" ora":""}`}>{w.prima?"·":`${w.fatti}/${w.ob}`}</i>
              {new Date(w.lunedi+"T12:00").toLocaleDateString(locale(),{day:"numeric",month:"numeric"})}
            </span>
          ))}
        </div>
      </>}
      <div style={titolo}>{t("allenamentiPT.ultimi")}</div>
      {recenti.length===0?(
        <div style={{color:"var(--muted)",fontSize:"0.8125rem",marginBottom:20}}>{t("progressi.vuoto")}</div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:10}}>
          {visibili.map(s=>{
            const righe=righeRiepilogo(s);
            const note=righe.filter(r=>r.nota);
            // Confronto con il giorno della scheda (di oggi): esercizi e serie fatti, saltati, ripetizioni fuori scala
            const es=(s.scheda_giorni?.scheda_esercizi||[]).map(e=>({id:e.id,nome:e.nome,serie:e.serie||1,reps:e.reps,tipo:e.tipo,alias:e.nome_atleta||""}));
            const rs=es.length?riepilogoSessione(s,es):null;
            return (
              <div key={s.id} style={{background:"var(--card2)",border:"1px solid var(--border)",borderRadius:10,padding:"10px 14px"}}>
                <div style={{display:"flex",justifyContent:"space-between",gap:8,marginBottom:6}}>
                  <strong style={{fontSize:"0.8125rem",color:"var(--text)",textTransform:"capitalize"}}>{fmtDateShort(s.data)}</strong>
                  <span style={{fontSize:"0.75rem",color:"var(--accent)",fontWeight:700}}>{s.scheda_giorni?nomeGiorno(s.scheda_giorni.nome, s.scheda_giorni.giorno_key):""}</span>
                </div>
                {rs&&(
                  <div className="sess-chip">
                    <span className={rs.esFatti>=rs.esPrev?"ok":"mezzo"}>{t("allenamentiPT.esercizi",{n:rs.esFatti,tot:rs.esPrev})}</span>
                    <span className={rs.serieFatte>=rs.seriePrev?"ok":"mezzo"}>{t("allenamentiPT.serie",{n:rs.serieFatte,tot:rs.seriePrev})}</span>
                    {rs.saltati.map(n=><span key={n} className="no">{t("allenamentiPT.saltato",{nome:nomeEsercizio(n)})}</span>)}
                    {rs.strani.map(x=><span key={x.nome} className="mezzo">⚠ {t("allenamentiPT.strano",{nome:nomeEsercizio(x.nome),r:x.reps,p:x.previste})}</span>)}
                  </div>
                )}
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
