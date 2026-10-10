import { useState, useEffect, useRef } from "react";
import { EXERCISES } from "../data.js";
import { fmtDate, fmtDateShort, fmtDateLong, buildPDF, store } from "../utils.js";
import { ultimaVolta, righeEsercizio, statoIniziale, righeDaStato } from "../lib/allenamento.js";
import EsercizioCard from "./EsercizioCard.jsx";
import * as api from "../api/atleta.js";
import { typeColor, typeBg } from "../lib/appuntamenti.js";
import AtletaProgressi from "./atleta/AtletaProgressi.jsx";
import MonthCalendar from "./atleta/MonthCalendar.jsx";
import Cronometro from "./atleta/Cronometro.jsx";
import SelettoreLingua from "./SelettoreLingua.jsx";
import { useTranslation } from "react-i18next";
import { nomeGiorno, valore, nomeEsercizio } from "../i18n/index.js";

// ── Bozza dell'allenamento in corso ──────────────────────────────────────────
// Quello che l'atleta inserisce resta salvato sul telefono finché non salva la sessione:
// se l'app si chiude (iPhone in background, aggiornamento automatico…) lo ritrova.
// Una chiave per atleta, dentro una voce per "data|giorno". Voci più vecchie di 3 giorni → via.
const BOZZA_MAX_MS = 3 * 24 * 3600 * 1000;
const chiaveBozze = id => `ptstudio_bozza_${id}`;
function leggiBozze(id) {
  try { return JSON.parse(store.get(chiaveBozze(id)) || "{}") || {}; } catch { return {}; }
}
function scriviBozza(id, voce, stati) {
  const tutte = leggiBozze(id), ora = Date.now();
  Object.keys(tutte).forEach(k => { if (!(ora - tutte[k]?.ts < BOZZA_MAX_MS)) delete tutte[k]; });
  if (stati) tutte[voce] = { ts: ora, stati }; else delete tutte[voce];
  if (Object.keys(tutte).length) store.set(chiaveBozze(id), JSON.stringify(tutte));
  else store.del(chiaveBozze(id));
}

