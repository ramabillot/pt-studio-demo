// ── Utility functions, computed data, storage helpers, PDF generation ─────────
import jsPDF from "jspdf";
import {
  DEMO_ATLETI, LS_ATLETI, LS_KEY, LS_CAL_SHARED,
  FAKE_EX_IDS, EXERCISES, CAT_COLORS_PDF, EX_IMAGES, ALL_DAYS,
  THEME_MAP, THEME_DEFAULTS,
} from "./data.js";

// ── Date helpers ──────────────────────────────────────────────────────────────
export function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export function addDays(base, n) {
  const d = new Date(base); d.setDate(d.getDate()+n); return d;
}

export const today = new Date();

export function fmtDateShort(dateStr) {
  return new Date(dateStr+"T12:00").toLocaleDateString("it-IT",{weekday:"short",day:"numeric",month:"short"});
}

export function fmtDateLong(dateStr) {
  return new Date(dateStr+"T12:00").toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
}

export function calcEta(dataNascita) {
  if(!dataNascita) return null;
  const d = new Date(dataNascita+"T12:00");
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

// ── Computed initial data (depend on fmtDate/addDays) ─────────────────────────
export const DEMO_EVENTS = [
  { id:1, clientId:1, clientName:"Luca Ferrari",    date:fmtDate(addDays(today, 0)), time:"10:00", type:"Allenamento" },
  { id:2, clientId:3, clientName:"Marco Bianchi",   date:fmtDate(addDays(today, 2)), time:"09:00", type:"Valutazione" },
  { id:3, clientId:2, clientName:"Sofia Martini",   date:fmtDate(addDays(today, 4)), time:"11:30", type:"Allenamento" },
  { id:4, clientId:4, clientName:"Chiara Esposito", date:fmtDate(addDays(today,-2)), time:"17:00", type:"Recupero"    },
];

export const FAKE_SESSIONS = {
  1: [
    { date:fmtDate(addDays(today,-28)), day:"A", weights:{"1":"30","3":"20","7":"8", "16":"60","12":"0" } },
    { date:fmtDate(addDays(today,-21)), day:"A", weights:{"1":"32","3":"22","7":"9", "16":"65","12":"0" } },
    { date:fmtDate(addDays(today,-14)), day:"A", weights:{"1":"34","3":"24","7":"10","16":"70","12":"0" } },
    { date:fmtDate(addDays(today,-7)),  day:"A", weights:{"1":"36","3":"25","7":"10","16":"72","12":"5" } },
    { date:fmtDate(addDays(today,-2)),  day:"A", weights:{"1":"38","3":"27","7":"12","16":"75","12":"8" } },
  ],
  3: [
    { date:fmtDate(addDays(today,-27)), day:"A", weights:{"11":"80", "16":"100","13":"50","6":"40"} },
    { date:fmtDate(addDays(today,-20)), day:"A", weights:{"11":"90", "16":"110","13":"55","6":"45"} },
    { date:fmtDate(addDays(today,-13)), day:"A", weights:{"11":"100","16":"120","13":"60","6":"50"} },
    { date:fmtDate(addDays(today,-6)),  day:"A", weights:{"11":"110","16":"130","13":"65","6":"55"} },
    { date:fmtDate(addDays(today,-1)),  day:"A", weights:{"11":"120","16":"140","13":"70","6":"60"} },
  ],
  2: [
    { date:fmtDate(addDays(today,-20)), day:"A", weights:{"20":"0","7":"5","17":"40"} },
    { date:fmtDate(addDays(today,-8)),  day:"A", weights:{"20":"0","7":"6","17":"45"} },
  ],
  4: [
    { date:fmtDate(addDays(today,-18)), day:"A", weights:{"19":"20","7":"6","2":"8"} },
    { date:fmtDate(addDays(today,-5)),  day:"A", weights:{"19":"22","7":"7","2":"9"} },
  ],
};

export const ADMIN_EVENTS = [
  { id:1, clientName:"Call con Andrea Rossi",     date:fmtDate(addDays(today, 0)), time:"10:00", type:"Call"       },
  { id:2, clientName:"Onboarding Giulia Moretti", date:fmtDate(addDays(today, 3)), time:"14:00", type:"Onboarding" },
  { id:3, clientName:"Visita Paolo Crespi",        date:fmtDate(addDays(today, 7)), time:"11:00", type:"Visita"     },
  { id:4, clientName:"Riunione Marta Savi",        date:fmtDate(addDays(today,-1)), time:"16:00", type:"Riunione"   },
];

export const DEMO_MISURE_0 = [
  { data:fmtDate(addDays(today,-56)), peso:"82",   vita:"92", fianchi:"", petto:"", braccio:"", grassoPerc:"", fcRiposo:"72" },
  { data:fmtDate(addDays(today,-42)), peso:"80",   vita:"90", fianchi:"", petto:"", braccio:"", grassoPerc:"", fcRiposo:"70" },
  { data:fmtDate(addDays(today,-28)), peso:"78.5", vita:"88", fianchi:"", petto:"", braccio:"", grassoPerc:"", fcRiposo:"68" },
  { data:fmtDate(addDays(today,-14)), peso:"77",   vita:"86", fianchi:"", petto:"", braccio:"", grassoPerc:"", fcRiposo:"67" },
  { data:fmtDate(addDays(today,-3)),  peso:"75.5", vita:"84", fianchi:"", petto:"", braccio:"", grassoPerc:"", fcRiposo:"65" },
];

// ── General utilities ─────────────────────────────────────────────────────────
export function calcSummary(rows) {
  const totalSets = rows.reduce((s,r)=>s+r.sets,0);
  const estMin    = Math.round(rows.reduce((s,r)=>s+r.sets*(r.rest+40),0)/60);
  const cats      = [...new Set(rows.map(r=>r.cat))];
  return { totalSets, estMin, cats, count:rows.length };
}

export function getInitials(nome,cognome) { return `${nome?.[0]||""}${cognome?.[0]||""}`.toUpperCase(); }

export function getFakeExercises(atletaId) {
  return (FAKE_EX_IDS[atletaId]||[]).map(id=>EXERCISES.find(e=>e.id===id)).filter(Boolean);
}

export function countSessionsPerEx(sessions) {
  const counts = {};
  sessions.forEach(s=>{
    Object.entries(s.weights||{}).forEach(([id,v])=>{
      if(+v>0) counts[id]=(counts[id]||0)+1;
    });
  });
  return counts;
}

// ── Theme ─────────────────────────────────────────────────────────────────────
export function applyTheme(theme) {
  Object.entries(THEME_MAP).forEach(([key, cssVar])=>{
    if(theme[key]) document.documentElement.style.setProperty(cssVar, theme[key]);
  });
}

export function resetTheme() {
  Object.entries(THEME_DEFAULTS).forEach(([cssVar, val])=>{
    document.documentElement.style.setProperty(cssVar, val);
  });
}

// ── Storage helpers ───────────────────────────────────────────────────────────
export function loadAtleti() {
  try {
    const raw = localStorage.getItem(LS_ATLETI);
    if(raw) return JSON.parse(raw);
  } catch {}
  localStorage.setItem(LS_ATLETI, JSON.stringify(DEMO_ATLETI));
  return DEMO_ATLETI;
}

export function persistAtleti(arr) {
  localStorage.setItem(LS_ATLETI, JSON.stringify(arr));
}

export function loadSessions() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)||"[]"); } catch { return []; }
}

