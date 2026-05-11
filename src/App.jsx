import { useState, useEffect } from "react";
import jsPDF from "jspdf";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');`;

const CSS = `
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  :root {
    --bg:#0a0a0f; --surface:#111118; --card:#16161f;
    --border:#2a2a3a; --accent:#e8ff47; --accent2:#47ffe8;
    --text:#e8e8f0; --muted:#6b6b80; --danger:#ff4747; --radius:12px;
  }
  body { background:var(--bg); color:var(--text); font-family:'DM Sans',sans-serif; }
  #root { min-height:100vh; }

  /* HEADER */
  .header {
    display:flex; align-items:center; justify-content:space-between;
    padding:18px 40px; border-bottom:1px solid var(--border);
    background:var(--surface); position:sticky; top:0; z-index:100;
  }
  .logo { font-family:'Bebas Neue',sans-serif; font-size:28px; letter-spacing:3px; color:var(--accent); }
  .logo span { color:var(--text); }
  .nav { display:flex; gap:8px; }
  .nav-btn {
    background:none; border:1px solid var(--border); color:var(--muted);
    font-family:'DM Sans',sans-serif; font-size:13px; font-weight:500;
    letter-spacing:1px; padding:8px 18px; border-radius:6px; cursor:pointer;
    transition:all .2s; text-transform:uppercase;
  }
  .nav-btn:hover,.nav-btn.active { border-color:var(--accent); color:var(--accent); background:rgba(232,255,71,.06); }

  .main { max-width:1280px; margin:0 auto; padding:40px 24px; }
  .section-head { display:flex; align-items:baseline; gap:16px; margin-bottom:28px; }
  .section-title { font-family:'Bebas Neue',sans-serif; font-size:36px; letter-spacing:2px; color:var(--text); }
  .section-sub { color:var(--muted); font-size:13px; text-transform:uppercase; letter-spacing:1px; }

  /* SEARCH + FILTERS */
  .library-controls { display:flex; flex-direction:column; gap:12px; margin-bottom:28px; }
  .search-wrap { position:relative; max-width:340px; }
  .search-input {
    background:var(--card); border:1px solid var(--border); color:var(--text);
    font-family:'DM Sans',sans-serif; font-size:14px;
    padding:10px 14px 10px 38px; border-radius:8px; outline:none;
    transition:border-color .2s; width:100%;
  }
  .search-input:focus { border-color:var(--accent); }
  .search-icon { position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--muted); font-size:15px; pointer-events:none; }
  .filters { display:flex; gap:8px; flex-wrap:wrap; }
  .filter-btn {
    background:var(--card); border:1px solid var(--border); color:var(--muted);
    font-family:'DM Sans',sans-serif; font-size:13px; font-weight:500;
    padding:7px 18px; border-radius:100px; cursor:pointer; transition:all .2s;
    text-transform:uppercase; letter-spacing:.8px;
  }
  .filter-btn:hover { border-color:var(--accent); color:var(--accent); }
  .filter-btn.active { background:var(--accent); border-color:var(--accent); color:#0a0a0f; font-weight:600; }

  /* EXERCISE GRID */
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(270px,1fr)); gap:16px; }

  /* EXERCISE CARD */
  .card {
    background:var(--card); border:1px solid var(--border);
    border-radius:var(--radius); overflow:hidden;
    display:flex; flex-direction:column;
    transition:border-color .2s,transform .15s; position:relative;
  }
  .card::before {
    content:''; position:absolute; top:0; left:0; right:0; height:2px;
    background:linear-gradient(90deg,var(--accent),var(--accent2)); opacity:0; transition:opacity .2s; z-index:1;
  }
  .card:hover { border-color:rgba(232,255,71,.3); transform:translateY(-2px); }
  .card:hover::before { opacity:1; }
  .card-thumb {
    width:100%; height:150px; object-fit:cover; display:block;
    background:var(--surface);
  }
  .card-thumb-placeholder {
    width:100%; height:150px; background:var(--surface);
    display:flex; align-items:center; justify-content:center;
    color:var(--muted); font-size:28px;
  }
  .card-body { padding:16px; display:flex; flex-direction:column; gap:10px; flex:1; }
  .card-cat {
    font-size:10px; font-weight:600; letter-spacing:1.5px; text-transform:uppercase;
    display:inline-block; padding:3px 10px; border-radius:4px; width:fit-content;
  }
  .card-name { font-size:16px; font-weight:600; color:var(--text); line-height:1.3; }
  .card-muscles { font-size:12px; color:var(--muted); line-height:1.5; }
  .card-muscles strong { color:rgba(232,255,71,.7); font-weight:500; }
  .card-footer { margin-top:auto; }
  .video-btn {
    background:none; border:1px solid var(--border); color:var(--muted);
    font-family:'DM Sans',sans-serif; font-size:13px; font-weight:500;
    padding:8px 16px; border-radius:6px; cursor:pointer;
    transition:all .2s; display:flex; align-items:center; gap:8px; width:100%;
  }
  .video-btn:hover { border-color:var(--danger); color:var(--danger); background:rgba(255,71,71,.06); }
  .play-icon {
    width:22px; height:22px; background:var(--danger);
    border-radius:50%; display:flex; align-items:center; justify-content:center;
    font-size:9px; color:white; flex-shrink:0;
  }

  /* MODAL */
  .overlay {
    position:fixed; inset:0; background:rgba(0,0,0,.85); backdrop-filter:blur(8px);
    z-index:1000; display:flex; align-items:center; justify-content:center; padding:24px;
    animation:fadeIn .2s ease;
  }
  @keyframes fadeIn { from{opacity:0}to{opacity:1} }
  .modal {
    background:var(--card); border:1px solid var(--border); border-radius:16px;
    width:100%; max-width:680px; overflow:hidden; animation:slideUp .25s ease;
  }
  @keyframes slideUp { from{transform:translateY(24px);opacity:0}to{transform:translateY(0);opacity:1} }
  .modal-header {
    display:flex; align-items:center; justify-content:space-between;
    padding:20px 24px; border-bottom:1px solid var(--border);
  }
  .modal-title { font-family:'Bebas Neue',sans-serif; font-size:22px; letter-spacing:1.5px; }
  .modal-close {
    background:none; border:1px solid var(--border); color:var(--muted);
    width:32px; height:32px; border-radius:50%; cursor:pointer; font-size:16px;
    display:flex; align-items:center; justify-content:center; transition:all .2s;
  }
  .modal-close:hover { border-color:var(--danger); color:var(--danger); }
  .modal-video { position:relative; padding-top:56.25%; background:#000; }
  .modal-video iframe { position:absolute; inset:0; width:100%; height:100%; border:none; }
  .modal-body { padding:20px 24px; }
  .modal-muscles { color:var(--muted); font-size:14px; }
  .modal-muscles strong { color:var(--accent2); }

  /* BUILDER */
  .builder { display:flex; flex-direction:column; gap:20px; }

  /* CLIENT CARD */
  .client-card {
    background:var(--card); border:1px solid var(--border); border-radius:var(--radius);
    padding:24px;
  }
  .client-card-title {
    font-family:'Bebas Neue',sans-serif; font-size:18px; letter-spacing:1.5px;
    color:var(--muted); margin-bottom:16px;
  }
  .client-grid { display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:14px; }
  .field-label { display:flex; flex-direction:column; gap:6px; font-size:11px; font-weight:600; letter-spacing:1px; text-transform:uppercase; color:var(--muted); }
  .field-input, .field-select {
    background:var(--surface); border:1px solid var(--border); color:var(--text);
    font-family:'DM Sans',sans-serif; font-size:14px; padding:10px 14px; border-radius:8px;
    outline:none; transition:border-color .2s; width:100%; appearance:none;
  }
  .field-input:focus, .field-select:focus { border-color:var(--accent); }

  /* DAY TABS */
  .day-tabs { display:flex; gap:0; border:1px solid var(--border); border-radius:10px; overflow:hidden; background:var(--surface); width:fit-content; }
  .day-tab {
    background:none; border:none; color:var(--muted);
    font-family:'DM Sans',sans-serif; font-size:13px; font-weight:600; letter-spacing:.5px;
    padding:10px 24px; cursor:pointer; transition:all .2s; text-transform:uppercase;
    border-right:1px solid var(--border);
  }
  .day-tab:last-child { border-right:none; }
  .day-tab:hover { color:var(--text); }
  .day-tab.active { background:var(--accent); color:#0a0a0f; }

  /* ADD ROW */
  .builder-top {
    background:var(--card); border:1px solid var(--border); border-radius:var(--radius);
    padding:20px; display:grid; grid-template-columns:1fr auto auto auto auto; gap:12px; align-items:end;
  }
  label { display:flex; flex-direction:column; gap:6px; font-size:11px; font-weight:600; letter-spacing:1px; text-transform:uppercase; color:var(--muted); }
  select, input[type="number"] {
    background:var(--surface); border:1px solid var(--border); color:var(--text);
    font-family:'DM Sans',sans-serif; font-size:14px; padding:10px 14px; border-radius:8px;
    outline:none; transition:border-color .2s; width:100%; appearance:none;
  }
  select:focus, input[type="number"]:focus { border-color:var(--accent); }
  input[type="number"] { width:90px; text-align:center; }
  .add-btn {
    background:var(--accent); border:none; color:#0a0a0f;
    font-family:'DM Sans',sans-serif; font-size:13px; font-weight:700;
    padding:10px 20px; border-radius:8px; cursor:pointer; transition:opacity .2s;
    white-space:nowrap; height:42px;
  }
  .add-btn:hover { opacity:.85; }

  /* SCHEDA TABLE */
  .scheda-wrap { background:var(--card); border:1px solid var(--border); border-radius:var(--radius); overflow:hidden; }
  .scheda-head {
    display:grid; grid-template-columns:2fr 1fr 1fr 1fr 40px;
    padding:12px 20px; border-bottom:1px solid var(--border);
    font-size:11px; font-weight:600; letter-spacing:1px; text-transform:uppercase; color:var(--muted);
  }
  .scheda-row {
    display:grid; grid-template-columns:2fr 1fr 1fr 1fr 40px;
    padding:14px 20px; border-bottom:1px solid var(--border);
    align-items:center; font-size:14px; transition:background .15s;
    animation:rowIn .25s ease;
  }
  @keyframes rowIn { from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:translateX(0)} }
  .scheda-row:last-child { border-bottom:none; }
  .scheda-row:hover { background:rgba(255,255,255,.02); }
  .scheda-cat-dot { display:inline-block; width:6px; height:6px; border-radius:50%; margin-right:8px; vertical-align:middle; }
  .badge { display:inline-flex; align-items:center; justify-content:center; background:rgba(232,255,71,.08); color:var(--accent); font-size:13px; font-weight:600; width:36px; height:26px; border-radius:5px; }
  .rest-badge { background:rgba(71,255,232,.08); color:var(--accent2); }
  .del-btn { background:none; border:none; cursor:pointer; color:var(--muted); font-size:16px; line-height:1; transition:color .2s; padding:4px; border-radius:4px; }
  .del-btn:hover { color:var(--danger); }
  .empty-state { padding:50px 24px; text-align:center; color:var(--muted); font-size:15px; display:flex; flex-direction:column; align-items:center; gap:12px; }
  .empty-icon { font-size:40px; opacity:.4; }

  /* SUMMARY */
  .summary {
    display:grid; grid-template-columns:repeat(4,1fr); gap:12px;
  }
  .summary-card {
    background:var(--card); border:1px solid var(--border); border-radius:var(--radius);
    padding:16px 20px; display:flex; flex-direction:column; gap:4px;
  }
  .summary-label { font-size:11px; font-weight:600; letter-spacing:1px; text-transform:uppercase; color:var(--muted); }
  .summary-value { font-family:'Bebas Neue',sans-serif; font-size:28px; letter-spacing:1px; color:var(--accent); line-height:1; }
  .summary-sub { font-size:12px; color:var(--muted); }

  /* ACTIONS */
  .scheda-actions { display:flex; gap:10px; justify-content:flex-end; align-items:center; }
  .pdf-btn {
    background:var(--accent); border:none; color:#0a0a0f;
    font-family:'DM Sans',sans-serif; font-size:13px; font-weight:700;
    padding:10px 22px; border-radius:8px; cursor:pointer; transition:opacity .2s;
  }
  .pdf-btn:hover { opacity:.85; }
  .pdf-btn:disabled { opacity:.4; cursor:not-allowed; }
  .clear-btn {
    background:none; border:1px solid var(--border); color:var(--muted);
    font-family:'DM Sans',sans-serif; font-size:13px;
    padding:10px 22px; border-radius:8px; cursor:pointer; transition:all .2s;
  }
  .clear-btn:hover { border-color:var(--danger); color:var(--danger); }

  /* PROGRESS */
  .pdf-progress {
    background:var(--card); border:1px solid var(--border); border-radius:var(--radius);
    padding:16px 20px; display:flex; align-items:center; gap:14px;
  }
  .progress-bar-wrap { flex:1; height:6px; background:var(--surface); border-radius:100px; overflow:hidden; }
  .progress-bar-fill { height:100%; background:linear-gradient(90deg,var(--accent),var(--accent2)); border-radius:100px; transition:width .3s ease; }
  .progress-label { font-size:12px; color:var(--muted); white-space:nowrap; }

  @media (max-width:900px) {
    .client-grid { grid-template-columns:1fr 1fr; }
    .summary { grid-template-columns:1fr 1fr; }
  }
  @media (max-width:700px) {
    .header { padding:14px 16px; }
    .main { padding:20px 12px; }
    .client-grid { grid-template-columns:1fr; }
    .builder-top { grid-template-columns:1fr 1fr; }
    .builder-top>*:first-child { grid-column:1/-1; }
    .builder-top .add-btn { grid-column:1/-1; width:100%; }
    .scheda-head { grid-template-columns:2fr 1fr 40px; }
    .scheda-head>*:nth-child(3),.scheda-head>*:nth-child(4) { display:none; }
    .scheda-row { grid-template-columns:2fr 1fr 40px; }
    .scheda-row>*:nth-child(3),.scheda-row>*:nth-child(4) { display:none; }
    .summary { grid-template-columns:1fr 1fr; }
  }
`;

