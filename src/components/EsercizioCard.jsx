// ── Card esercizio lato atleta: peso/ripetizioni precompilati, serie diverse, nota, salta ──
import { useState } from "react";
import { EXERCISES, CAT_COLORS, EX_IMAGES, ytSearchUrl } from "../data.js";
import { VideoModal } from "./Library.jsx";
import { riassuntoSerie } from "../lib/allenamento.js";

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
  const [imgOk, setImgOk] = useState(true);
  const [showVideo, setShowVideo] = useState(false);
  const [notaAperta, setNotaAperta] = useState(!!stato.nota);
  const cc = CAT_COLORS[ex.cat] || "#e8ff47";
  const slug = EX_IMAGES[ex.id];
  const exFull = EXERCISES.find(e => e.id === ex.id);
  const set = patch => onChange({...stato, ...patch});

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
          ? <img className="ex-atleta-thumb" src={`/exercises-custom/${slug}.jpg`} alt={ex.name} onError={()=>setImgOk(false)}/>
          : <div className="ex-atleta-thumb-ph">💪</div>)}
        <div className="ex-atleta-body">
          <div className="ex-atleta-top">
            {ex.cat?<span className="ex-cat" style={{color:cc,background:`${cc}16`}}>{ex.cat}</span>:<span/>}
            <button className="ex-link" onClick={()=>set({salta:!stato.salta})}>{stato.salta?"↩ Lo faccio":"Salta"}</button>
          </div>
          <div className="ex-cliente-name">{ex.name}</div>
          <div className="ex-cliente-meta">{ex.sets} serie × {ex.reps} rip · recupero {ex.rest}s</div>

          {!stato.salta&&<>
            {ultima&&(
              <div className="ex-ultima">
                Ultima volta: <strong>{riassuntoSerie(ultima.serie)}</strong>
              </div>
            )}

            {stato.modo==="fisso"?(
              <div className="ex-input-row">
                <Campo label="Peso" value={stato.peso} onChange={v=>set({peso:v})} unita="kg"/>
                <span className="ex-per">×</span>
                <Campo label="Ripetizioni" value={stato.reps} onChange={v=>set({reps:v})} unita="rip" decimale={false}/>
                <span className="ex-per" style={{fontSize:12}}>per serie</span>
              </div>
            ):(
              <div className="ex-serie-list">
                {stato.serie.map((s,i)=>(
                  <div className="ex-input-row" key={i}>
                    <span className="ex-serie-n">S{i+1}</span>
                    <Campo label={`Peso serie ${i+1}`} value={s.peso} onChange={v=>setSerie(i,{peso:v})} unita="kg"/>
                    <span className="ex-per">×</span>
                    <Campo label={`Ripetizioni serie ${i+1}`} value={s.reps} onChange={v=>setSerie(i,{reps:v})} unita="rip" decimale={false}/>
                  </div>
                ))}
              </div>
            )}

            <div className="ex-azioni">
              {stato.modo==="fisso"
                ? <button className="ex-link" onClick={dividi}>Serie diverse</button>
                : <button className="ex-link" onClick={unisci}>Stesso peso per tutte</button>}
              {!notaAperta&&<button className="ex-link" onClick={()=>setNotaAperta(true)}>＋ Nota</button>}
              {exFull?.yt
                ? <button className="ex-link" onClick={()=>setShowVideo(true)}>▶ Video</button>
                : <a className="ex-link" href={ytSearchUrl(ex.name)} target="_blank" rel="noopener noreferrer">▶ Cerca video</a>}
            </div>

            {notaAperta&&(
              <textarea className="field-input ex-nota" rows={2} placeholder="Es. non ho chiuso l'ultima serie, inizio 10 kg finisco 15…"
                value={stato.nota} onChange={e=>set({nota:e.target.value})}/>
            )}
          </>}
        </div>
      </div>
      {showVideo&&exFull&&<VideoModal ex={exFull} onClose={()=>setShowVideo(false)}/>}
    </>
  );
}
