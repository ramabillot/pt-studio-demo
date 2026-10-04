// ── Utility functions, storage helpers, PDF generation ────────────────────────
import { CAT_COLORS_PDF, EX_IMAGES, ALL_DAYS } from "./data.js";
import { t, locale, nomeEsercizio, valore } from "./i18n/index.js";

// ── Date helpers ──────────────────────────────────────────────────────────────
export function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export function fmtDateShort(dateStr) {
  return new Date(dateStr+"T12:00").toLocaleDateString(locale(),{weekday:"short",day:"numeric",month:"short"});
}

export function fmtDateLong(dateStr) {
  return new Date(dateStr+"T12:00").toLocaleDateString(locale(),{weekday:"long",day:"numeric",month:"long",year:"numeric"});
}

export function calcEta(dataNascita) {
  if(!dataNascita) return null;
  const d = new Date(dataNascita+"T12:00");
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

// ── General utilities ─────────────────────────────────────────────────────────
export function calcSummary(rows) {
  const totalSets = rows.reduce((s,r)=>s+r.sets,0);
  const estMin    = Math.round(rows.reduce((s,r)=>s+r.sets*(r.rest+40),0)/60);
  const cats      = [...new Set(rows.map(r=>r.cat).filter(Boolean))];
  return { totalSets, estMin, cats, count:rows.length };
}

export function getInitials(nome,cognome) { return `${nome?.[0]||""}${cognome?.[0]||""}`.toUpperCase(); }

// Numero con virgola o punto ("17,5" → 17.5). Stringa vuota/non valida → null
export function parseNum(v) {
  if(v===null||v===undefined) return null;
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// localStorage sicuro (può fallire in navigazione privata)
export const store = {
  get(k){ try { return localStorage.getItem(k); } catch { return null; } },
  set(k,v){ try { localStorage.setItem(k,v); } catch { /* ignora */ } },
  del(k){ try { localStorage.removeItem(k); } catch { /* ignora */ } },
};
export const LS_ATLETA_TOKEN = "ptstudio_atleta_token";
export const LS_ATLETA_USERNAME = "ptstudio_atleta_username";   // per precompilare login e icona

// ── PDF generation ────────────────────────────────────────────────────────────
function drawPH(doc,x,y,w,h) {
  doc.setFillColor(240,240,245); doc.roundedRect(x,y,w,h,2,2,"F");
  doc.setDrawColor(210,210,220); doc.setLineWidth(0.3); doc.roundedRect(x,y,w,h,2,2,"S");
  doc.setFontSize(7); doc.setTextColor(170,170,185); doc.text(t("pdf.nessunaImmagine"),x+w/2,y+h/2+1,{align:"center"});
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
  // jsPDF caricato solo quando serve (alleggerisce il primo caricamento dell'app)
  const { default: jsPDF } = await import("jspdf");
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
  doc.setFontSize(9); doc.setFont("helvetica","normal"); doc.setTextColor(107,107,128); doc.text(t("pdf.schedaPer"),M+10,112);
  doc.setFontSize(26); doc.setFont("helvetica","bold"); doc.setTextColor(232,232,240); doc.text(cn,M+10,126);
  let dy=142;
  [{k:t("comune.obiettivo"),v:valore("obiettivo",obiettivo)||"—"},{k:t("comune.livello"),v:valore("livello",livello)||"—"},{k:t("comune.data"),v:new Date().toLocaleDateString(locale())}].forEach(({k,v})=>{
    doc.setFontSize(8); doc.setFont("helvetica","normal"); doc.setTextColor(107,107,128); doc.text(k.toUpperCase(),M+10,dy);
    doc.setFontSize(12); doc.setFont("helvetica","bold"); doc.setTextColor(200,200,215); doc.text(v,M+10,dy+7); dy+=18;
  });
  doc.setFontSize(7); doc.setFont("helvetica","normal"); doc.setTextColor(60,60,80); doc.text(t("pdf.generato"),M+10,PH-10);

  const activeDays=ALL_DAYS.filter(d=>giorni[d]&&giorni[d].length>0);
  let exDone=0,totalEx=activeDays.reduce((s,d)=>s+giorni[d].length,0);

  for(const day of activeDays) {
    const scheda=giorni[day];
    doc.addPage(); y=M;
    doc.setFillColor(255,255,255); doc.rect(0,0,PW,28,"F");
    doc.setFillColor(130,160,0); doc.rect(0,0,4,28,"F");
    doc.setFont("helvetica","bold"); doc.setFontSize(20); doc.setTextColor(40,40,50); doc.text(t("comune.giornoN",{g:day}).toUpperCase(),M,19);
    doc.setFontSize(9); doc.setFont("helvetica","normal"); doc.setTextColor(150,150,160); doc.text(cn,PW-M,12,{align:"right"});
    doc.setFontSize(12); doc.setFont("helvetica","bold"); doc.setTextColor(130,160,0); doc.text(t("libreria.nEsercizi",{count:scheda.length}),PW-M,22,{align:"right"});
    doc.setDrawColor(220,220,225); doc.setLineWidth(0.4); doc.line(0,28,PW,28);
    const sum=calcSummary(scheda);
    doc.setFillColor(248,248,252); doc.rect(0,28,PW,14,"F");
    doc.setFont("helvetica","normal"); doc.setFontSize(8.5); doc.setTextColor(80,80,100);
    let sx2=M; [`${t("builder.serieTotali")}: ${sum.totalSets}`,`${t("builder.tempoStimato")}: ~${sum.estMin} min`,`${t("builder.gruppi")}: ${sum.cats.map(c=>valore("categoria",c)).join(", ")}`].forEach(s=>{ doc.text(s,sx2,37); sx2+=doc.getTextWidth(s)+14; });
    y=48;

    const IMG_W=55,IMG_H=42;
    for(let i=0;i<scheda.length;i++) {
      const row=scheda[i];
      const nomeEx=nomeEsercizio(row.name,row.id);
      onProgress&&onProgress(exDone/totalEx,`${t("comune.giornoN",{g:day})} — ${nomeEx}…`);
      np(82);
      const rgb=CAT_COLORS_PDF[row.cat]||[80,80,200];
      doc.setFillColor(248,248,252); doc.roundedRect(M,y,CW,11,2,2,"F");
      doc.setFillColor(...rgb); doc.roundedRect(M,y,12,11,2,2,"F");
      doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.setTextColor(255,255,255); doc.text(String(i+1),M+6,y+7.2,{align:"center"});
      doc.setFontSize(11); doc.setTextColor(25,25,35); doc.text(nomeEx,M+16,y+7.5);
      const catTxt=String(valore("categoria",row.cat)||"").toUpperCase();
      const bw=doc.getTextWidth(catTxt)+8;
      doc.setFillColor(...rgb.map(c=>Math.min(255,c+80))); doc.roundedRect(PW-M-bw-2,y+2,bw,7,1.5,1.5,"F");
      doc.setFontSize(7); doc.setTextColor(...rgb.map(c=>Math.max(0,c-20))); doc.text(catTxt,PW-M-bw/2-2,y+7,{align:"center"});
      y+=14;
      let cx2=M+2;
      [{label:t("builder.serie"),val:String(row.sets)},{label:t("card.ripetizioni"),val:String(row.reps)},{label:t("builder.recupero"),val:`${row.rest}s`}].forEach(({label,val})=>{
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
      doc.setFontSize(8); doc.setFont("helvetica","bold"); doc.setTextColor(130,160,0); doc.text(t("pdf.note"),nx,ny2); ny2+=6;
      for(let l=0;l<4;l++){ doc.setDrawColor(220,220,228); doc.setLineWidth(0.3); doc.line(nx,ny2,nx+nw,ny2); ny2+=8; }
      y+=IMG_H+10;
      doc.setDrawColor(230,230,235); doc.setLineWidth(0.3); doc.line(M,y,PW-M,y); y+=7;
      exDone++;
    }
  }

  const total=doc.getNumberOfPages();
  for(let p=2;p<=total;p++){ doc.setPage(p); doc.setDrawColor(220,220,225); doc.setLineWidth(0.3); doc.line(M,PH-11,PW-M,PH-11); doc.setFont("helvetica","normal"); doc.setFontSize(7.5); doc.setTextColor(170,170,180); doc.text("PT Studio",M,PH-5); doc.text(`${p-1}/${total-1}`,PW-M,PH-5,{align:"right"}); }
  const fn=[nome,cognome].filter(Boolean).join("-")||"atleta";
  doc.save(`${t("pdf.nomeFile")}-${fn}.pdf`);
}