export function saveSessions(arr) {
  localStorage.setItem(LS_KEY, JSON.stringify(arr));
}

export function loadMisure(atletaId) {
  try { return JSON.parse(localStorage.getItem(`pt_misure_${atletaId}`)||"[]"); } catch { return []; }
}

export function saveMisure(atletaId, arr) {
  try { localStorage.setItem(`pt_misure_${atletaId}`, JSON.stringify(arr)); } catch {}
}

export function loadSharedCal() {
  try { const r=localStorage.getItem(LS_CAL_SHARED); return r?JSON.parse(r):null; } catch { return null; }
}

export function saveSharedCal(events) {
  try { localStorage.setItem(LS_CAL_SHARED, JSON.stringify(events)); } catch {}
}

// ── PDF generation ────────────────────────────────────────────────────────────
function drawPH(doc,x,y,w,h) {
  doc.setFillColor(240,240,245); doc.roundedRect(x,y,w,h,2,2,"F");
  doc.setDrawColor(210,210,220); doc.setLineWidth(0.3); doc.roundedRect(x,y,w,h,2,2,"S");
  doc.setFontSize(7); doc.setTextColor(170,170,185); doc.text("nessuna immagine",x+w/2,y+h/2+1,{align:"center"});
}

async function localImgToBase64(exId) {
  try {
    const slug = EX_IMAGES[exId];
    if(!slug) return null;
    const res=await fetch(`/exercises-custom/${slug}.jpg`);
    if(!res.ok) return null;
    const blob=await res.blob();
    return await new Promise((resolve,reject)=>{ const r=new FileReader(); r.onload=()=>resolve(r.result); r.onerror=reject; r.readAsDataURL(blob); });
  } catch { return null; }
}