// ── DATA ──────────────────────────────────────────────────────────────────────
const CAT_COLORS     = { Braccia:"#e8ff47", Spalle:"#47ffe8", Schiena:"#ff9f47", Gambe:"#ff47a3" };
const CAT_COLORS_PDF = { Braccia:[130,160,0], Spalle:[0,140,120], Schiena:[170,95,0], Gambe:[170,0,95] };
const CATEGORIES     = ["Tutte","Braccia","Spalle","Schiena","Gambe"];
const DAYS           = ["A","B","C"];
const OBIETTIVI      = ["Ipertrofia","Dimagrimento","Forza","Resistenza","Tonificazione"];
const LIVELLI        = ["Principiante","Intermedio","Avanzato"];

const EXERCISES = [
  { id:1,  cat:"Braccia", name:"Curl con bilanciere",        muscles:"Bicipite brachiale, brachiale",               yt:"kwG2ipFRgfo" },
  { id:2,  cat:"Braccia", name:"Curl con manubri alternati", muscles:"Bicipite brachiale, brachioradiale",           yt:"ykJmrZ5v0Oo" },
  { id:3,  cat:"Braccia", name:"Tricep pushdown al cavo",    muscles:"Capo lungo e laterale del tricipite",          yt:"2-LAMcpzODU"  },
  { id:4,  cat:"Braccia", name:"Skull crushers",             muscles:"Tricipite brachiale (capo lungo)",             yt:"d_KZxkY_0cM"  },
  { id:5,  cat:"Braccia", name:"Hammer curl",                muscles:"Brachioradiale, bicipite brachiale",           yt:"zC3nLlEvin4"  },
  { id:6,  cat:"Spalle",  name:"Lento avanti con bilanciere",muscles:"Deltoide anteriore, tricipite",                yt:"2yjwXTZQDDI"  },
  { id:7,  cat:"Spalle",  name:"Alzate laterali",            muscles:"Deltoide mediale",                             yt:"3VcKaXpzqRo"  },
  { id:8,  cat:"Spalle",  name:"Facepull al cavo",           muscles:"Deltoide posteriore, romboidi, trapezio",      yt:"rep-qVOkqgk"  },
  { id:9,  cat:"Spalle",  name:"Arnold press",               muscles:"Deltoide anteriore, mediale, tricipite",       yt:"3ml7BH7mNwQ"  },
  { id:10, cat:"Spalle",  name:"Alzate frontali",            muscles:"Deltoide anteriore, pettorale clavicolare",    yt:"gkiTb0RKMCg"  },
  { id:11, cat:"Schiena", name:"Stacco da terra",            muscles:"Erettori spinali, glutei, femorali, trapezio", yt:"op9kVnSso6Q"  },
  { id:12, cat:"Schiena", name:"Trazioni alla sbarra",       muscles:"Gran dorsale, bicipite, romboidi",             yt:"eGo4IYlbE5g"  },
  { id:13, cat:"Schiena", name:"Rematore con bilanciere",    muscles:"Gran dorsale, romboidi, bicipite",             yt:"9efgcAjQe7E"  },
  { id:14, cat:"Schiena", name:"Lat machine presa larga",    muscles:"Gran dorsale, bicipite brachiale",             yt:"CAwf7n6Tuuc"  },
  { id:15, cat:"Schiena", name:"Seated cable row",           muscles:"Romboidi, trapezio medio, gran dorsale",       yt:"GZbfZ033f74"  },
  { id:16, cat:"Gambe",   name:"Squat con bilanciere",       muscles:"Quadricipiti, glutei, femorali",               yt:"ultWZbUMPL8"  },
  { id:17, cat:"Gambe",   name:"Leg press 45°",              muscles:"Quadricipiti, glutei, bicipiti femorali",      yt:"IZxyjW7MPJQ"  },
  { id:18, cat:"Gambe",   name:"Romanian deadlift",          muscles:"Bicipiti femorali, gluteo grande, erettori",   yt:"JCXUYuzwNrM"  },
  { id:19, cat:"Gambe",   name:"Leg curl sdraiato",          muscles:"Bicipiti femorali, gastrocnemio",              yt:"1Tq3QdYUuHs"  },
  { id:20, cat:"Gambe",   name:"Calf raises in piedi",       muscles:"Gastrocnemio, soleo",                          yt:"gwLzBJYoWlQ"  },
];

