import { useState, useEffect, useRef, useMemo } from "react";
import { EXERCISES, OBIETTIVI, LIVELLI, CAT_COLORS, ALL_DAYS } from "../data.js";
import { buildPDF, fmtDate, getInitials, parseNum } from "../utils.js";
import { supabase } from "../supabase.js";
import { useTranslation } from "react-i18next";
import { nomeEsercizio, valore, nomeGiorno, fmtNum } from "../i18n/index.js";
import { caricaSchedaAttiva } from "../lib/scheda.js";
import { modelloDaDB, modelloVuoto, nuovaRiga, nuovoUid, differenze, salvaScheda, copiaInModello, payloadModello, modelloDaPayload, prossimaLettera, perPDF } from "../lib/builder.js";
import RicercaEsercizi from "./builder/RicercaEsercizi.jsx";
import EditorRiga from "./builder/EditorRiga.jsx";

// ── Atleta search dropdown (also used by Calendar) ────────────────────────────
export function AtletaSearchField({value, onChange, onSelect, atleti: propAtleti}) {
  const { t } = useTranslation();
  const [q, setQ] = useState(value||"");
  const [showDrop, setShowDrop] = useState(false);
  const allAtleti = propAtleti || [];

  useEffect(()=>{ setQ(value||""); },[value]);

  const filtered = allAtleti.filter(a=>
    !q.trim() || `${a.nome} ${a.cognome}`.toLowerCase().includes(q.toLowerCase())
  ).slice(0,5);

  const select = (a) => {
    const name = `${a.nome} ${a.cognome}`;
    setQ(name);
    onChange(name);
    if(onSelect) onSelect(a);
    setShowDrop(false);
  };

  return (
    <div style={{position:"relative"}}>
      <input
        className="field-input"
        type="text"
        placeholder={t("builder.phCercaONome")}
        value={q}
        autoComplete="off"
        onChange={e=>{ setQ(e.target.value); onChange(e.target.value); setShowDrop(true); }}
        onFocus={()=>setShowDrop(true)}
        onBlur={()=>setTimeout(()=>setShowDrop(false),150)}
      />
      {showDrop&&filtered.length>0&&(
        <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,zIndex:60,background:"var(--card2)",border:"1px solid var(--border)",borderRadius:10,overflow:"hidden",boxShadow:"0 8px 24px rgba(0,0,0,.5)"}}>
          {filtered.map(a=>(
            <div
              key={a.id}
              onMouseDown={()=>select(a)}
              style={{padding:"9px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:10,borderBottom:"1px solid var(--border)"}}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.05)"}
              onMouseLeave={e=>e.currentTarget.style.background=""}
            >
              <div style={{width:28,height:28,borderRadius:7,background:a.color||"#e8ff47",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.6875rem",fontWeight:700,color:"#07070d",flexShrink:0}}>
                {getInitials(a.nome,a.cognome)}
              </div>
              <div style={{minWidth:0}}>
                <div style={{fontSize:"0.8125rem",fontWeight:600,color:"var(--text)"}}>{a.nome} {a.cognome}</div>
                {a.obiettivo&&<div style={{fontSize:"0.6875rem",color:"var(--muted)"}}>{valore("obiettivo",a.obiettivo)}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Builder 2.0 ───────────────────────────────────────────────────────────────
// PC (uso principale): ricerca esercizi a sinistra, giorni affiancati, editor sotto la riga, trascinamento.
// Telefono (correzioni piccole): linguette dei giorni, ricerca a tutto schermo, ↑ ↓ e "Sposta in".
// Salvataggio sul posto (lib/builder.js): giorni mai cancellati (nascosti, B7), esercizi per dbId.
// B24/B19: la scheda si carica appena si sceglie l'atleta; finché non è caricata Salva è spento.
// B12: dopo il salvataggio si ricarica dal DB.
export default function Builder({preload=null, setPreload=null, user}) {
  const { t } = useTranslation();
  const oggi = fmtDate(new Date());
  const [atleti,setAtleti]=useState([]);
  const [atleta,setAtleta]=useState(null);
  const [stato,setStato]=useState("vuoto");          // vuoto | carica | pronto | errore
  const [orig,setOrig]=useState(()=>modelloVuoto());  // come è nel DB
  const [mod,setMod]=useState(()=>modelloVuoto());    // come è nel Builder
  const [attivo,setAttivo]=useState("A");
  const [aperta,setAperta]=useState(null);            // uid della riga in modifica
  const [sostituisci,setSostituisci]=useState(null);  // uid della riga di cui si cambia l'esercizio
  const [ricercaTel,setRicercaTel]=useState(false);   // ricerca a tutto schermo (telefono)
  const [menuGiorno,setMenuGiorno]=useState(null);
  const [custom,setCustom]=useState([]);
  const [conferma,setConferma]=useState(false);
  const [salvando,setSalvando]=useState(false);
  const [toast,setToast]=useState(null);
  const [errore,setErrore]=useState(null);
  const [cambioAtleta,setCambioAtleta]=useState(null);   // atleta scelto con modifiche non salvate
  const [copia,setCopia]=useState(null);                 // pannello "Copia da…"
  const [modelli,setModelli]=useState([]);
  const [salvaModello,setSalvaModello]=useState(null);   // {nome, conCarichi}
  const [pdfState,setPdfState]=useState(null);
  const richiesta=useRef(0);
  const trascina=useRef(null);
  const [sopra,setSopra]=useState(null);

  const caricaCustom=()=>supabase.from("esercizi_custom").select("*").order("created_at",{ascending:false}).then(({data})=>setCustom(data||[]));
  const caricaModelli=()=>supabase.from("modelli_scheda").select("*").is("archiviato_at",null).order("created_at",{ascending:false}).then(({data,error})=>{ if(!error) setModelli(data||[]); });
  useEffect(()=>{
    supabase.from("atleti").select("*").eq("pt_id",user.supabaseId).is("archived_at",null).order("created_at",{ascending:true})
      .then(({data})=>setAtleti(data||[]));
    caricaCustom();
    caricaModelli();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[user?.supabaseId]);

  const diff = useMemo(()=>differenze(orig,mod),[orig,mod]);
  const sporco = diff.totale>0;
  const visibili = mod.giorni.filter(g=>!g.nascosto);
  const nascosti = mod.giorni.filter(g=>g.nascosto);
  const totEs = visibili.reduce((s,g)=>s+g.righe.length,0);

  // ── Atleta e caricamento ──
  const carica=async(a)=>{
    const mia=++richiesta.current;
    setAtleta(a); setStato("carica"); setErrore(null); setToast(null); setAperta(null); setConferma(false); setCopia(null);
    try {
      const scheda=await caricaSchedaAttiva(supabase,a.id);
      if(mia!==richiesta.current) return;
      const m=scheda?modelloDaDB(scheda):{...modelloVuoto(), obiettivo:a.obiettivo||"", livello:a.livello||""};
      setOrig(scheda?m:{...modelloVuoto(0), obiettivo:m.obiettivo, livello:m.livello}); setMod(m);
      setAttivo(m.giorni.find(g=>!g.nascosto)?.key||"A");
      setStato("pronto");
    } catch(e) {
      if(mia!==richiesta.current) return;
      console.error("[builder carica]",e); setStato("errore");
    }
  };
  const scegliAtleta=(a)=>{ if(!a) return; if(sporco && atleta && a.id!==atleta.id){ setCambioAtleta(a); return; } setCambioAtleta(null); carica(a); };

  useEffect(()=>{
    if(!preload) return;
    if(preload.atleta) carica(preload.atleta);
    if(setPreload) setPreload(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[preload]);

  // ── Modifiche al modello ──
  const aggiorna=fn=>setMod(m=>{ const c=structuredClone(m); fn(c); return c; });
  const giornoDi=(m,key)=>m.giorni.find(g=>g.key===key);
  const aggiungi=(ex, key=attivo, pos=null)=>{
    if(sostituisci){ aggiorna(m=>{ for(const g of m.giorni){ const r=g.righe.find(x=>x.uid===sostituisci); if(r){ r.id=ex.id||null; r.nome=ex.name||ex.nome; } } }); setSostituisci(null); setRicercaTel(false); return; }
    const r=nuovaRiga(ex);
    aggiorna(m=>{ const g=giornoDi(m,key)||m.giorni.find(x=>!x.nascosto); if(!g) return; if(pos==null) g.righe.push(r); else g.righe.splice(pos,0,r); });
    setAperta(r.uid); setRicercaTel(false);
  };
  const creaEsercizio=async(nome,categoria)=>{
    const {data,error}=await supabase.from("esercizi_custom").insert({pt_id:user.supabaseId, nome, categoria, descrizione:null, immagine_url:null}).select().single();
    if(error){ setErrore(t("builder2.errCrea",{msg:error.message})); return; }
    setCustom(c=>[data,...c]);
    aggiungi({id:null, nome:data.nome, cat:data.categoria});
  };
  const cambiaRiga=(key,nuova)=>aggiorna(m=>{ const g=giornoDi(m,key); const i=g.righe.findIndex(r=>r.uid===nuova.uid); g.righe[i]=nuova; });
  const muovi=(key,uid,d)=>aggiorna(m=>{ const g=giornoDi(m,key); const i=g.righe.findIndex(r=>r.uid===uid), j=i+d; if(j<0||j>=g.righe.length) return; [g.righe[i],g.righe[j]]=[g.righe[j],g.righe[i]]; });
  const sposta=(da,uid,a,pos=null)=>aggiorna(m=>{ const g=giornoDi(m,da), h=giornoDi(m,a); const i=g.righe.findIndex(r=>r.uid===uid); const [r]=g.righe.splice(i,1); if(pos==null||pos>h.righe.length) h.righe.push(r); else h.righe.splice(pos,0,r); });
  const duplica=(key,uid)=>{ const n=nuovoUid(); aggiorna(m=>{ const g=giornoDi(m,key); const i=g.righe.findIndex(r=>r.uid===uid); g.righe.splice(i+1,0,{...structuredClone(g.righe[i]), uid:n, dbId:null}); }); setAperta(n); };
  const elimina=(key,uid)=>{ aggiorna(m=>{ const g=giornoDi(m,key); g.righe=g.righe.filter(r=>r.uid!==uid); }); setAperta(null); };
  const nascondi=key=>{ aggiorna(m=>{ const g=giornoDi(m,key); if(g.dbId) g.nascosto=true; else m.giorni=m.giorni.filter(x=>x.key!==key); }); setMenuGiorno(null); const altro=visibili.find(g=>g.key!==key); if(altro) setAttivo(altro.key); };
  const rimetti=key=>{ aggiorna(m=>{ giornoDi(m,key).nascosto=false; }); setAttivo(key); };
  const nuovoGiorno=()=>{ const k=prossimaLettera(mod.giorni); if(!k) return; aggiorna(m=>{ m.giorni.push({key:k, nome:"", dbId:null, nascosto:false, righe:[]}); }); setAttivo(k); };

  // ── Trascinamento (PC) ──
  const dragRiga=(ev,key,uid)=>{ trascina.current={tipo:"riga",key,uid}; ev.dataTransfer.effectAllowed="move"; try{ ev.dataTransfer.setData("text/plain",uid); }catch{ /* Safari vecchio */ } };
  const dragLib=(ev,ex)=>{ trascina.current={tipo:"lib",ex}; ev.dataTransfer.effectAllowed="copy"; try{ ev.dataTransfer.setData("text/plain",ex.nome); }catch{ /* idem */ } };
  const lascia=(ev,key,pos)=>{
    ev.preventDefault(); setSopra(null);
    const d=trascina.current; trascina.current=null; if(!d) return;
    if(d.tipo==="lib") return aggiungi(d.ex,key,pos);
    if(d.key===key){ aggiorna(m=>{ const g=giornoDi(m,key); const i=g.righe.findIndex(r=>r.uid===d.uid); const [r]=g.righe.splice(i,1); const p=pos==null?g.righe.length:(i<pos?pos-1:pos); g.righe.splice(p,0,r); }); }
    else sposta(d.key,d.uid,key,pos);
  };

  // ── Copia / modelli ──
  const apriCopia=()=>setCopia({da:"", conCarichi:true, carica:false});
  const eseguiCopia=async()=>{
    if(!copia?.da) return;
    setCopia(c=>({...c,carica:true}));
    try {
      let sorgente;
      if(copia.da.startsWith("m:")){ const md=modelli.find(x=>x.id===copia.da.slice(2)); sorgente=modelloDaPayload(md.payload,{obiettivo:md.obiettivo,livello:md.livello}); }
      else sorgente=modelloDaDB(await caricaSchedaAttiva(supabase,copia.da));
      setMod(m=>copiaInModello(m,sorgente,{conCarichi:copia.conCarichi}));
      setAttivo("A"); setAperta(null); setCopia(null);
      setToast(t("builder2.copiata"));
    } catch(e){ console.error("[copia]",e); setErrore(t("builder2.errCopia")); setCopia(c=>({...c,carica:false})); }
  };
  const eseguiSalvaModello=async()=>{
    const nome=(salvaModello?.nome||"").trim(); if(!nome) return;
    const {error}=await supabase.from("modelli_scheda").insert({pt_id:user.supabaseId, nome, obiettivo:mod.obiettivo||"", livello:mod.livello||"", payload:payloadModello(mod,{conCarichi:salvaModello.conCarichi})});
    if(error){ setErrore(t("builder2.errModello",{msg:error.message})); return; }
    setSalvaModello(null); setToast(t("builder2.modelloSalvato",{nome})); caricaModelli();
  };

  // ── Salvataggio ──
  const puoSalvare = !!atleta && stato==="pronto" && sporco && !salvando && totEs>0;
  const salva=async()=>{
    if(!puoSalvare) return;
    setSalvando(true); setErrore(null);
    try {
      await salvaScheda(supabase,{modello:mod, atleta, ptId:user.supabaseId, oggi});
      const fresca=await caricaSchedaAttiva(supabase,atleta.id);   // B12
      const m=modelloDaDB(fresca); setOrig(m); setMod(m); setAperta(null);
      setConferma(false); setToast(t("builder2.salvata",{nome:`${atleta.nome} ${atleta.cognome}`}));
    } catch(e){
      console.error("[builder salva]",e);
      setErrore(t("builder.errSalvataggio",{msg:e.message||t("builder.erroreRete")}));
    } finally { setSalvando(false); }
  };

  const pdf=async()=>{
    const {giorni,dayNames}=perPDF(mod);
    setPdfState({progress:0,label:t("pdf.preparazione")});
    try{ await buildPDF({nome:atleta?.nome||"",cognome:atleta?.cognome||"",obiettivo:mod.obiettivo,livello:mod.livello,giorni,dayNames,onProgress:(p,l)=>setPdfState({progress:p,label:l})}); }
    catch(e){ console.error(e); } finally { setPdfState(null); }
  };

  // ── Righe e colonne ──
  const kg=v=>fmtNum(parseNum(String(v??"")));   // nel Builder i numeri sono testo con la virgola
  const rigaMeta=r=>{
    if(r.tipo==="cardio") return [r.durata?`${kg(r.durata)} min`:"—", r.velocita&&`${kg(r.velocita)} km/h`, r.inclinazione&&`${kg(r.inclinazione)} %`, r.livello&&`${t("builder2.liv")} ${r.livello}`].filter(Boolean).join(" · ");
    const car=r.carichi?`${r.carichi.map(k=>k===""?"—":kg(k)).join("·")} kg`:(r.pesoIniziale!==""?`${kg(r.pesoIniziale)} kg`:"");
    return [`${r.sets} × ${r.reps}`, String(r.rest)==="0"?t("card.senzaPausa"):`${r.rest}s`, car].filter(Boolean).join(" · ");
  };
  const colonna=(g)=>{
    const sopraQui=sopra?.key===g.key;
    return (
      <section key={g.key} className={`b2-col${attivo===g.key?" attivo":""}${sopraQui?" sopra":""}`} aria-label={nomeGiorno(g.nome,g.key)}
        onDragOver={e=>{ if(trascina.current){ e.preventDefault(); if(!sopraQui) setSopra({key:g.key}); } }}
        onDrop={e=>lascia(e,g.key,null)} onClick={()=>setAttivo(g.key)}>
        <div className="b2-col-testa">
          <input className="b2-nome-giorno" value={g.nome} placeholder={nomeGiorno("",g.key)} aria-label={t("builder2.nomeGiorno")}
            onChange={e=>aggiorna(m=>{ giornoDi(m,g.key).nome=e.target.value; })}/>
          <span className="b2-conta">{g.righe.length}</span>
          <button type="button" className="b2-menu" aria-label={t("builder2.menuGiorno")} aria-expanded={menuGiorno===g.key} onClick={e=>{ e.stopPropagation(); setMenuGiorno(menuGiorno===g.key?null:g.key); }}>⋯</button>
        </div>
        {menuGiorno===g.key&&(
          <div className="b2-menu-giorno">
            <button type="button" onClick={()=>nascondi(g.key)}>{t("builder2.nascondiGiorno")}</button>
            <p>{g.dbId?t("builder2.nascondiAiuto"):t("builder2.togliAiuto")}</p>
          </div>
        )}
        <div className="b2-righe">
          {g.righe.map((r,i)=>{
            const nomeTec=r.id?nomeEsercizio(r.nome,r.id):r.nome;
            const cat=r.tipo==="cardio"?null:(EXERCISES.find(e=>e.id===r.id)?.cat||custom.find(c=>c.nome===r.nome)?.categoria);
            const open=aperta===r.uid;
            return (
              <div key={r.uid} className={`b2-riga${open?" aperta":""}`} draggable={!open}
                onDragStart={e=>dragRiga(e,g.key,r.uid)} onDragEnd={()=>{ trascina.current=null; setSopra(null); }}
                onDragOver={e=>{ if(trascina.current){ e.preventDefault(); e.stopPropagation(); setSopra({key:g.key,pos:i}); } }}
                onDrop={e=>{ e.stopPropagation(); lascia(e,g.key,i); }}>
                {sopraQui&&sopra.pos===i&&<div className="b2-segno" aria-hidden="true"/>}
                <button type="button" className="b2-riga-testa" aria-expanded={open} onClick={e=>{ e.stopPropagation(); setAttivo(g.key); setAperta(open?null:r.uid); setSostituisci(null); }}>
                  <span className="b2-grip" aria-hidden="true">⋮⋮</span>
                  <span className="b2-pallino" style={{background:r.tipo==="cardio"?"var(--warn)":(CAT_COLORS[cat]||"var(--muted)")}}/>
                  <span className="b2-riga-nome">
                    {r.alias||nomeTec}
                    {r.alias&&<small>{nomeTec}</small>}
                    <span className="b2-riga-meta">{rigaMeta(r)}{r.nota?" · 📝":""}{r.propostiIl?" · ★":""}</span>
                  </span>
                </button>
                {open&&(
                  <EditorRiga riga={r} giorni={mod.giorni} giornoKey={g.key} indice={i} totale={g.righe.length} oggi={oggi}
                    onCambia={nuova=>cambiaRiga(g.key,nuova)} onSu={()=>muovi(g.key,r.uid,-1)} onGiu={()=>muovi(g.key,r.uid,1)}
                    onSposta={a=>{ sposta(g.key,r.uid,a); setAttivo(a); }} onDuplica={()=>duplica(g.key,r.uid)} onElimina={()=>elimina(g.key,r.uid)}
                    onSostituisci={()=>{ setSostituisci(r.uid); setRicercaTel(true); setTimeout(()=>document.getElementById("b2-cerca")?.focus(),0); }}
                    onChiudi={()=>setAperta(null)}/>
                )}
              </div>
            );
          })}
          {!g.righe.length&&<div className="b2-vuoto">{t("builder2.giornoVuoto")}</div>}
          <button type="button" className="b2-aggiungi-tel" onClick={e=>{ e.stopPropagation(); setAttivo(g.key); setSostituisci(null); setRicercaTel(true); }}>＋ {t("builder2.esercizio")}</button>
        </div>
      </section>
    );
  };

  const atletaNome = a => `${a.nome} ${a.cognome}`.trim();
  const statoTesto = !atleta ? t("builder2.scegliAtleta")
    : stato==="carica" ? t("builder.caricamentoScheda")
    : stato==="errore" ? t("builder.erroreCaricamento")
    : orig.schedaId ? t("builder2.schedaAttiva",{g:visibili.length, e:totEs}) : t("builder2.nuovaScheda");

  return (
    <div className="b2">
      <div className="b2-barra">
        <label className="b2-atleta">{t("comune.atleta")}
          <select className="field-select" value={atleta?.id||""} onChange={e=>scegliAtleta(atleti.find(a=>a.id===e.target.value))}>
            <option value="">— {t("comune.seleziona")} —</option>
            {atleti.map(a=><option key={a.id} value={a.id}>{atletaNome(a)}</option>)}
          </select>
        </label>
        <span className={`b2-stato ${stato}`} role="status">{stato==="carica"&&<span className="b2-spin" aria-hidden="true"/>}{statoTesto}</span>
        {stato==="errore"&&<button type="button" className="btn-ghost" onClick={()=>carica(atleta)}>{t("builder.riprova")}</button>}
        <span className="b2-spazio"/>
        {atleta&&stato==="pronto"&&<>
          <label className="b2-sel-mini">{t("comune.obiettivo")}
            <select className="field-select" value={mod.obiettivo} onChange={e=>aggiorna(m=>{ m.obiettivo=e.target.value; })}>
              <option value="">—</option>{OBIETTIVI.map(o=><option key={o} value={o}>{valore("obiettivo",o)}</option>)}
            </select>
          </label>
          <label className="b2-sel-mini">{t("comune.livello")}
            <select className="field-select" value={mod.livello} onChange={e=>aggiorna(m=>{ m.livello=e.target.value; })}>
              <option value="">—</option>{LIVELLI.map(l=><option key={l} value={l}>{valore("livello",l)}</option>)}
            </select>
          </label>
          <button type="button" className="btn-ghost" onClick={apriCopia}>{t("builder2.copiaDa")}</button>
          <button type="button" className="btn-ghost" disabled={!totEs} onClick={()=>setSalvaModello({nome:"",conCarichi:false})}>{t("builder2.salvaModello")}</button>
          <button type="button" className="btn-ghost" disabled={!totEs||!!pdfState} onClick={pdf}>⬇ PDF</button>
        </>}
        <button type="button" className="btn-primary b2-salva" disabled={!puoSalvare} onClick={()=>setConferma(true)}>
          {salvando?t("comune.salvataggio"):sporco?t("builder2.salvaN",{count:diff.totale}):t("builder2.salva")}
        </button>
      </div>

      {cambioAtleta&&(
        <div className="b2-avviso" role="alert"><span>{t("builder2.modificheNonSalvate",{nome:atletaNome(atleta)})}</span>
          <button type="button" className="btn-ghost" onClick={()=>setCambioAtleta(null)}>{t("comune.annulla")}</button>
          <button type="button" className="btn-primary" onClick={()=>{ const a=cambioAtleta; setCambioAtleta(null); carica(a); }}>{t("builder2.cambiaComunque",{nome:atletaNome(cambioAtleta)})}</button>
        </div>
      )}
      {toast&&<div className="b2-toast" role="status"><span>✓ {toast}</span><button type="button" className="b2-x" onClick={()=>setToast(null)} aria-label={t("comune.chiudi")}>✕</button></div>}
      {errore&&<div className="b2-errore" role="alert">{errore}</div>}
      {pdfState&&<div className="pdf-progress"><span>⏳</span><div className="prog-wrap"><div className="prog-fill" style={{width:`${Math.round(pdfState.progress*100)}%`}}/></div><span className="prog-label">{pdfState.label}</span></div>}

      {conferma&&(
        <div className="b2-conferma" role="dialog" aria-label={t("builder2.primaDiSalvare")}>
          <b>{t("builder2.primaDiSalvare")}</b>
          <ul>
            {diff.tolti.length>0&&<li className="b2-rischio">{t("builder2.diffTolti",{count:diff.tolti.length, nomi:diff.tolti.join(", ")})}</li>}
            {diff.giorniNascosti.length>0&&<li>{t("builder2.diffNascosti",{nomi:diff.giorniNascosti.join(", ")})}</li>}
            {diff.nuovi.length>0&&<li>{t("builder2.diffNuovi",{count:diff.nuovi.length})}</li>}
            {diff.cambiati+diff.riordinati>0&&<li>{t("builder2.diffCambiati",{count:diff.cambiati+diff.riordinati})}</li>}
            {diff.spostati>0&&<li>{t("builder2.diffSpostati",{count:diff.spostati})}</li>}
            {diff.giorniNuovi.length+diff.giorniRimessi.length>0&&<li>{t("builder2.diffGiorni",{nomi:[...diff.giorniNuovi,...diff.giorniRimessi].join(", ")})}</li>}
          </ul>
          <p className="b2-aiuto">{t("builder2.storicoResta")}</p>
          <div className="b2-conferma-btn">
            <button type="button" className="btn-ghost" onClick={()=>setConferma(false)}>{t("comune.annulla")}</button>
            <button type="button" className="btn-primary" disabled={salvando} onClick={salva}>{salvando?t("comune.salvataggio"):t("builder2.siSalva")}</button>
          </div>
        </div>
      )}

      {copia&&(
        <div className="b2-pannello" role="dialog" aria-label={t("builder2.copiaDa")}>
          <b>{t("builder2.copiaDa")}</b>
          <select className="field-select" value={copia.da} onChange={e=>setCopia(c=>({...c,da:e.target.value}))} aria-label={t("builder2.copiaDa")}>
            <option value="">— {t("comune.seleziona")} —</option>
            <optgroup label={t("builder2.altriAtleti")}>{atleti.filter(a=>a.id!==atleta?.id).map(a=><option key={a.id} value={a.id}>{atletaNome(a)}</option>)}</optgroup>
            {modelli.length>0&&<optgroup label={t("builder2.modelli")}>{modelli.map(m=><option key={m.id} value={`m:${m.id}`}>{m.nome}</option>)}</optgroup>}
          </select>
          <label className="b2-check"><input type="checkbox" checked={copia.conCarichi} onChange={e=>setCopia(c=>({...c,conCarichi:e.target.checked}))}/> {t("builder2.conCarichi")}</label>
          <p className="b2-aiuto">{t("builder2.copiaAiuto")}</p>
          <div className="b2-conferma-btn">
            <button type="button" className="btn-ghost" onClick={()=>setCopia(null)}>{t("comune.annulla")}</button>
            <button type="button" className="btn-primary" disabled={!copia.da||copia.carica} onClick={eseguiCopia}>{copia.carica?t("comune.caricamento"):t("builder2.copia")}</button>
          </div>
        </div>
      )}
      {salvaModello&&(
        <div className="b2-pannello" role="dialog" aria-label={t("builder2.salvaModello")}>
          <b>{t("builder2.salvaModello")}</b>
          <input className="field-input" value={salvaModello.nome} placeholder={t("builder2.nomeModelloPh")} onChange={e=>setSalvaModello(s=>({...s,nome:e.target.value}))} aria-label={t("builder2.nomeModello")}/>
          <label className="b2-check"><input type="checkbox" checked={salvaModello.conCarichi} onChange={e=>setSalvaModello(s=>({...s,conCarichi:e.target.checked}))}/> {t("builder2.conCarichi")}</label>
          <div className="b2-conferma-btn">
            <button type="button" className="btn-ghost" onClick={()=>setSalvaModello(null)}>{t("comune.annulla")}</button>
            <button type="button" className="btn-primary" disabled={!salvaModello.nome.trim()} onClick={eseguiSalvaModello}>{t("builder2.salvaModello")}</button>
          </div>
        </div>
      )}

      {!atleta&&<div className="b2-inizio">{t("builder2.inizio")}</div>}
      {atleta&&stato==="carica"&&<div className="b2-griglia"><div/><div className="b2-giorni b2-scheletro">{[0,1,2].map(i=><div key={i} className="b2-col"><div className="b2-skel"/><div className="b2-skel"/><div className="b2-skel"/></div>)}</div></div>}
      {atleta&&stato==="pronto"&&(
        <div className={`b2-griglia${ricercaTel?" ricerca-aperta":""}`}>
          <aside className="b2-lato">
            <RicercaEsercizi custom={custom} onAggiungi={aggiungi} onCrea={creaEsercizio} onDragStart={dragLib}
              sostituisci={!!sostituisci} onChiudi={(ricercaTel||sostituisci)?()=>{ setRicercaTel(false); setSostituisci(null); }:null}/>
          </aside>
          <div className="b2-centro">
            <div className="b2-linguette" role="tablist">
              {visibili.map(g=><button key={g.key} type="button" role="tab" aria-selected={attivo===g.key} onClick={()=>setAttivo(g.key)}>{nomeGiorno(g.nome,g.key)} <span>{g.righe.length}</span></button>)}
            </div>
            <div className="b2-giorni" style={{"--n":Math.max(1,visibili.length)}}>
              {visibili.map(colonna)}
            </div>
            <div className="b2-piede">
              {mod.giorni.length<ALL_DAYS.length&&<button type="button" className="btn-ghost" onClick={nuovoGiorno}>＋ {t("builder2.giorno")}</button>}
              {nascosti.length>0&&<span className="b2-nascosti">{t("builder2.giorniNascosti")} {nascosti.map(g=><span key={g.key}>{nomeGiorno(g.nome,g.key)} <button type="button" className="btn-ghost" onClick={()=>rimetti(g.key)}>{t("builder2.rimetti")}</button></span>)}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