function getImgDims(b64) {
  return new Promise(resolve=>{
    const img=new Image();
    img.onload=()=>resolve({w:img.naturalWidth,h:img.naturalHeight});
    img.onerror=()=>resolve(null);
    img.src=b64;
  });
}

export async function buildPDF({nome,cognome,obiettivo,livello,giorni,onProgress}) {
  const doc=new jsPDF({unit:"mm",format:"a4"});
  const PW=210,PH=297,M=14,CW=PW-M*2;
  let y=M;
  const np=(need)=>{ if(y+need>PH-M-10){ doc.addPage(); y=M; } };

  doc.setFillColor(7,7,13); doc.rect(0,0,PW,PH,"F");
  doc.setFillColor(130,160,0); doc.rect(0,0,5,PH,"F");
  doc.setFont("helvetica","bold"); doc.setFontSize(60);
  doc.setTextColor(232,232,240); doc.text("PT",M+10,60);
  doc.setTextColor(130,160,0); doc.text("Studio",M+10,90);
  doc.setDrawColor(42,42,58); doc.setLineWidth(0.5); doc.line(M+10,98,PW-M,98);
  const cn=[nome,cognome].filter(Boolean).join(" ")||"—";
  doc.setFontSize(9); doc.setFont("helvetica","normal"); doc.setTextColor(107,107,128); doc.text("SCHEDA PER",M+10,112);
  doc.setFontSize(26); doc.setFont("helvetica","bold"); doc.setTextColor(232,232,240); doc.text(cn,M+10,126);
  let dy=142;
  [{k:"Obiettivo",v:obiettivo||"—"},{k:"Livello",v:livello||"—"},{k:"Data",v:new Date().toLocaleDateString("it-IT")}].forEach(({k,v})=>{
    doc.setFontSize(8); doc.setFont("helvetica","normal"); doc.setTextColor(107,107,128); doc.text(k.toUpperCase(),M+10,dy);
    doc.setFontSize(12); doc.setFont("helvetica","bold"); doc.setTextColor(200,200,215); doc.text(v,M+10,dy+7); dy+=18;
  });
  doc.setFontSize(7); doc.setFont("helvetica","normal"); doc.setTextColor(60,60,80); doc.text("Generato con PT Studio",M+10,PH-10);

  const activeDays=ALL_DAYS.filter(d=>giorni[d]&&giorni[d].length>0);
  let exDone=0,totalEx=activeDays.reduce((s,d)=>s+giorni[d].length,0);

  for(const day of activeDays) {
    const scheda=giorni[day];
    doc.addPage(); y=M;
    doc.setFillColor(255,255,255); doc.rect(0,0,PW,28,"F");
    doc.setFillColor(130,160,0); doc.rect(0,0,4,28,"F");
    doc.setFont("helvetica","bold"); doc.setFontSize(20); doc.setTextColor(40,40,50); doc.text(`GIORNO ${day}`,M,19);
    doc.setFontSize(9); doc.setFont("helvetica","normal"); doc.setTextColor(150,150,160); doc.text(cn,PW-M,12,{align:"right"});
    doc.setFontSize(12); doc.setFont("helvetica","bold"); doc.setTextColor(130,160,0); doc.text(`${scheda.length} esercizi`,PW-M,22,{align:"right"});
    doc.setDrawColor(220,220,225); doc.setLineWidth(0.4); doc.line(0,28,PW,28);
    const sum=calcSummary(scheda);
    doc.setFillColor(248,248,252); doc.rect(0,28,PW,14,"F");
    doc.setFont("helvetica","normal"); doc.setFontSize(8.5); doc.setTextColor(80,80,100);
    let sx2=M; [`Serie totali: ${sum.totalSets}`,`Tempo stimato: ~${sum.estMin} min`,`Gruppi: ${sum.cats.join(", ")}`].forEach(s=>{ doc.text(s,sx2,37); sx2+=doc.getTextWidth(s)+14; });
    y=48;

    const IMG_W=55,IMG_H=42;
    for(let i=0;i<scheda.length;i++) {
      const row=scheda[i];
      onProgress&&onProgress(exDone/totalEx,`Giorno ${day} — ${row.name}…`);
      np(82);
      const rgb=CAT_COLORS_PDF[row.cat]||[80,80,200];
      doc.setFillColor(248,248,252); doc.roundedRect(M,y,CW,11,2,2,"F");
      doc.setFillColor(...rgb); doc.roundedRect(M,y,12,11,2,2,"F");
      doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.setTextColor(255,255,255); doc.text(String(i+1),M+6,y+7.2,{align:"center"});
      doc.setFontSize(11); doc.setTextColor(25,25,35); doc.text(row.name,M+16,y+7.5);
      const bw=doc.getTextWidth(row.cat.toUpperCase())+8;
      doc.setFillColor(...rgb.map(c=>Math.min(255,c+80))); doc.roundedRect(PW-M-bw-2,y+2,bw,7,1.5,1.5,"F");
      doc.setFontSize(7); doc.setTextColor(...rgb.map(c=>Math.max(0,c-20))); doc.text(row.cat.toUpperCase(),PW-M-bw/2-2,y+7,{align:"center"});
      y+=14;
      let cx2=M+2;
      [{label:"Serie",val:String(row.sets)},{label:"Ripetizioni",val:String(row.reps)},{label:"Recupero",val:`${row.rest}s`}].forEach(({label,val})=>{
        const cw2=doc.getTextWidth(`${label}: ${val}`)+10;
        doc.setFillColor(243,243,248); doc.roundedRect(cx2-2,y-4.5,cw2,7,1.5,1.5,"F");
        doc.setFontSize(8.5); doc.setFont("helvetica","normal"); doc.setTextColor(110,110,125); doc.text(`${label}: `,cx2,y);
        doc.setFont("helvetica","bold"); doc.setTextColor(25,25,35); doc.text(val,cx2+doc.getTextWidth(`${label}: `),y);
        cx2+=cw2+6;
      });
      y+=10;
      const b64=await localImgToBase64(row.id);
      if(b64){
        try{
          const dims=await getImgDims(b64);
          let dw=IMG_W,dh=IMG_H;
          if(dims){ const ar=dims.w/dims.h; if(ar>IMG_W/IMG_H){dh=IMG_W/ar;}else{dw=IMG_H*ar;} }
          doc.internal.write(`q ${dw} 0 0 ${dh} ${M} ${y} cm`);
          doc.addImage(b64,"JPEG",M,y,dw,dh,undefined,"FAST");
          doc.internal.write("Q");
        }catch{ drawPH(doc,M,y,IMG_W,IMG_H); }
      } else { drawPH(doc,M,y,IMG_W,IMG_H); }
      const nx=M+IMG_W+8,nw=CW-IMG_W-8; let ny2=y+6;
      doc.setFontSize(8); doc.setFont("helvetica","bold"); doc.setTextColor(130,160,0); doc.text("NOTE",nx,ny2); ny2+=6;
      for(let l=0;l<4;l++){ doc.setDrawColor(220,220,228); doc.setLineWidth(0.3); doc.line(nx,ny2,nx+nw,ny2); ny2+=8; }
      y+=IMG_H+10;
      doc.setDrawColor(230,230,235); doc.setLineWidth(0.3); doc.line(M,y,PW-M,y); y+=7;
      exDone++;
    }
  }

  const total=doc.getNumberOfPages();
  for(let p=2;p<=total;p++){ doc.setPage(p); doc.setDrawColor(220,220,225); doc.setLineWidth(0.3); doc.line(M,PH-11,PW-M,PH-11); doc.setFont("helvetica","normal"); doc.setFontSize(7.5); doc.setTextColor(170,170,180); doc.text("PT Studio",M,PH-5); doc.text(`${p-1}/${total-1}`,PW-M,PH-5,{align:"right"}); }
  const fn=[nome,cognome].filter(Boolean).join("-")||"atleta";
  doc.save(`scheda-${fn}.pdf`);
}