// ── HELPERS ───────────────────────────────────────────────────────────────────
function calcSummary(rows) {
  const totalSets = rows.reduce((s, r) => s + r.sets, 0);
  const estMin    = Math.round(rows.reduce((s, r) => s + r.sets * (r.rest + 40), 0) / 60);
  const muscles   = [...new Set(rows.flatMap(r => r.muscles.split(",").map(m => m.trim())))];
  const cats      = [...new Set(rows.map(r => r.cat))];
  return { totalSets, estMin, muscles, cats };
}

async function localImgToBase64(exId) {
  try {
    const res = await fetch(`/exercises/${exId}-0.jpg`);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload  = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch { return null; }
}

// ── PDF ───────────────────────────────────────────────────────────────────────
function drawPlaceholder(doc, x, y, w, h) {
  doc.setFillColor(240,240,245);
  doc.roundedRect(x,y,w,h,2,2,"F");
  doc.setDrawColor(210,210,220); doc.setLineWidth(0.3);
  doc.roundedRect(x,y,w,h,2,2,"S");
  doc.setFontSize(7); doc.setTextColor(170,170,185);
  doc.text("nessuna immagine", x+w/2, y+h/2+1, {align:"center"});
}

async function buildPDF({ nome, cognome, obiettivo, livello, dataScheda, giorni, onProgress }) {
  const doc = new jsPDF({unit:"mm",format:"a4"});
  const PW=210, PH=297, M=14, CW=PW-M*2;
  let y=M;

  const np = (need) => { if(y+need>PH-M-10){ doc.addPage(); y=M; } };

  // ── COVER PAGE ──────────────────────────────────────────────────────────
  doc.setFillColor(10,10,15);
  doc.rect(0,0,PW,PH,"F");

  // stripe verticale
  doc.setFillColor(130,160,0);
  doc.rect(0,0,5,PH,"F");

  // logo grande
  doc.setFont("helvetica","bold");
  doc.setFontSize(60);
  doc.setTextColor(232,232,240);
  doc.text("PT", M+10, 60);
  doc.setTextColor(130,160,0);
  doc.text("Studio", M+10, 90);

  // linea decorativa
  doc.setDrawColor(42,42,58); doc.setLineWidth(0.5);
  doc.line(M+10, 98, PW-M, 98);

  // nome cliente
  const cn = [nome,cognome].filter(Boolean).join(" ") || "—";
  doc.setFontSize(9); doc.setFont("helvetica","normal"); doc.setTextColor(107,107,128);
  doc.text("SCHEDA DI ALLENAMENTO PER", M+10, 112);
  doc.setFontSize(26); doc.setFont("helvetica","bold"); doc.setTextColor(232,232,240);
  doc.text(cn, M+10, 126);

  // dettagli
  const details = [
    { k:"Obiettivo", v: obiettivo || "—" },
    { k:"Livello",   v: livello   || "—" },
    { k:"Data",      v: dataScheda|| new Date().toLocaleDateString("it-IT") },
    { k:"Giorni",    v: Object.keys(giorni).filter(d => giorni[d].length>0).map(d=>`Giorno ${d}`).join(", ") || "—" },
  ];
  let dy = 140;
  details.forEach(({k,v}) => {
    doc.setFontSize(8); doc.setFont("helvetica","normal"); doc.setTextColor(107,107,128);
    doc.text(k.toUpperCase(), M+10, dy);
    doc.setFontSize(12); doc.setFont("helvetica","bold"); doc.setTextColor(200,200,215);
    doc.text(v, M+10, dy+7);
    dy += 18;
  });

  // footer cover
  doc.setFontSize(7); doc.setFont("helvetica","normal"); doc.setTextColor(60,60,80);
  doc.text("Generato con PT Studio", M+10, PH-10);

  // ── GIORNI ──────────────────────────────────────────────────────────────
  const activeDays = DAYS.filter(d => giorni[d] && giorni[d].length > 0);
  let totalEx = activeDays.reduce((s,d) => s+giorni[d].length, 0);
  let exDone  = 0;

  for (const day of activeDays) {
    const scheda = giorni[day];
    doc.addPage();
    y = M;

    // day header
    doc.setFillColor(255,255,255);
    doc.rect(0,0,PW,28,"F");
    doc.setFillColor(130,160,0);
    doc.rect(0,0,4,28,"F");
    doc.setFont("helvetica","bold");
    doc.setFontSize(20); doc.setTextColor(40,40,50);
    doc.text(`GIORNO ${day}`, M, 19);
    doc.setFontSize(9); doc.setFont("helvetica","normal"); doc.setTextColor(150,150,160);
    doc.text(cn, PW-M, 12, {align:"right"});
    doc.setFontSize(12); doc.setFont("helvetica","bold"); doc.setTextColor(130,160,0);
    doc.text(`${scheda.length} esercizi`, PW-M, 22, {align:"right"});
    doc.setDrawColor(220,220,225); doc.setLineWidth(0.4);
    doc.line(0,28,PW,28);

    // summary bar
    const sum = calcSummary(scheda);
    doc.setFillColor(248,248,252);
    doc.rect(0,28,PW,14,"F");
    const sumItems = [
      `Serie totali: ${sum.totalSets}`,
      `Tempo stimato: ~${sum.estMin} min`,
      `Gruppi: ${sum.cats.join(", ")}`,
    ];
    doc.setFont("helvetica","normal"); doc.setFontSize(8.5); doc.setTextColor(80,80,100);
    let sx2 = M;
    sumItems.forEach(s => { doc.text(s, sx2, 37); sx2 += doc.getTextWidth(s) + 14; });

    y = 48;

    for (let i=0; i<scheda.length; i++) {
      const row = scheda[i];
      onProgress && onProgress(exDone/totalEx, `Giorno ${day} — ${row.name}…`);

      np(80);
      const rgb = CAT_COLORS_PDF[row.cat] || [80,80,200];

      // nome bar
      doc.setFillColor(248,248,252);
      doc.roundedRect(M,y,CW,11,2,2,"F");
      doc.setFillColor(...rgb);
      doc.roundedRect(M,y,12,11,2,2,"F");
      doc.setFont("helvetica","bold"); doc.setFontSize(8);
      doc.setTextColor(255,255,255);
      doc.text(String(i+1), M+6, y+7.2, {align:"center"});
      doc.setFontSize(11); doc.setTextColor(25,25,35);
      doc.text(row.name, M+16, y+7.5);
      const bw = doc.getTextWidth(row.cat.toUpperCase())+8;
      doc.setFillColor(...rgb.map(c=>Math.min(255,c+80)));
      doc.roundedRect(PW-M-bw-2,y+2,bw,7,1.5,1.5,"F");
      doc.setFontSize(7); doc.setTextColor(...rgb.map(c=>Math.max(0,c-20)));
      doc.text(row.cat.toUpperCase(), PW-M-bw/2-2, y+7, {align:"center"});
      y += 14;

      // chips
      const chips = [
        {label:"Serie",val:String(row.sets)},
        {label:"Ripetizioni",val:String(row.reps)},
        {label:"Recupero",val:`${row.rest}s`},
      ];
      let cx2=M+2;
      chips.forEach(({label,val}) => {
        const cw2=doc.getTextWidth(`${label}: ${val}`)+10;
        doc.setFillColor(243,243,248);
        doc.roundedRect(cx2-2,y-4.5,cw2,7,1.5,1.5,"F");
        doc.setFontSize(8.5); doc.setFont("helvetica","normal"); doc.setTextColor(110,110,125);
        doc.text(`${label}: `,cx2,y);
        doc.setFont("helvetica","bold"); doc.setTextColor(25,25,35);
        doc.text(val, cx2+doc.getTextWidth(`${label}: `),y);
        doc.setFont("helvetica","normal");
        cx2+=cw2+4;
      });
      y+=5;

      // muscoli
      doc.setFontSize(8); doc.setTextColor(140,140,155);
      doc.text("Muscoli: ",M+2,y);
      doc.setFont("helvetica","bold");
      doc.setTextColor(...rgb.map(c=>Math.max(0,c-20)));
      doc.text(row.muscles, M+2+doc.getTextWidth("Muscoli: "),y);
      doc.setFont("helvetica","normal");
      y+=7;

      // immagine + note
      np(52);
      const IMG_W=80, IMG_H=46;
      const b64=await localImgToBase64(row.id);
      if(b64){
        doc.setFillColor(235,235,240);
        doc.roundedRect(M+1,y+1,IMG_W,IMG_H,2,2,"F");
        doc.setFillColor(255,255,255);
        doc.roundedRect(M,y,IMG_W,IMG_H,2,2,"F");
        try { doc.addImage(b64,"JPEG",M,y,IMG_W,IMG_H,undefined,"FAST"); }
        catch { drawPlaceholder(doc,M,y,IMG_W,IMG_H); }
        doc.setFontSize(7); doc.setTextColor(180,180,190);
        doc.text("preview video",M+IMG_W/2,y+IMG_H+4,{align:"center"});
      } else {
        drawPlaceholder(doc,M,y,IMG_W,IMG_H);
      }
      // note lines
      const nx=M+IMG_W+8, nw=CW-IMG_W-8;
      let ny2=y+6;
      doc.setFontSize(8); doc.setFont("helvetica","bold"); doc.setTextColor(130,160,0);
      doc.text("NOTE", nx, ny2); ny2+=6;
      for(let l=0;l<4;l++){
        doc.setDrawColor(220,220,228); doc.setLineWidth(0.3);
        doc.line(nx,ny2,nx+nw,ny2); ny2+=8;
      }
      y+=IMG_H+10;

      // separator
      doc.setDrawColor(230,230,235); doc.setLineWidth(0.3);
      doc.line(M,y,PW-M,y); y+=7;
      exDone++;
    }
  }

  // footer su ogni pagina
  const total=doc.getNumberOfPages();
  for(let p=2;p<=total;p++){
    doc.setPage(p);
    doc.setDrawColor(220,220,225); doc.setLineWidth(0.3);
    doc.line(M,PH-11,PW-M,PH-11);
    doc.setFont("helvetica","normal"); doc.setFontSize(7.5); doc.setTextColor(170,170,180);
    doc.text("PT Studio", M, PH-5);
    doc.text(`${p-1} / ${total-1}`, PW-M, PH-5, {align:"right"});
  }

  const fn=[nome,cognome].filter(Boolean).join("-")||"cliente";
  doc.save(`scheda-${fn}.pdf`);
}

// ── COMPONENTS ────────────────────────────────────────────────────────────────
function VideoModal({ex,onClose}) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{ex.name}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-video">
          <iframe src={`https://www.youtube.com/embed/${ex.yt}?autoplay=1&rel=0`}
            allow="autoplay; encrypted-media" allowFullScreen title={ex.name}/>
        </div>
        <div className="modal-body">
          <div className="modal-muscles"><strong>Muscoli coinvolti:</strong> {ex.muscles}</div>
        </div>
      </div>
    </div>
  );
}

