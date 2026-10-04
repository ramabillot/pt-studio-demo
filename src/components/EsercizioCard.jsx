// ── Card esercizio lato atleta: peso/ripetizioni precompilati, serie diverse, nota, salta ──
import { useState } from "react";
import { EXERCISES, CAT_COLORS, EX_IMAGES } from "../data.js";
import { VideoModal } from "./Library.jsx";
import { riassuntoSerie } from "../lib/allenamento.js";
import { secondiATempo, fmtMMSS, avviaRecupero, avviaTempo } from "../lib/cronometro.js";
import { useTranslation } from "react-i18next";
import { nomeEsercizio, valore, ytCerca } from "../i18n/index.js";

const soloNum = v => v.replace(/[^0-9.,]/g, "");
const soloInt = v => v.replace(/\D/g, "").slice(0, 3);

function Campo({value, onChange, unita, decimale=true, label}) {
  return (
    <div className="ex-campo">
      <input className="ex-peso-input" type="text" inputMode={decimale?"decimal":"numeric"} placeholder="—"
        aria-label={label} value={value}
        onChange={e=>onChange(decimale?soloNum(e.target.value):soloInt(e.target.value))}/>
      <span className="ex-peso-unit">{unita}</span>
    </div>
  );
}

export default function EsercizioCard({ex, stato, onChange, ultima}) {
  const { t } = useTranslation();
  const nome = nomeEsercizio(ex.name, ex.id);   // nel DB resta il nome italiano
  const [imgOk, setImgOk] = useState(true);
  const [showVideo, setShowVideo] = useState(false);
  const [notaAperta, setNotaAperta] = useState(!!stato.nota);
  const cc = CAT_COLORS[ex.cat] || "#e8ff47";
  const slug = EX_IMAGES[ex.id];
  const exFull = EXERCISES.find(e => e.id === ex.id);
  const set = patch => onChange({...stato, ...patch});
  const secTempo = secondiATempo(ex.reps);   // esercizio a tempo ("30s")

  const dividi = () => set({
    modo:"serie",
    serie: Array.from({length: ex.sets||3}, (_,i)=>stato.serie[i] && stato.modo==="serie" ? stato.serie[i] : {peso:stato.peso, reps:stato.reps}),
  });
  const unisci = () => set({modo:"fisso", peso:stato.serie[0]?.peso ?? stato.peso, reps:stato.serie[0]?.reps ?? stato.reps});
  const setSerie = (i, patch) => set({serie: stato.serie.map((s,j)=>j===i?{...s,...patch}:s)});

  return (
    <>
      <div className={`ex-atleta-card${stato.salta?" saltato":""}`}>
        {!stato.salta&&(imgOk && slug
          ? <img className="ex-atleta-thumb" src={`/exercises-custom/${slug}.jpg`} alt={nome} onError={()=>setImgOk(false)}/>
          : <div className="ex-atleta-thumb-ph">💪</div>)}
        <div className="ex-atleta-body">
          <div className="ex-atleta-top">
            {ex.cat?<span className="ex-cat" style={{color:cc,background:`${cc}16`}}>{valore("categoria",ex.cat)}</span>:<span/>}
            <button className="ex-link" onClick={()=>set({salta:!stato.salta})}>{stato.salta?`↩ ${t("card.loFaccio")}`:t("card.salta")}</button>
          </div>
          <div className="ex-cliente-name">{nome}</div>
          <div className="ex-cliente-meta">
            {t("card.serie",{count:ex.sets})} × {secTempo?`${secTempo}s`:`${ex.reps} ${t("allenamento.rip")}`} ·{" "}
            {stato.salta
              ? <>{t("card.recupero")} {ex.rest}s</>
              : <>
                  {secTempo>0&&<button className="crono-chip" onClick={()=>avviaTempo(nome, secTempo, ex.rest)} aria-label={t("card.ariaTempo",{s:secTempo})}>▶ {secTempo}s</button>}
                  {ex.rest>0&&<button className="crono-chip" onClick={()=>avviaRecupero(nome, ex.rest)} aria-label={t("card.ariaRecupero",{t:fmtMMSS(ex.rest)})}>⏱ {fmtMMSS(ex.rest)}</button>}
                </>}
          </div>

          {!stato.salta&&<>
            {ultima&&(
              <div className="ex-ultima">
                {t("card.ultimaVolta")} <strong>{riassuntoSerie(ultima.serie)}</strong>
              </div>
            )}

            {stato.modo==="fisso"?(
              <div className="ex-input-row">
                <Campo label={t("card.peso")} value={stato.peso} onChange={v=>set({peso:v})} unita="kg"/>
                <span className="ex-per">×</span>
                <Campo label={t("card.ripetizioni")} value={stato.reps} onChange={v=>set({reps:v})} unita={secTempo?"s":t("allenamento.rip")} decimale={false}/>
                <span className="ex-per" style={{fontSize:12}}>{t("card.perSerie")}</span>
              </div>
            ):(
              <div className="ex-serie-list">
                {stato.serie.map((s,i)=>(
                  <div className="ex-input-row" key={i}>
                    <span className="ex-serie-n">S{i+1}</span>
                    <Campo label={t("card.pesoSerie",{n:i+1})} value={s.peso} onChange={v=>setSerie(i,{peso:v})} unita="kg"/>
                    <span className="ex-per">×</span>
                    <Campo label={t("card.ripSerie",{n:i+1})} value={s.reps} onChange={v=>setSerie(i,{reps:v})} unita={secTempo?"s":t("allenamento.rip")} decimale={false}/>
                  </div>
                ))}
              </div>
            )}

            <div className="ex-azioni">
              {stato.modo==="fisso"
                ? <button className="ex-link" onClick={dividi}>{t("card.serieDiverse")}</button>
                : <button className="ex-link" onClick={unisci}>{t("card.stessoPeso")}</button>}
              {!notaAperta&&<button className="ex-link" onClick={()=>setNotaAperta(true)}>＋ {t("card.nota")}</button>}
              {exFull?.yt
                ? <button className="ex-link" onClick={()=>setShowVideo(true)}>▶ Video</button>
                : <a className="ex-link" href={ytCerca(nome)} target="_blank" rel="noopener noreferrer">▶ {t("card.cercaVideo")}</a>}
            </div>

            {notaAperta&&(
              <textarea className="field-input ex-nota" rows={2} placeholder={t("card.phNota")}
                value={stato.nota} onChange={e=>set({nota:e.target.value})}/>
            )}
          </>}
        </div>
      </div>
      {showVideo&&exFull&&<VideoModal ex={exFull} onClose={()=>setShowVideo(false)}/>}
    </>
  );
}