// ── AtletaView ────────────────────────────────────────────────────────────────
// Dati via token di sessione atleta (src/api/atleta.js). Se il token non è più
// valido (atleta archiviato, PT disattivato, token scaduto) si torna al login.
export default function AtletaView({user, onLogout}) {
  const { t } = useTranslation();
  const todayStr = fmtDate(new Date());

  const [atlView, setAtlView] = useState("scheda");
  const [scheda, setScheda] = useState(null);
  const [schedaCaricata, setSchedaCaricata] = useState(false);
  const [activeDay, setActiveDay] = useState(null);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const isToday = selectedDate === todayStr;
  const [stati, setStati] = useState({});   // exKey → stato card (peso, reps, serie, nota, salta)
  const [saved, setSaved] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [chiediConferma, setChiediConferma] = useState(false);   // esercizi non segnati "fatto" al salvataggio
  const bozzaDaScrivere = useRef(false);   // true solo dopo una modifica dell'atleta
  const [saveErr, setSaveErr] = useState(null);
  const [loadErr, setLoadErr] = useState(null);
  const [pdfStateAtleta, setPdfStateAtleta] = useState(null);
  const [calEvents, setCalEvents] = useState([]);
  const [apptExpanded, setApptExpanded] = useState(false);
  const [supaSessions, setSupaSessions] = useState(null);
  const [schedaMeta, setSchedaMeta] = useState(null);
  const [supaMisurazioni, setSupaMisurazioni] = useState(null);
  const [calMonth, setCalMonth] = useState(()=>{ const n=new Date(); return {year:n.getFullYear(),month:n.getMonth()}; });

  // Errore di caricamento: sessione scaduta → logout, altrimenti messaggio
  const gestisciErrore = (e) => {
    if(e instanceof api.SessioneScaduta){ onLogout(); return; }
    console.error("[atleta]", e);
    setLoadErr("errCaricamento");   // chiave: il testo segue la lingua scelta
  };

  useEffect(()=>{
    api.getScheda().then(data=>{
      setSchedaCaricata(true);
      if(!data) return;
      const giorni={}, dayNames={}, giornoIds={};
      const sortedG=[...(data.scheda_giorni||[])].sort((a,b)=>a.ordine-b.ordine);
      sortedG.forEach(g=>{
        const key=g.giorno_key||`G${g.ordine}`;
        dayNames[key]=g.nome||"";   // tradotto a schermo con nomeGiorno()
        giornoIds[key]=g.id;
        giorni[key]=(g.scheda_esercizi||[]).sort((a,b)=>a.ordine-b.ordine).map(ex=>{
          const exFull=EXERCISES.find(e=>e.id===ex.esercizio_id_int);
          return {
            id:ex.esercizio_id_int||0, exKey:ex.id, exDbId:ex.id,
            name:ex.nome||exFull?.name||"", sets:ex.serie||3, reps:ex.reps||"10",
            rest:ex.rest_sec||90, cat:exFull?.cat||"",
            nota:(ex.note||"").trim(),   // nota del PT (testo libero, non si traduce)
          };
        });
      });
      setScheda({id:data.id, nome:data.nome||"", cognome:"", pt:user.ptNome||"", obiettivo:data.obiettivo||"", livello:data.livello||"", assegnataIl:data.assegnata_il||"", giorni, dayNames});
      setSchedaMeta({id:data.id, giornoIds});
      if(sortedG.length) setActiveDay(sortedG[0].giorno_key||Object.keys(giorni)[0]);
    }).catch(e=>{ setSchedaCaricata(true); gestisciErrore(e); });

    api.getAppuntamenti().then(data=>{
      setCalEvents((data||[]).map(r=>({id:r.id,date:r.data,time:(r.ora_inizio||"00:00").slice(0,5),clientName:user.name,type:r.tipo||"Allenamento"})));
    }).catch(gestisciErrore);

    api.getSessioni().then(data=>setSupaSessions(data||[])).catch(e=>{ setSupaSessions([]); gestisciErrore(e); });

    api.getMisurazioni().then(data=>{
      setSupaMisurazioni((data||[]).map(r=>({
        data:r.data, peso:r.peso_kg?String(r.peso_kg):"", vita:r.vita_cm?String(r.vita_cm):"",
        fianchi:r.fianchi_cm?String(r.fianchi_cm):"", petto:r.petto_cm?String(r.petto_cm):"",
        braccio:r.braccio_cm?String(r.braccio_cm):"",
        grassoPerc:r.grasso_percent?String(r.grasso_percent):"",
        fcRiposo:r.fc_riposo?String(r.fc_riposo):"",
      })));
    }).catch(gestisciErrore);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[user.id]);

  // Stato delle card per data + giorno: sessione salvata se c'è, altrimenti "ultima volta"
  useEffect(()=>{
    if(!activeDay||!supaSessions||!schedaMeta||!scheda) return;
    const gid=schedaMeta.giornoIds[activeDay];
    const sess=supaSessions.find(s=>s.data===selectedDate&&s.giorno_id===gid);
    const nuovi={};
    (scheda.giorni[activeDay]||[]).forEach(ex=>{
      const salvate=sess?righeEsercizio(sess,ex):[];
      const st=statoIniziale(ex, salvate, ultimaVolta(supaSessions, ex, selectedDate));
      if(sess && !salvate.length) st.salta=true;   // nella sessione salvata non c'era
      nuovi[ex.exKey]=st;
    });
    // Allenamento in corso non ancora salvato → si riprende da lì
    const bozza=leggiBozze(user.id)[`${selectedDate}|${activeDay}`];
    if(bozza) Object.keys(nuovi).forEach(k=>{ if(bozza.stati?.[k]) nuovi[k]={...nuovi[k], ...bozza.stati[k]}; });
    bozzaDaScrivere.current=false;
    setStati(nuovi); setSaved(!!sess);
  },[activeDay, selectedDate, supaSessions, schedaMeta, scheda]);

  // Ogni modifica dell'atleta → bozza sul telefono
  useEffect(()=>{
    if(!bozzaDaScrivere.current||!activeDay) return;
    scriviBozza(user.id, `${selectedDate}|${activeDay}`, stati);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[stati]);

  const cambiaStato = (exKey, st) => {
    bozzaDaScrivere.current=true;
    setChiediConferma(false);
    setStati(p=>({...p,[exKey]:st}));
  };

  // Cambio giorno/data: via i messaggi del salvataggio precedente
  useEffect(()=>{ setJustSaved(false); setSaveErr(null); setChiediConferma(false); },[activeDay, selectedDate]);

  // modo: undefined = controlla prima i "fatto" · "soloFatti" · "tutti" (= erano tutti fatti)
  const handleSave = async (modo)=>{
    if(saving) return;
    setSaveErr(null);
    if(selectedDate>todayStr){ setSaveErr("errFuturo"); return; }
    const gid=schedaMeta?.giornoIds[activeDay];
    const esercizi=scheda?.giorni[activeDay]||[];
    const nonFatti=esercizi.filter(ex=>stati[ex.exKey]&&!stati[ex.exKey].salta&&!stati[ex.exKey].fatto);
    if(!modo&&nonFatti.length){ setChiediConferma(true); return; }
    setChiediConferma(false);
    // Si salva solo ciò che è stato fatto: i pesi precompilati di un esercizio non fatto non finiscono nello storico
    const daSalvare=ex=>{ const st=stati[ex.exKey]; return st&&!st.salta&&(st.fatto||modo==="tutti"); };
    if(modo==="tutti") setStati(p=>Object.fromEntries(Object.entries(p).map(([k,st])=>[k,st.salta?st:{...st,fatto:true}])));
    const serie=esercizi.filter(daSalvare).flatMap(ex=>righeDaStato(ex,stati[ex.exKey]));
    if(!serie.length){ setSaveErr("errTuttiSaltati"); return; }
    const note=esercizi
      .filter(ex=>daSalvare(ex)&&stati[ex.exKey].nota?.trim())
      .map(ex=>({scheda_esercizio_id:ex.exDbId, nome_esercizio:ex.name, nota:stati[ex.exKey].nota.trim()}));
    setSaving(true);
    try {
      const idSessione=await api.saveSessione(gid, selectedDate, serie);
      if(note.length) await api.setNote(idSessione, note);
      scriviBozza(user.id, `${selectedDate}|${activeDay}`, null);   // salvata: la bozza non serve più
      bozzaDaScrivere.current=false;
      const nuove=await api.getSessioni();
      setSupaSessions(nuove||[]);
      setSaved(true); setJustSaved(true);
      window.scrollTo({top:0,behavior:"smooth"});
      setTimeout(()=>setJustSaved(false),2500);
    } catch(e){
      if(e instanceof api.SessioneScaduta){ onLogout(); return; }
      console.error("[salva sessione]", e);
      setSaveErr("errNonSalvata");
    } finally {
      setSaving(false);
    }
  };

  const handlePDFAtleta = async () => {
    if(!scheda) return;
    setPdfStateAtleta({progress:0,label:t("pdf.preparazione")});
    try {
      await buildPDF({
        nome: scheda.nome||"", cognome: scheda.cognome||"",
        obiettivo: scheda.obiettivo||"", livello: scheda.livello||"",
        giorni: scheda.giorni,
        onProgress:(p,l)=>setPdfStateAtleta({progress:p,label:l})
      });
    } catch(e){console.error(e);}
    finally{setPdfStateAtleta(null);}
  };

  const _rawSupa = supaSessions||[];
  const sessionTotal = _rawSupa.length;
  const latestSessionDate = sessionTotal > 0
    ? [..._rawSupa].sort((a,b)=>b.data.localeCompare(a.data))[0].data
    : null;
  const _sessionDates = new Set(_rawSupa.map(s=>s.data));
  let sessionStreak = 0;
  if(_sessionDates.has(todayStr)) {
    const _sd = new Date(todayStr+"T12:00");
    while(_sessionDates.has(fmtDate(_sd))){ sessionStreak++; _sd.setDate(_sd.getDate()-1); }
  }
  const futureAppts = calEvents
    .filter(e=>e.date>=todayStr)
    .sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time));
  const visibleAppts = apptExpanded ? futureAppts : futureAppts.slice(0,3);

  const header = (
    <>
      <div className="cliente-header">
        <div className="sidebar-logo" style={{marginBottom:0,cursor:"default",userSelect:"none"}}>PT<span style={{color:"var(--text)"}}>Studio</span></div>
        <div style={{fontSize:13,fontWeight:600,color:"var(--muted)",flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textAlign:"center"}}>{user.name}</div>
        <SelettoreLingua/>
        <button className="sidebar-logout" style={{width:"auto",marginTop:0,padding:"8px 14px"}} onClick={onLogout}>↩ {t("comune.esci")}</button>
      </div>
      <div className="atleta-stats-bar">
        <span className="atleta-stats-item">💪 <strong>{sessionTotal}</strong> {t("atleta.sessioniCompletate",{count:sessionTotal})}</span>
        <span className="atleta-stats-item">📅 {t("atleta.ultima")} <strong>{latestSessionDate?fmtDateShort(latestSessionDate):"—"}</strong></span>
        <span className="atleta-stats-item">🔥 <strong>{sessionStreak}</strong> {t("atleta.giorniConsecutivi",{count:sessionStreak})}</span>
      </div>
      <div className="atleta-tab-nav">
        <button className={`atleta-tab${atlView==="scheda"?" active":""}`} onClick={()=>setAtlView("scheda")}>📋 {t("atleta.tabScheda")}</button>
        <button className={`atleta-tab${atlView==="progressi"?" active":""}`} onClick={()=>setAtlView("progressi")}>📈 {t("atleta.tabProgressi")}</button>
      </div>
      {loadErr&&<div className="cliente-body" style={{paddingBottom:0}}><div className="session-saved-banner" style={{background:"rgba(255,71,87,.08)",borderColor:"rgba(255,71,87,.3)",color:"var(--danger)"}}>{t(`atleta.${loadErr}`)}</div></div>}
    </>
  );

  const appuntamenti = futureAppts.length>0 && (
    <div className="appt-section">
      <div className="appt-section-title">📅 {t("atleta.prossimiAppuntamenti")}</div>
      {visibleAppts.map((ev,i)=>(
        <div className="appt-card" key={ev.id||i}>
          <div className="appt-date-label">{fmtDateShort(ev.date)}</div>
          <div className="appt-time">{ev.time}</div>
          <div className="appt-name">{ev.clientName}</div>
          <div className="appt-type-badge" style={{background:typeBg(ev.type),color:typeColor(ev.type)}}>{valore("tipoAppuntamento",ev.type)}</div>
        </div>
      ))}
      {futureAppts.length>3&&(
        <button className="appt-expand-btn" onClick={()=>setApptExpanded(v=>!v)}>
          {apptExpanded?`${t("comune.mostraMeno")} ▲`:`${t("comune.vediTutti",{n:futureAppts.length})} ▼`}
        </button>
      )}
    </div>
  );

  if(!scheda) return (
    <div style={{minHeight:"100vh",background:"var(--bg)"}}>
      {header}
      <div className="cliente-body" style={{paddingTop:20}}>
        {appuntamenti}
        {schedaCaricata&&(
          <div style={{textAlign:"center",paddingTop:28}}>
            <div style={{fontSize:48,marginBottom:16}}>📋</div>
            <div style={{fontSize:18,fontWeight:600,color:"var(--text)",marginBottom:8}}>{t("atleta.nessunaScheda")}</div>
            <div style={{fontSize:14,color:"var(--muted)",lineHeight:1.6}}>{t("atleta.nessunaSchedaTesto")}</div>
          </div>
        )}
        {!schedaCaricata&&<div style={{textAlign:"center",color:"var(--muted)",paddingTop:28}}>{t("comune.caricamento")}</div>}
      </div>
    </div>
  );

  const giorni = Object.keys(scheda.giorni);
  const esercizi = scheda.giorni[activeDay]||[];
  const dayNamesScheda = scheda.dayNames||{};
  const activeDayLabel = nomeGiorno(dayNamesScheda[activeDay], activeDay);

  // Mappa data → sessioni per il calendario (giorno_id → lettera del giorno)
  const _giornoIdToKey = schedaMeta
    ? Object.fromEntries(Object.entries(schedaMeta.giornoIds).map(([k,v])=>[v,k]))
    : {};
  const sessionsByDate = {};
  _rawSupa.forEach(s=>{
    const giornoKey=_giornoIdToKey[s.giorno_id];
    if(!giornoKey) return;
    const dayLabel = nomeGiorno(scheda?.dayNames?.[giornoKey], giornoKey);
    (sessionsByDate[s.data] = sessionsByDate[s.data] || []).push({giornoKey, dayLabel});
  });

  const nDaFare = esercizi.filter(ex=>stati[ex.exKey]&&!stati[ex.exKey].salta).length;
  const nFatti = esercizi.filter(ex=>stati[ex.exKey]&&!stati[ex.exKey].salta&&stati[ex.exKey].fatto).length;

  const saveBtnLabel = saving ? t("comune.salvataggio") : isToday
    ? t(saved ? "atleta.aggiornaSessione" : "atleta.salvaSessione", {giorno:activeDayLabel})
    : t(saved ? "atleta.aggiornaSessioneDel" : "atleta.salvaSessioneDel", {data:fmtDateShort(selectedDate), giorno:activeDayLabel});

  return (
    <div style={{minHeight:"100vh",background:"var(--bg)"}}>
      {header}

      {atlView==="progressi"&&<AtletaProgressi scheda={scheda} user={user} sessioni={_rawSupa} misurazioni={supaMisurazioni}/>}

      {atlView==="scheda"&&<div className="cliente-body">
        {appuntamenti}

        <div className="scheda-info-card">
          <div className="scheda-info-title">{scheda.nome||t("atleta.laTuaScheda")}</div>
          <div className="scheda-info-meta">
            {scheda.pt&&<span>👤 PT: <strong style={{color:"var(--text)"}}>{scheda.pt}</strong></span>}
            {scheda.obiettivo&&<span>🎯 {valore("obiettivo",scheda.obiettivo)}</span>}
            {scheda.livello&&<span>📊 {valore("livello",scheda.livello)}</span>}
            <span>📅 {t("atleta.assegnataIl",{data:scheda.assegnataIl?fmtDateShort(scheda.assegnataIl):"—"})}</span>
          </div>
        </div>

        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20,flexWrap:"wrap"}}>
          <div className="day-tabs">
            {giorni.map(d=>(
              <button key={d} className={`day-tab${activeDay===d?" active":""}`} onClick={()=>setActiveDay(d)}>
                {nomeGiorno(dayNamesScheda[d], d)}
              </button>
            ))}
          </div>
          {!pdfStateAtleta&&(
            <button className="btn-ghost" style={{fontSize:12,padding:"7px 14px"}} onClick={handlePDFAtleta}>
              ⬇ {t("pdf.scarica")}
            </button>
          )}
        </div>
        {pdfStateAtleta&&(
          <div className="pdf-progress" style={{marginBottom:16}}>
            <span style={{fontSize:16}}>⏳</span>
            <div className="prog-wrap"><div className="prog-fill" style={{width:`${Math.round(pdfStateAtleta.progress*100)}%`}}/></div>
            <span className="prog-label">{pdfStateAtleta.label}</span>
          </div>
        )}

        <MonthCalendar
          year={calMonth.year}
          month={calMonth.month}
          onPrev={()=>setCalMonth(({year:y,month:m})=>m===0?{year:y-1,month:11}:{year:y,month:m-1})}
          onNext={()=>setCalMonth(({year:y,month:m})=>m===11?{year:y+1,month:0}:{year:y,month:m+1})}
          sessionsByDate={sessionsByDate}
          selectedDate={selectedDate}
          onDaySelect={(dateStr,giornoKey)=>{setSelectedDate(dateStr);if(giornoKey)setActiveDay(giornoKey);}}
          todayStr={todayStr}
        />
        <div style={{textAlign:"center",fontSize:12,fontWeight:600,color:isToday?"var(--muted)":"var(--accent2)",marginBottom:12,letterSpacing:.3}}>
          {isToday?`${t("comune.oggi")} — ${fmtDateLong(selectedDate)}`:fmtDateLong(selectedDate)}
        </div>

        {justSaved&&(
          <div className="session-saved-banner" style={{background:"rgba(71,255,232,.15)",borderColor:"rgba(71,255,232,.4)",fontWeight:700}}>
            ✓ {t("atleta.sessioneSalvata")}
          </div>
        )}
        {saveErr&&(
          <div className="session-saved-banner" style={{background:"rgba(255,71,87,.1)",borderColor:"rgba(255,71,87,.4)",color:"var(--danger)",fontWeight:700}}>
            {t(`atleta.${saveErr}`)}
          </div>
        )}
        {!justSaved&&!saveErr&&saved&&(
          <div className="session-saved-banner">
            {isToday
              ? `↩ ${t("atleta.giaSalvatoOggi")}`
              : `↩ ${t("atleta.giaSalvatoDel",{data:fmtDateShort(selectedDate)})}`
            }
          </div>
        )}

        {nDaFare>0&&(
          <div className="fatti-contatore" role="status">
            <span>{t("atleta.fattiDi",{n:nFatti,tot:nDaFare})}</span>
            <span className="fatti-barra"><span style={{transform:`scaleX(${nFatti/nDaFare})`}}/></span>
          </div>
        )}

        {esercizi.map(ex=>stati[ex.exKey]&&(
          <EsercizioCard
            key={`${ex.exKey}-${selectedDate}`}
            ex={ex}
            stato={stati[ex.exKey]}
            ultima={ultimaVolta(_rawSupa, ex, selectedDate)}
            onChange={st=>cambiaStato(ex.exKey, st)}
          />
        ))}

        {chiediConferma?(
          <div className="conferma-salva">
            <div className="conferma-salva-testo">
              {t("atleta.nonFatti",{count:nDaFare-nFatti})}
              <div className="conferma-salva-nomi">
                {esercizi.filter(ex=>stati[ex.exKey]&&!stati[ex.exKey].salta&&!stati[ex.exKey].fatto).map(ex=>nomeEsercizio(ex.name, ex.id)).join(" · ")}
              </div>
            </div>
            {nFatti>0&&<button className="save-session-btn" onClick={()=>handleSave("soloFatti")} disabled={saving}>{t("atleta.salvaSoloFatti",{count:nFatti})}</button>}
            <button className={nFatti>0?"btn-ghost conferma-salva-btn":"save-session-btn"} onClick={()=>handleSave("tutti")} disabled={saving}>{t("atleta.eranoTuttiFatti")}</button>
            <button className="ex-link conferma-salva-annulla" onClick={()=>setChiediConferma(false)}>{t("comune.annulla")}</button>
          </div>
        ):(
          <button className="save-session-btn" onClick={()=>handleSave()} disabled={saving} style={saving?{opacity:.6}:undefined}>
            {saveBtnLabel}
          </button>
        )}
      </div>}
      <Cronometro/>
    </div>
  );
}