function ExerciseCard({ex,onVideoClick}) {
  const cc=CAT_COLORS[ex.cat]||"#e8ff47";
  const [imgOk,setImgOk]=useState(true);
  return (
    <div className="card">
      {imgOk
        ? <img className="card-thumb" src={`/exercises/${ex.id}-0.jpg`}
            alt={ex.name} onError={()=>setImgOk(false)}/>
        : <div className="card-thumb-placeholder">💪</div>
      }
      <div className="card-body">
        <span className="card-cat" style={{color:cc,background:`${cc}18`}}>{ex.cat}</span>
        <div className="card-name">{ex.name}</div>
        <div className="card-muscles"><strong>Muscoli:</strong> {ex.muscles}</div>
        <div className="card-footer">
          <button className="video-btn" onClick={()=>onVideoClick(ex)}>
            <span className="play-icon">▶</span>Guarda il video
          </button>
        </div>
      </div>
    </div>
  );
}

function LibraryView() {
  const [filter,setFilter]=useState("Tutte");
  const [search,setSearch]=useState("");
  const [modal,setModal]=useState(null);

  const list = EXERCISES.filter(e=>{
    const catOk = filter==="Tutte" || e.cat===filter;
    const srchOk = e.name.toLowerCase().includes(search.toLowerCase()) ||
                   e.muscles.toLowerCase().includes(search.toLowerCase());
    return catOk && srchOk;
  });

  return (
    <>
      <div className="section-head">
        <div className="section-title">Libreria Esercizi</div>
        <div className="section-sub">{list.length} esercizi</div>
      </div>
      <div className="library-controls">
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input className="search-input" type="text" placeholder="Cerca esercizio o muscolo…"
            value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <div className="filters">
          {CATEGORIES.map(c=>(
            <button key={c} className={`filter-btn ${filter===c?"active":""}`} onClick={()=>setFilter(c)}>{c}</button>
          ))}
        </div>
      </div>
      <div className="grid">
        {list.map(ex=><ExerciseCard key={ex.id} ex={ex} onVideoClick={setModal}/>)}
      </div>
      {list.length===0 && (
        <div style={{textAlign:"center",color:"var(--muted)",padding:"60px 0"}}>
          Nessun esercizio trovato per "{search}"
        </div>
      )}
      {modal && <VideoModal ex={modal} onClose={()=>setModal(null)}/>}
    </>
  );
}

function BuilderView() {
  const [nome,setNome]=useState("");
  const [cognome,setCognome]=useState("");
  const [obiettivo,setObiettivo]=useState("");
  const [livello,setLivello]=useState("");
  const [dataScheda,setDataScheda]=useState("");
  const [activeDay,setActiveDay]=useState("A");
  const [giorni,setGiorni]=useState({A:[],B:[],C:[]});
  const [selId,setSelId]=useState(EXERCISES[0].id);
  const [sets,setSets]=useState(3);
  const [reps,setReps]=useState(10);
  const [rest,setRest]=useState(90);
  const [pdfState,setPdfState]=useState(null);

  const scheda=giorni[activeDay];

  const addExercise=()=>{
    const ex=EXERCISES.find(e=>e.id===Number(selId));
    setGiorni(prev=>({...prev,[activeDay]:[...prev[activeDay],{...ex,sets,reps,rest,uid:Date.now()}]}));
  };

  const removeRow=(uid)=>{
    setGiorni(prev=>({...prev,[activeDay]:prev[activeDay].filter(r=>r.uid!==uid)}));
  };

  const clearDay=()=>setGiorni(prev=>({...prev,[activeDay]:[]}));

  const handlePDF=async()=>{
    const hasAny=Object.values(giorni).some(d=>d.length>0);
    if(!hasAny) return;
    setPdfState({progress:0,label:"Preparazione…"});
    try {
      await buildPDF({
        nome,cognome,obiettivo,livello,dataScheda,giorni,
        onProgress:(p,label)=>setPdfState({progress:p,label}),
      });
    } catch(err){ console.error(err); }
    finally{ setPdfState(null); }
  };

  const sum=calcSummary(scheda);
  const totalExAll=Object.values(giorni).reduce((s,d)=>s+d.length,0);

  return (
    <>
      <div className="section-head">
        <div className="section-title">Builder Scheda</div>
        <div className="section-sub">{totalExAll} esercizi totali</div>
      </div>
      <div className="builder">

        {/* CLIENT */}
        <div className="client-card">
          <div className="client-card-title">Dati Cliente</div>
          <div className="client-grid">
            <label className="field-label">Nome
              <input className="field-input" type="text" placeholder="Marco"
                value={nome} onChange={e=>setNome(e.target.value)}/>
            </label>
            <label className="field-label">Cognome
              <input className="field-input" type="text" placeholder="Rossi"
                value={cognome} onChange={e=>setCognome(e.target.value)}/>
            </label>
            <label className="field-label">Obiettivo
              <select className="field-select" value={obiettivo} onChange={e=>setObiettivo(e.target.value)}>
                <option value="">— seleziona —</option>
                {OBIETTIVI.map(o=><option key={o} value={o}>{o}</option>)}
              </select>
            </label>
            <label className="field-label">Livello
              <select className="field-select" value={livello} onChange={e=>setLivello(e.target.value)}>
                <option value="">— seleziona —</option>
                {LIVELLI.map(l=><option key={l} value={l}>{l}</option>)}
              </select>
            </label>
          </div>
        </div>

        {/* DAY TABS */}
        <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
          <div className="day-tabs">
            {DAYS.map(d=>(
              <button key={d} className={`day-tab ${activeDay===d?"active":""}`} onClick={()=>setActiveDay(d)}>
                Giorno {d}
                {giorni[d].length>0 && (
                  <span style={{marginLeft:6,background:"rgba(0,0,0,.2)",
                    borderRadius:"100px",padding:"1px 7px",fontSize:11}}>
                    {giorni[d].length}
                  </span>
                )}
              </button>
            ))}
          </div>
          <span style={{fontSize:13,color:"var(--muted)"}}>
            {scheda.length===0 ? "Giorno vuoto" : `${scheda.length} esercizi`}
          </span>
        </div>

        {/* ADD ROW */}
        <div className="builder-top">
          <label>Esercizio
            <select value={selId} onChange={e=>setSelId(e.target.value)}>
              {CATEGORIES.slice(1).map(cat=>(
                <optgroup key={cat} label={`── ${cat} ──`}>
                  {EXERCISES.filter(e=>e.cat===cat).map(ex=>(
                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label>Serie<input type="number" min={1} max={20} value={sets} onChange={e=>setSets(Number(e.target.value))}/></label>
          <label>Rip.<input type="number" min={1} max={100} value={reps} onChange={e=>setReps(Number(e.target.value))}/></label>
          <label>Rec.(s)<input type="number" min={0} max={600} step={15} value={rest} onChange={e=>setRest(Number(e.target.value))}/></label>
          <button className="add-btn" onClick={addExercise} style={{marginTop:22}}>+ Aggiungi</button>
        </div>

        {/* SCHEDA TABLE */}
        <div className="scheda-wrap">
          {scheda.length===0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <div>Giorno {activeDay} vuoto.<br/>Aggiungi il primo esercizio!</div>
            </div>
          ) : (
            <>
              <div className="scheda-head">
                <div>Esercizio</div><div>Serie × Rip.</div><div>Recupero</div><div>Muscoli</div><div></div>
              </div>
              {scheda.map(row=>{
                const cc=CAT_COLORS[row.cat]||"#e8ff47";
                return (
                  <div className="scheda-row" key={row.uid}>
                    <div><span className="scheda-cat-dot" style={{background:cc}}/>{row.name}</div>
                    <div><span className="badge">{row.sets}</span>{" × "}<span className="badge">{row.reps}</span></div>
                    <div><span className="badge rest-badge">{row.rest}s</span></div>
                    <div style={{fontSize:12,color:"var(--muted)"}}>{row.muscles.split(",")[0]}…</div>
                    <div><button className="del-btn" onClick={()=>removeRow(row.uid)}>✕</button></div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* SUMMARY */}
        {scheda.length>0 && (
          <div className="summary">
            <div className="summary-card">
              <div className="summary-label">Serie totali</div>
              <div className="summary-value">{sum.totalSets}</div>
              <div className="summary-sub">Giorno {activeDay}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">Tempo stimato</div>
              <div className="summary-value">{sum.estMin}</div>
              <div className="summary-sub">minuti circa</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">Esercizi</div>
              <div className="summary-value">{scheda.length}</div>
              <div className="summary-sub">Giorno {activeDay}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">Gruppi muscolari</div>
              <div className="summary-value" style={{fontSize:16,paddingTop:4,lineHeight:1.4}}>
                {sum.cats.join(", ")}
              </div>
            </div>
          </div>
        )}

        {/* PROGRESS */}
        {pdfState && (
          <div className="pdf-progress">
            <span style={{fontSize:18}}>⏳</span>
            <div className="progress-bar-wrap">
              <div className="progress-bar-fill" style={{width:`${Math.round(pdfState.progress*100)}%`}}/>
            </div>
            <span className="progress-label">{pdfState.label}</span>
          </div>
        )}

        {/* ACTIONS */}
        {totalExAll>0 && !pdfState && (
          <div className="scheda-actions">
            {scheda.length>0 && <button className="clear-btn" onClick={clearDay}>Svuota Giorno {activeDay}</button>}
            <button className="pdf-btn" onClick={handlePDF}>⬇ Esporta PDF completo</button>
          </div>
        )}
      </div>
    </>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [view,setView]=useState("library");
  return (
    <>
      <style>{FONTS+CSS}</style>
      <header className="header">
        <div className="logo">PT<span>Studio</span></div>
        <nav className="nav">
          <button className={`nav-btn ${view==="library"?"active":""}`} onClick={()=>setView("library")}>Libreria</button>
          <button className={`nav-btn ${view==="builder"?"active":""}`} onClick={()=>setView("builder")}>Builder</button>
        </nav>
      </header>
      <main className="main">
        {view==="library"?<LibraryView/>:<BuilderView/>}
      </main>
    </>
  );
}
