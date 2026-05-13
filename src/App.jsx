import { useState, useEffect, useRef } from "react";
import jsPDF from "jspdf";

// ── FONTS & BASE CSS ──────────────────────────────────────────────────────────
const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap');`;

const CSS = `
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  :root {
    --bg:#07070d; --surface:#0f0f18; --card:#13131e; --card2:#1a1a28;
    --border:#22223a; --accent:#e8ff47; --accent2:#47ffe8; --accent3:#ff47a3;
    --accent-fg:#07070d;
    --text:#eeeef5; --muted:#5a5a78; --danger:#ff4757; --radius:14px;
    --shadow:0 4px 24px rgba(0,0,0,.4);
  }
  html { scroll-behavior:smooth; }
  body { background:var(--bg); color:var(--text); font-family:'DM Sans',sans-serif; min-height:100vh; overflow-x:hidden; }
  #root { min-height:100vh; }
  ::selection { background:rgba(232,255,71,.2); }
  ::-webkit-scrollbar { width:6px; }
  ::-webkit-scrollbar-track { background:var(--bg); }
  ::-webkit-scrollbar-thumb { background:var(--border); border-radius:3px; }

  /* ── LOGIN ── */
  .login-wrap {
    min-height:100vh; display:flex; align-items:center; justify-content:center;
    position:relative; overflow:hidden; background:var(--bg);
  }
  .login-canvas { position:absolute; inset:0; z-index:0; }
  .login-box {
    position:relative; z-index:1;
    background:rgba(15,15,24,.85); border:1px solid var(--border);
    border-radius:20px; padding:48px 44px; width:100%; max-width:420px;
    backdrop-filter:blur(20px);
    box-shadow:0 0 80px rgba(232,255,71,.06), var(--shadow);
    animation:boxIn .6s cubic-bezier(.16,1,.3,1);
  }
  @keyframes boxIn { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
  .login-logo { font-family:'Bebas Neue',sans-serif; font-size:32px; letter-spacing:4px; margin-bottom:8px; }
  .login-logo span { color:var(--accent); }
  .login-sub { color:var(--muted); font-size:14px; margin-bottom:36px; }
  .login-field { display:flex; flex-direction:column; gap:7px; margin-bottom:16px; }
  .login-field label { font-size:11px; font-weight:600; letter-spacing:1.2px; text-transform:uppercase; color:var(--muted); }
  .login-input {
    background:var(--surface); border:1px solid var(--border); color:var(--text);
    font-family:'DM Sans',sans-serif; font-size:15px; padding:13px 16px; border-radius:10px;
    outline:none; transition:border-color .2s, box-shadow .2s; width:100%;
  }
  .login-input:focus { border-color:var(--accent); box-shadow:0 0 0 3px rgba(232,255,71,.08); }
  .login-err { color:var(--danger); font-size:13px; margin-bottom:8px; text-align:center; }
  .login-btn {
    width:100%; background:var(--accent); border:none; color:var(--accent-fg);
    font-family:'DM Sans',sans-serif; font-size:15px; font-weight:700; letter-spacing:.5px;
    padding:14px; border-radius:10px; cursor:pointer; transition:opacity .2s, transform .1s;
    margin-top:8px;
  }
  .login-btn:hover { opacity:.9; }
  .login-btn:active { transform:scale(.98); }

  /* login hint redesign */
  .login-hint { margin-top:20px; display:flex; flex-direction:column; gap:8px; }
  .login-hint-block {
    padding:12px 14px; background:var(--card2); border:1px solid var(--border);
    border-radius:10px;
  }
  .login-hint-label {
    font-size:11px; font-weight:600; letter-spacing:1px; text-transform:uppercase;
    color:var(--muted); margin-bottom:8px;
  }
  .login-hint-creds {
    display:flex; align-items:center; gap:8px; flex-wrap:wrap;
  }
  .login-hint-key {
    font-size:11px; color:var(--muted); font-weight:500; white-space:nowrap;
  }
  .hint-badge {
    background:var(--border); color:var(--text); font-size:12px; font-weight:600;
    padding:3px 10px; border-radius:6px; font-family:monospace;
  }

  /* ── WELCOME TRANSITION ── */
  .welcome-screen {
    position:fixed; inset:0; background:var(--bg); z-index:500;
    display:flex; flex-direction:column; align-items:center; justify-content:center; gap:32px;
    animation:wFadeIn .4s ease;
  }
  @keyframes wFadeIn { from{opacity:0} to{opacity:1} }
  .welcome-screen.leaving { animation:wFadeOut .5s ease forwards; }
  @keyframes wFadeOut { from{opacity:1} to{opacity:0} }
  .welcome-text { text-align:center; }
  .welcome-ciao { font-size:15px; color:var(--muted); letter-spacing:2px; text-transform:uppercase; margin-bottom:8px; }
  .welcome-name { font-family:'Bebas Neue',sans-serif; font-size:52px; letter-spacing:3px; color:var(--text); word-break:break-word; }
  .welcome-name span { color:var(--accent); }

  /* Stick figure lifting */
  .lifter-wrap { position:relative; width:120px; height:120px; }
  .lifter-svg { width:120px; height:120px; }
  .bar-group { animation:lift 1.2s ease-in-out infinite alternate; transform-origin:60px 70px; }
  @keyframes lift { from{transform:translateY(6px)} to{transform:translateY(-6px)} }
  .arm-l { animation:armL 1.2s ease-in-out infinite alternate; transform-origin:52px 58px; }
  .arm-r { animation:armR 1.2s ease-in-out infinite alternate; transform-origin:68px 58px; }
  @keyframes armL { from{transform:rotate(-10deg)} to{transform:rotate(10deg)} }
  @keyframes armR { from{transform:rotate(10deg)} to{transform:rotate(-10deg)} }
  .welcome-dots { display:flex; gap:8px; }
  .welcome-dot { width:6px; height:6px; border-radius:50%; background:var(--accent); opacity:.3; animation:dotPulse 1.2s ease-in-out infinite; }
  .welcome-dot:nth-child(2) { animation-delay:.2s; }
  .welcome-dot:nth-child(3) { animation-delay:.4s; }
  @keyframes dotPulse { 0%,100%{opacity:.2;transform:scale(.8)} 50%{opacity:1;transform:scale(1)} }

  /* ── LAYOUT ── */
  .app-wrap { display:flex; min-height:100vh; }

  /* SIDEBAR */
  .sidebar {
    width:220px; flex-shrink:0; background:var(--surface);
    border-right:1px solid var(--border);
    display:flex; flex-direction:column; padding:24px 16px;
    position:sticky; top:0; height:100vh; overflow-y:auto;
  }
  .sidebar-logo { font-family:'Bebas Neue',sans-serif; font-size:24px; letter-spacing:3px; color:var(--accent); margin-bottom:4px; padding:0 8px; }
  .sidebar-logo span { color:var(--text); }
  .sidebar-user { padding:0 8px; margin-bottom:28px; }
  .sidebar-username { font-size:13px; font-weight:600; color:var(--text); }
  .sidebar-role { font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:.8px; }
  .sidebar-nav { display:flex; flex-direction:column; gap:4px; flex:1; }
  .sidebar-item {
    display:flex; align-items:center; gap:12px;
    padding:10px 12px; border-radius:10px; cursor:pointer;
    color:var(--muted); font-size:14px; font-weight:500;
    transition:all .18s; border:1px solid transparent; text-decoration:none;
  }
  .sidebar-item:hover { background:var(--card); color:var(--text); }
  .sidebar-item.active { background:rgba(232,255,71,.08); border-color:rgba(232,255,71,.15); color:var(--accent); }
  .sidebar-icon { font-size:18px; width:22px; text-align:center; flex-shrink:0; }
  .sidebar-logout {
    margin-top:auto; padding:10px 12px; border-radius:10px; cursor:pointer;
    color:var(--muted); font-size:14px; font-weight:500;
    transition:all .18s; border:1px solid transparent;
    display:flex; align-items:center; gap:12px; background:none;
    font-family:'DM Sans',sans-serif; width:100%;
  }
  .sidebar-logout:hover { color:var(--danger); border-color:rgba(255,71,87,.2); }

  /* MAIN CONTENT */
  .content { flex:1; padding:36px 40px; overflow-x:hidden; }

  /* BACK BUTTON */
  .back-btn {
    display:inline-flex; align-items:center; gap:6px;
    background:none; border:1px solid var(--border); color:var(--muted);
    font-family:'DM Sans',sans-serif; font-size:13px; font-weight:500;
    padding:7px 14px; border-radius:8px; cursor:pointer;
    transition:all .2s; margin-bottom:20px;
  }
  .back-btn:hover { border-color:var(--accent); color:var(--accent); }

  /* PAGE HEADER */
  .page-head { margin-bottom:32px; }
  .page-title { font-family:'Bebas Neue',sans-serif; font-size:38px; letter-spacing:2px; line-height:1; }
  .page-sub { color:var(--muted); font-size:14px; margin-top:4px; }

  /* STAT CARDS */
  .stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:32px; }
  .stat-card {
    background:var(--card); border:1px solid var(--border); border-radius:var(--radius);
    padding:22px 24px; position:relative; overflow:hidden;
    transition:border-color .2s, transform .15s;
    animation:cardIn .4s ease both;
  }
  .stat-card:hover { border-color:rgba(232,255,71,.2); transform:translateY(-2px); }
  @keyframes cardIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  .stat-card:nth-child(2){animation-delay:.05s} .stat-card:nth-child(3){animation-delay:.1s} .stat-card:nth-child(4){animation-delay:.15s}
  .stat-icon { font-size:22px; margin-bottom:12px; }
  .stat-val { font-family:'Bebas Neue',sans-serif; font-size:36px; letter-spacing:1px; color:var(--accent); line-height:1; }
  .stat-label { font-size:12px; color:var(--muted); margin-top:4px; text-transform:uppercase; letter-spacing:.8px; }
  .stat-glow { position:absolute; top:-20px; right:-20px; width:80px; height:80px; border-radius:50%; background:var(--accent); opacity:.04; }

  /* DASHBOARD QUICK NAV */
  .quick-nav { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; }
  .quick-card {
    background:var(--card); border:1px solid var(--border); border-radius:var(--radius);
    padding:24px; cursor:pointer; transition:all .2s; text-align:center;
    animation:cardIn .4s ease both;
  }
  .quick-card:hover { border-color:var(--accent); background:rgba(232,255,71,.04); transform:translateY(-3px); }
  .quick-card-icon { font-size:32px; margin-bottom:12px; }
  .quick-card-label { font-family:'Bebas Neue',sans-serif; font-size:18px; letter-spacing:1.5px; color:var(--text); }
  .quick-card-desc { font-size:12px; color:var(--muted); margin-top:4px; }

  /* LIBRARY */
  .library-controls { display:flex; flex-direction:column; gap:12px; margin-bottom:28px; }
  .search-wrap { position:relative; max-width:360px; }
  .search-input {
    background:var(--card); border:1px solid var(--border); color:var(--text);
    font-family:'DM Sans',sans-serif; font-size:14px;
    padding:11px 16px 11px 42px; border-radius:10px; outline:none;
    transition:border-color .2s; width:100%;
  }
  .search-input:focus { border-color:var(--accent); }
  .search-icon { position:absolute; left:14px; top:50%; transform:translateY(-50%); color:var(--muted); font-size:15px; pointer-events:none; }
  .filters { display:flex; gap:8px; flex-wrap:wrap; }
  .filter-btn {
    background:var(--card); border:1px solid var(--border); color:var(--muted);
    font-family:'DM Sans',sans-serif; font-size:12px; font-weight:600;
    padding:7px 18px; border-radius:100px; cursor:pointer; transition:all .2s;
    text-transform:uppercase; letter-spacing:.8px;
  }
  .filter-btn:hover { border-color:var(--accent); color:var(--accent); }
  .filter-btn.active { background:var(--accent); border-color:var(--accent); color:#07070d; }

  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(270px,1fr)); gap:16px; }
  .ex-card {
    background:var(--card); border:1px solid var(--border); border-radius:var(--radius);
    overflow:hidden; display:flex; flex-direction:column;
    transition:border-color .2s,transform .15s; position:relative;
    animation:cardIn .3s ease both;
  }
  .ex-card::before {
    content:''; position:absolute; top:0; left:0; right:0; height:2px;
    background:linear-gradient(90deg,var(--accent),var(--accent2)); opacity:0; transition:opacity .2s; z-index:1;
  }
  .ex-card:hover { border-color:rgba(232,255,71,.25); transform:translateY(-2px); }
  .ex-card:hover::before { opacity:1; }
  .ex-thumb { width:100%; height:160px; object-fit:cover; object-position:center top; display:block; background:var(--surface); }
  .ex-thumb-ph { width:100%; height:155px; background:var(--surface); display:flex; align-items:center; justify-content:center; color:var(--muted); font-size:32px; }
  .ex-body { padding:16px; display:flex; flex-direction:column; gap:10px; flex:1; }
  .ex-cat { font-size:10px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; display:inline-block; padding:3px 10px; border-radius:4px; width:fit-content; }
  .ex-name { font-size:16px; font-weight:600; color:var(--text); line-height:1.3; }
  .ex-muscles { font-size:12px; color:var(--muted); line-height:1.5; }
  .ex-muscles strong { color:rgba(232,255,71,.7); font-weight:500; }
  .video-btn {
    background:none; border:1px solid var(--border); color:var(--muted);
    font-family:'DM Sans',sans-serif; font-size:13px; font-weight:500;
    padding:8px 16px; border-radius:8px; cursor:pointer;
    transition:all .2s; display:flex; align-items:center; gap:8px; width:100%; margin-top:auto;
  }
  .video-btn:hover { border-color:var(--danger); color:var(--danger); background:rgba(255,71,87,.06); }
  .play-icon { width:22px; height:22px; background:var(--danger); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:9px; color:white; flex-shrink:0; }

  /* MODAL */
  .overlay { position:fixed; inset:0; background:rgba(0,0,0,.88); backdrop-filter:blur(10px); z-index:1000; display:flex; align-items:center; justify-content:center; padding:24px; animation:fadeIn .2s ease; }
  @keyframes fadeIn { from{opacity:0}to{opacity:1} }
  .modal { background:var(--card); border:1px solid var(--border); border-radius:18px; width:100%; max-width:700px; overflow:hidden; animation:slideUp .25s ease; }
  @keyframes slideUp { from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1} }
  .modal-header { display:flex; align-items:center; justify-content:space-between; padding:20px 24px; border-bottom:1px solid var(--border); }
  .modal-title { font-family:'Bebas Neue',sans-serif; font-size:22px; letter-spacing:1.5px; }
  .modal-close { background:none; border:1px solid var(--border); color:var(--muted); width:32px; height:32px; border-radius:50%; cursor:pointer; font-size:16px; display:flex; align-items:center; justify-content:center; transition:all .2s; }
  .modal-close:hover { border-color:var(--danger); color:var(--danger); }
  .modal-video { position:relative; padding-top:56.25%; background:#000; }
  .modal-video iframe { position:absolute; inset:0; width:100%; height:100%; border:none; }
  .modal-body { padding:20px 24px; }
  .modal-muscles { color:var(--muted); font-size:14px; }
  .modal-muscles strong { color:var(--accent2); }

  /* BUILDER */
  .builder { display:flex; flex-direction:column; gap:20px; }
  .client-card { background:var(--card); border:1px solid var(--border); border-radius:var(--radius); padding:24px; }
  .card-section-title { font-family:'Bebas Neue',sans-serif; font-size:17px; letter-spacing:1.5px; color:var(--muted); margin-bottom:16px; }
  .client-grid { display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:14px; }
  .field-label { display:flex; flex-direction:column; gap:6px; font-size:11px; font-weight:600; letter-spacing:1px; text-transform:uppercase; color:var(--muted); }
  .field-input, .field-select {
    background:var(--surface); border:1px solid var(--border); color:var(--text);
    font-family:'DM Sans',sans-serif; font-size:14px; padding:10px 14px; border-radius:9px;
    outline:none; transition:border-color .2s; width:100%; appearance:none;
  }
  .field-input:focus, .field-select:focus { border-color:var(--accent); }
  .day-tabs { display:flex; gap:0; border:1px solid var(--border); border-radius:10px; overflow:hidden; background:var(--surface); width:fit-content; }
  .day-tab { background:none; border:none; color:var(--muted); font-family:'DM Sans',sans-serif; font-size:13px; font-weight:600; padding:10px 24px; cursor:pointer; transition:all .2s; text-transform:uppercase; border-right:1px solid var(--border); }
  .day-tab:last-child { border-right:none; }
  .day-tab:hover { color:var(--text); }
  .day-tab.active { background:var(--accent); color:#07070d; }
  .builder-top { background:var(--card); border:1px solid var(--border); border-radius:var(--radius); padding:20px; display:grid; grid-template-columns:1fr auto auto auto auto; gap:12px; align-items:end; }
  label { display:flex; flex-direction:column; gap:6px; font-size:11px; font-weight:600; letter-spacing:1px; text-transform:uppercase; color:var(--muted); }
  select, input[type="number"] { background:var(--surface); border:1px solid var(--border); color:var(--text); font-family:'DM Sans',sans-serif; font-size:14px; padding:10px 14px; border-radius:9px; outline:none; transition:border-color .2s; width:100%; appearance:none; }
  select:focus, input[type="number"]:focus { border-color:var(--accent); }
  input[type="number"] { width:90px; text-align:center; }
  .add-btn { background:var(--accent); border:none; color:#07070d; font-family:'DM Sans',sans-serif; font-size:13px; font-weight:700; padding:10px 20px; border-radius:9px; cursor:pointer; transition:opacity .2s; white-space:nowrap; height:42px; }
  .add-btn:hover { opacity:.85; }
  .scheda-wrap { background:var(--card); border:1px solid var(--border); border-radius:var(--radius); overflow:hidden; }
  .scheda-head { display:grid; grid-template-columns:2fr 1fr 1fr 1fr 40px; padding:12px 20px; border-bottom:1px solid var(--border); font-size:11px; font-weight:600; letter-spacing:1px; text-transform:uppercase; color:var(--muted); }
  .scheda-row { display:grid; grid-template-columns:2fr 1fr 1fr 1fr 40px; padding:14px 20px; border-bottom:1px solid var(--border); align-items:center; font-size:14px; transition:background .15s; animation:rowIn .25s ease; }
  @keyframes rowIn { from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)} }
  .scheda-row:last-child { border-bottom:none; }
  .scheda-row:hover { background:rgba(255,255,255,.02); }
  .scheda-dot { display:inline-block; width:6px; height:6px; border-radius:50%; margin-right:8px; vertical-align:middle; }
  .badge { display:inline-flex; align-items:center; justify-content:center; background:rgba(232,255,71,.08); color:var(--accent); font-size:13px; font-weight:600; width:36px; height:26px; border-radius:5px; }
  .badge2 { background:rgba(71,255,232,.08); color:var(--accent2); }
  .del-btn { background:none; border:none; cursor:pointer; color:var(--muted); font-size:16px; transition:color .2s; padding:4px; border-radius:4px; }
  .del-btn:hover { color:var(--danger); }
  .empty-state { padding:50px 24px; text-align:center; color:var(--muted); font-size:15px; display:flex; flex-direction:column; align-items:center; gap:12px; }
  .empty-icon { font-size:40px; opacity:.35; }
  .summary-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
  .summary-card { background:var(--card); border:1px solid var(--border); border-radius:var(--radius); padding:16px 20px; }
  .summary-label { font-size:11px; font-weight:600; letter-spacing:1px; text-transform:uppercase; color:var(--muted); }
  .summary-val { font-family:'Bebas Neue',sans-serif; font-size:28px; color:var(--accent); line-height:1; margin:4px 0; }
  .summary-sub { font-size:12px; color:var(--muted); }
  .actions-row { display:flex; gap:10px; justify-content:flex-end; }
  .btn-primary { background:var(--accent); border:none; color:#07070d; font-family:'DM Sans',sans-serif; font-size:13px; font-weight:700; padding:10px 22px; border-radius:9px; cursor:pointer; transition:opacity .2s; }
  .btn-primary:hover { opacity:.85; }
  .btn-ghost { background:none; border:1px solid var(--border); color:var(--muted); font-family:'DM Sans',sans-serif; font-size:13px; padding:10px 22px; border-radius:9px; cursor:pointer; transition:all .2s; }
  .btn-ghost:hover { border-color:var(--danger); color:var(--danger); }
  .pdf-progress { background:var(--card); border:1px solid var(--border); border-radius:var(--radius); padding:16px 20px; display:flex; align-items:center; gap:14px; }
  .prog-wrap { flex:1; height:5px; background:var(--surface); border-radius:100px; overflow:hidden; }
  .prog-fill { height:100%; background:linear-gradient(90deg,var(--accent),var(--accent2)); border-radius:100px; transition:width .3s ease; }
  .prog-label { font-size:12px; color:var(--muted); white-space:nowrap; }

  /* CLIENTS */
  .clients-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:16px; }
  .client-item {
    background:var(--card); border:1px solid var(--border); border-radius:var(--radius);
    padding:20px; display:flex; gap:16px; align-items:flex-start;
    cursor:pointer; transition:all .2s; animation:cardIn .3s ease both;
  }
  .client-item:hover { border-color:rgba(232,255,71,.25); transform:translateY(-2px); }
  .avatar { width:46px; height:46px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:16px; font-weight:700; flex-shrink:0; color:#07070d; }
  .client-info { flex:1; min-width:0; }
  .client-name { font-size:16px; font-weight:600; color:var(--text); margin-bottom:4px; }
  .client-tags { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px; }
  .tag { font-size:10px; font-weight:600; letter-spacing:.8px; text-transform:uppercase; padding:2px 8px; border-radius:4px; background:rgba(255,255,255,.05); color:var(--muted); }
  .client-meta { font-size:12px; color:var(--muted); display:flex; gap:12px; }
  .new-client-btn { display:flex; align-items:center; justify-content:center; gap:8px; background:none; border:2px dashed var(--border); border-radius:var(--radius); padding:28px; cursor:pointer; color:var(--muted); font-family:'DM Sans',sans-serif; font-size:14px; font-weight:500; transition:all .2s; }
  .new-client-btn:hover { border-color:var(--accent); color:var(--accent); }

  /* CLIENT DETAIL MODAL */
  .client-modal { background:var(--card); border:1px solid var(--border); border-radius:18px; width:100%; max-width:600px; overflow:hidden; animation:slideUp .25s ease; max-height:85vh; display:flex; flex-direction:column; }
  .client-modal-header { padding:24px; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:16px; }
  .client-modal-body { padding:24px; overflow-y:auto; flex:1; }
  .scheda-chip { display:inline-flex; align-items:center; gap:8px; background:var(--card2); border:1px solid var(--border); border-radius:8px; padding:10px 14px; margin:6px 6px 0 0; font-size:13px; color:var(--text); }

  /* FORM MODAL */
  .form-modal { background:var(--card); border:1px solid var(--border); border-radius:18px; width:100%; max-width:480px; overflow:hidden; animation:slideUp .25s ease; }
  .form-modal-header { padding:22px 24px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; }
  .form-modal-body { padding:24px; display:flex; flex-direction:column; gap:16px; }
  .form-row { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  .form-actions { display:flex; gap:10px; justify-content:flex-end; padding:0 24px 24px; }

  /* CALENDAR */
  .cal-header { display:flex; align-items:center; gap:16px; margin-bottom:24px; }
  .cal-nav { background:none; border:1px solid var(--border); color:var(--text); width:36px; height:36px; border-radius:8px; cursor:pointer; font-size:16px; display:flex; align-items:center; justify-content:center; transition:all .2s; }
  .cal-nav:hover { border-color:var(--accent); color:var(--accent); }
  .cal-month { font-family:'Bebas Neue',sans-serif; font-size:28px; letter-spacing:2px; }
  .cal-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:2px; }
  .cal-day-label { text-align:center; font-size:11px; font-weight:600; letter-spacing:1px; text-transform:uppercase; color:var(--muted); padding:8px 0; }
  .cal-cell { background:var(--card); border:1px solid var(--border); border-radius:10px; min-height:90px; padding:8px; cursor:pointer; transition:all .15s; position:relative; }
  .cal-cell:hover { border-color:rgba(232,255,71,.3); }
  .cal-cell.today { border-color:var(--accent); }
  .cal-cell.other-month { opacity:.35; }
  .cal-num { font-size:13px; font-weight:600; color:var(--muted); margin-bottom:4px; }
  .cal-cell.today .cal-num { color:var(--accent); }
  .cal-event { font-size:10px; padding:2px 6px; border-radius:4px; margin-bottom:2px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .cal-event.allenamento { background:rgba(232,255,71,.15); color:var(--accent); }
  .cal-event.valutazione { background:rgba(71,255,232,.15); color:var(--accent2); }
  .cal-event.recupero    { background:rgba(255,71,163,.15); color:var(--accent3); }
  .cal-event.riunione    { background:rgba(232,255,71,.15); color:var(--accent); }
  .cal-event.call        { background:rgba(71,255,232,.15); color:var(--accent2); }
  .cal-event.visita      { background:rgba(255,159,71,.15); color:#ff9f47; }
  .cal-event.onboarding  { background:rgba(164,127,254,.15); color:#a47ffe; }
  .cal-add-btn { background:none; border:none; color:var(--muted); font-size:18px; cursor:pointer; opacity:0; transition:opacity .15s; line-height:1; }
  .cal-cell:hover .cal-add-btn { opacity:1; }

  /* ADMIN */
  .admin-banner { background:linear-gradient(135deg,rgba(232,255,71,.08),rgba(71,255,232,.04)); border:1px solid rgba(232,255,71,.15); border-radius:var(--radius); padding:20px 24px; margin-bottom:28px; display:flex; align-items:center; gap:16px; }
  .admin-badge { background:var(--accent); color:#07070d; font-size:11px; font-weight:700; letter-spacing:1px; padding:4px 10px; border-radius:100px; text-transform:uppercase; }
  .charts-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; margin-bottom:28px; }
  .chart-card { background:var(--card); border:1px solid var(--border); border-radius:var(--radius); padding:22px; }
  .chart-title { font-size:12px; font-weight:600; letter-spacing:1px; text-transform:uppercase; color:var(--muted); margin-bottom:16px; }
  .chart-area { height:120px; position:relative; }
  .pt-table { background:var(--card); border:1px solid var(--border); border-radius:var(--radius); overflow:hidden; }
  .pt-table-head { display:grid; grid-template-columns:2fr 1fr 1fr 1fr; padding:12px 20px; border-bottom:1px solid var(--border); font-size:11px; font-weight:600; letter-spacing:1px; text-transform:uppercase; color:var(--muted); }
  .pt-table-row { display:grid; grid-template-columns:2fr 1fr 1fr 1fr; padding:14px 20px; border-bottom:1px solid var(--border); align-items:center; font-size:14px; transition:background .15s; }
  .pt-table-row:last-child { border-bottom:none; }
  .pt-table-row:hover { background:rgba(255,255,255,.02); }
  .online-dot { width:7px; height:7px; border-radius:50%; background:#2ecc71; display:inline-block; margin-right:8px; }

  /* ── MOBILE NAV ── */
  .mobile-nav {
    display:none; position:fixed; bottom:0; left:0; right:0;
    background:var(--surface); border-top:1px solid var(--border);
    z-index:200; padding:6px 0 env(safe-area-inset-bottom, 8px);
  }
  .mobile-nav-inner { display:flex; align-items:stretch; }
  .mobile-nav-item {
    flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center;
    gap:3px; padding:6px 4px; cursor:pointer;
    color:var(--muted); font-size:9px; font-weight:600;
    letter-spacing:.4px; text-transform:uppercase;
    transition:color .15s; border:none; background:none;
    font-family:'DM Sans',sans-serif;
  }
  .mobile-nav-item.active { color:var(--accent); }
  .mobile-nav-item-icon { font-size:20px; line-height:1; }
  .mobile-nav-logout { color:var(--muted); }
  .mobile-nav-logout:hover { color:var(--danger); }

  @media(max-width:1100px) { .stats-grid,.quick-nav { grid-template-columns:1fr 1fr; } .charts-grid { grid-template-columns:1fr; } }
  @media(max-width:800px) {
    .sidebar { display:none; }
    .mobile-nav { display:flex; flex-direction:column; }
    .content { padding:20px 16px 88px; }
    .client-grid,.form-row { grid-template-columns:1fr; }
    .builder-top { grid-template-columns:1fr 1fr; }
    .builder-top>*:first-child { grid-column:1/-1; }
    .builder-top .add-btn { grid-column:1/-1; width:100%; }
    .scheda-head,.scheda-row { grid-template-columns:2fr 1fr 40px; }
    .scheda-head>*:nth-child(3),.scheda-head>*:nth-child(4),.scheda-row>*:nth-child(3),.scheda-row>*:nth-child(4) { display:none; }
    .summary-grid { grid-template-columns:1fr 1fr; }
    .cal-grid { gap:1px; }
    .cal-cell { min-height:60px; min-width:0; overflow:hidden; width:100%; box-sizing:border-box; }
    .pt-table-head,.pt-table-row { grid-template-columns:2fr 1fr 1fr; }
    .pt-table-head>*:last-child,.pt-table-row>*:last-child { display:none; }
  }
  @media(max-width:600px) {
    .welcome-name { font-size:32px; line-height:1.2; }
  }
`;

// ── DATA ──────────────────────────────────────────────────────────────────────
const ACCOUNTS = {
  "demo":   { password:"demo",   name:"Personal Trainer Demo", role:"trainer",
               theme:{ accent:"#e8ff47", accentFg:"#07070d", logo:["PT","Studio"] } },
  "fitpro": { password:"fitpro", name:"FitPro Training",       role:"trainer",
               theme:{ accent:"#a47ffe", accentFg:"#07070d", logo:["FitPro","Training"] } },
  "admin":  { password:"admin",  name:"Admin",                  role:"admin",
               theme:{ accent:"#e8ff47", accentFg:"#07070d", logo:["PT","Studio"] } },
};

function applyTheme(theme) {
  document.documentElement.style.setProperty("--accent", theme.accent);
  document.documentElement.style.setProperty("--accent-fg", theme.accentFg);
}
function resetTheme() {
  document.documentElement.style.setProperty("--accent", "#e8ff47");
  document.documentElement.style.setProperty("--accent-fg", "#07070d");
}

const CAT_COLORS    = { Braccia:"#e8ff47", Spalle:"#47ffe8", Schiena:"#ff9f47", Gambe:"#ff47a3" };
const CAT_COLORS_PDF= { Braccia:[130,160,0], Spalle:[0,140,120], Schiena:[170,95,0], Gambe:[170,0,95] };
const CATEGORIES    = ["Tutte","Braccia","Spalle","Schiena","Gambe"];
const DAYS          = ["A","B","C"];
const OBIETTIVI     = ["Ipertrofia","Dimagrimento","Forza","Resistenza","Tonificazione"];
const LIVELLI       = ["Principiante","Intermedio","Avanzato"];
const SESSION_TYPES = ["Allenamento","Valutazione","Recupero"];

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

const DEMO_CLIENTS = [
  { id:1, nome:"Luca",    cognome:"Ferrari",   obiettivo:"Ipertrofia",   livello:"Intermedio",   lastSeen:"3 giorni fa",  schede:2, color:"#e8ff47" },
  { id:2, nome:"Sofia",   cognome:"Martini",   obiettivo:"Dimagrimento", livello:"Principiante", lastSeen:"ieri",         schede:1, color:"#47ffe8" },
  { id:3, nome:"Marco",   cognome:"Bianchi",   obiettivo:"Forza",        livello:"Avanzato",     lastSeen:"oggi",         schede:3, color:"#ff9f47" },
  { id:4, nome:"Chiara",  cognome:"Esposito",  obiettivo:"Tonificazione",livello:"Intermedio",   lastSeen:"5 giorni fa",  schede:1, color:"#ff47a3" },
];

function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function addDays(base, n) {
  const d = new Date(base); d.setDate(d.getDate()+n); return d;
}

const today = new Date();
const DEMO_EVENTS = [
  { id:1, clientId:1, clientName:"Luca Ferrari",   date:fmtDate(addDays(today, 0)), time:"10:00", type:"Allenamento" },
  { id:2, clientId:3, clientName:"Marco Bianchi",  date:fmtDate(addDays(today, 2)), time:"09:00", type:"Valutazione" },
  { id:3, clientId:2, clientName:"Sofia Martini",  date:fmtDate(addDays(today, 4)), time:"11:30", type:"Allenamento" },
  { id:4, clientId:4, clientName:"Chiara Esposito",date:fmtDate(addDays(today,-2)), time:"17:00", type:"Recupero"    },
];

const ADMIN_PT = [
  { name:"Andrea Rossi",   lastLogin:"Oggi, 09:14",     clients:4, schede:7  },
  { name:"Giulia Moretti", lastLogin:"Ieri, 18:30",     clients:6, schede:12 },
  { name:"Paolo Crespi",   lastLogin:"3 giorni fa",     clients:2, schede:3  },
  { name:"Marta Savi",     lastLogin:"Oggi, 11:02",     clients:8, schede:15 },
  { name:"Lorenzo De Luca",lastLogin:"Una settimana fa",clients:1, schede:2  },
];

const ADMIN_SESSION_TYPES = ["Riunione","Call","Visita","Onboarding"];

const ADMIN_EVENTS = [
  { id:1, clientName:"Call con Andrea Rossi",    date:fmtDate(addDays(today, 0)), time:"10:00", type:"Call"       },
  { id:2, clientName:"Onboarding Giulia Moretti", date:fmtDate(addDays(today, 3)), time:"14:00", type:"Onboarding" },
  { id:3, clientName:"Visita Paolo Crespi",       date:fmtDate(addDays(today, 7)), time:"11:00", type:"Visita"     },
  { id:4, clientName:"Riunione Marta Savi",       date:fmtDate(addDays(today,-1)), time:"16:00", type:"Riunione"   },
];
const MONTHS_IT = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const DAYS_IT   = ["Lun","Mar","Mer","Gio","Ven","Sab","Dom"];

// ── HELPERS ───────────────────────────────────────────────────────────────────
function calcSummary(rows) {
  const totalSets = rows.reduce((s,r)=>s+r.sets,0);
  const estMin    = Math.round(rows.reduce((s,r)=>s+r.sets*(r.rest+40),0)/60);
  const cats      = [...new Set(rows.map(r=>r.cat))];
  return { totalSets, estMin, cats, count:rows.length };
}

const EX_IMAGES = {
  1:"curl-con-bilanciere", 2:"curl-con-manubri-alternati", 3:"tricep-pushdown-al-cavo",
  4:"skull-crushers", 5:"hammer-curl", 6:"lento-avanti-con-bilanciere",
  7:"alzate-laterali", 8:"facepull-al-cavo", 9:"arnold-press", 10:"alzate-frontali",
  11:"stacco-da-terra", 12:"trazioni-alla-sbarra", 13:"rematore-con-bilanciere",
  14:"lat-machine-presa-larga", 15:"seated-cable-row", 16:"squat-con-bilanciere",
  17:"leg-press-45", 18:"romanian-deadlift", 19:"leg-curl-sdraiato", 20:"calf-raises-in-piedi",
};

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

function getInitials(nome,cognome) { return `${nome?.[0]||""}${cognome?.[0]||""}`.toUpperCase(); }

// ── PDF ───────────────────────────────────────────────────────────────────────
function drawPH(doc,x,y,w,h) {
  doc.setFillColor(240,240,245); doc.roundedRect(x,y,w,h,2,2,"F");
  doc.setDrawColor(210,210,220); doc.setLineWidth(0.3); doc.roundedRect(x,y,w,h,2,2,"S");
  doc.setFontSize(7); doc.setTextColor(170,170,185); doc.text("nessuna immagine",x+w/2,y+h/2+1,{align:"center"});
}

async function buildPDF({nome,cognome,obiettivo,livello,giorni,onProgress}) {
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
  const fn=[nome,cognome].filter(Boolean).join("-")||"cliente";
  doc.save(`scheda-${fn}.pdf`);
}

// ── SVG CHARTS ────────────────────────────────────────────────────────────────
function LineChart({data,color="#e8ff47"}) {
  const W=300,H=100,pad=10;
  const max=Math.max(...data.map(d=>d.v),1);
  const pts=data.map((d,i)=>{ const x=pad+(i/(data.length-1))*(W-pad*2); const y=H-pad-(d.v/max)*(H-pad*2); return `${x},${y}`; });
  const area=`M${pts[0]} ${pts.slice(1).map(p=>`L${p}`).join(" ")} L${W-pad},${H-pad} L${pad},${H-pad} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"100%"}}>
      <defs>
        <linearGradient id="lg1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={area} fill="url(#lg1)"/>
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {data.map((d,i)=>{
        const x=pad+(i/(data.length-1))*(W-pad*2);
        const y=H-pad-(d.v/max)*(H-pad*2);
        return <g key={i}><circle cx={x} cy={y} r="3" fill={color}/><text x={x} y={H-1} textAnchor="middle" fill="#5a5a78" fontSize="8">{d.l}</text></g>;
      })}
    </svg>
  );
}

function BarChart({data,color="#47ffe8"}) {
  const W=300,H=100,pad=10;
  const max=Math.max(...data.map(d=>d.v),1);
  const bw=(W-pad*2)/data.length*0.6;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"100%"}}>
      {data.map((d,i)=>{
        const x=pad+(i/(data.length))*(W-pad*2)+(W-pad*2)/data.length*0.2;
        const bh=(d.v/max)*(H-pad*2);
        const y=H-pad-bh;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={bh} rx="3" fill={color} opacity="0.7"/>
            <text x={x+bw/2} y={H-1} textAnchor="middle" fill="#5a5a78" fontSize="8">{d.l}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── LOGIN SCREEN ──────────────────────────────────────────────────────────────
function LoginScreen({onLogin}) {
  const [user,setUser]=useState("");
  const [pass,setPass]=useState("");
  const [err,setErr]=useState("");
  const canvasRef=useRef(null);

  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return;
    const ctx=canvas.getContext("2d");
    let raf,W,H;
    const shapes=[];
    const resize=()=>{ W=canvas.width=canvas.offsetWidth; H=canvas.height=canvas.offsetHeight; };
    resize(); window.addEventListener("resize",resize);
    for(let i=0;i<18;i++) shapes.push({
      x:Math.random()*W, y:Math.random()*H,
      vx:(Math.random()-.5)*0.4, vy:(Math.random()-.5)*0.4,
      size:Math.random()*60+20, type:i%3,
      opacity:Math.random()*.12+.03,
      rot:Math.random()*Math.PI*2, rotV:(Math.random()-.5)*.005,
      color: i%3===0?"#e8ff47":i%3===1?"#47ffe8":"#ff47a3",
    });
    const draw=()=>{
      ctx.clearRect(0,0,W,H);
      shapes.forEach(s=>{
        s.x+=s.vx; s.y+=s.vy; s.rot+=s.rotV;
        if(s.x<-s.size) s.x=W+s.size; if(s.x>W+s.size) s.x=-s.size;
        if(s.y<-s.size) s.y=H+s.size; if(s.y>H+s.size) s.y=-s.size;
        ctx.save(); ctx.globalAlpha=s.opacity; ctx.strokeStyle=s.color; ctx.lineWidth=1.5;
        ctx.translate(s.x,s.y); ctx.rotate(s.rot); ctx.beginPath();
        if(s.type===0){ ctx.arc(0,0,s.size/2,0,Math.PI*2); }
        else if(s.type===1){ ctx.rect(-s.size/2,-s.size/2,s.size,s.size); }
        else { ctx.moveTo(0,-s.size/2); ctx.lineTo(s.size/2,s.size/2); ctx.lineTo(-s.size/2,s.size/2); ctx.closePath(); }
        ctx.stroke(); ctx.restore();
      });
      for(let i=0;i<shapes.length;i++) for(let j=i+1;j<shapes.length;j++){
        const dx=shapes[i].x-shapes[j].x, dy=shapes[i].y-shapes[j].y;
        const dist=Math.sqrt(dx*dx+dy*dy);
        if(dist<130){ ctx.save(); ctx.globalAlpha=(1-dist/130)*.06; ctx.strokeStyle="#e8ff47"; ctx.lineWidth=.5; ctx.beginPath(); ctx.moveTo(shapes[i].x,shapes[i].y); ctx.lineTo(shapes[j].x,shapes[j].y); ctx.stroke(); ctx.restore(); }
      }
      raf=requestAnimationFrame(draw);
    };
    draw();
    return ()=>{ cancelAnimationFrame(raf); window.removeEventListener("resize",resize); };
  },[]);

  const submit=()=>{
    const acc=ACCOUNTS[user.toLowerCase().trim()];
    if(!acc||acc.password!==pass){ setErr("Utente o password non corretti"); return; }
    onLogin({username:user.toLowerCase().trim(),...acc});
  };

  return (
    <div className="login-wrap">
      <canvas ref={canvasRef} className="login-canvas"/>
      <div style={{position:"relative",zIndex:1,width:"100%",maxWidth:420,display:"flex",flexDirection:"column",gap:12,padding:"0 16px"}}>
        <div style={{background:"rgba(15,15,24,.75)",border:"1px solid var(--border)",borderRadius:12,padding:"14px 18px",backdropFilter:"blur(10px)",animation:"boxIn .6s cubic-bezier(.16,1,.3,1)"}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",color:"var(--accent)",marginBottom:5}}>Demo — PT Studio</div>
          <div style={{fontSize:13,color:"var(--muted)",lineHeight:1.6}}>
            Una piattaforma per personal trainer — gestisci clienti, crea schede di allenamento personalizzate ed esportale in PDF. Accedi con le credenziali demo per esplorare tutte le funzionalità.
          </div>
        </div>
        <div className="login-box" style={{margin:0}}>
          <div className="login-logo"><span>PT</span>Studio</div>
          <div className="login-sub">Piattaforma per Personal Trainer</div>
          <div className="login-field">
            <label>Utente</label>
            <input className="login-input" type="text" placeholder="nome utente" value={user} onChange={e=>{setUser(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&submit()}/>
          </div>
          <div className="login-field">
            <label>Password</label>
            <input className="login-input" type="password" placeholder="••••••••" value={pass} onChange={e=>{setPass(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&submit()}/>
          </div>
          {err && <div className="login-err">{err}</div>}
          <button className="login-btn" onClick={submit}>Accedi</button>

          <div className="login-hint">
            <div className="login-hint-block">
              <div className="login-hint-label">💪 Per accedere alla Demo 1, inserisci:</div>
              <div className="login-hint-creds">
                <span className="login-hint-key">Utente:</span>
                <span className="hint-badge">demo</span>
                <span className="login-hint-key" style={{marginLeft:8}}>Password:</span>
                <span className="hint-badge">demo</span>
              </div>
            </div>
            <div className="login-hint-block" style={{borderColor:"rgba(164,127,254,.25)"}}>
              <div className="login-hint-label" style={{color:"#a47ffe"}}>🟣 Per accedere alla Demo 2 (FitPro), inserisci:</div>
              <div className="login-hint-creds">
                <span className="login-hint-key">Utente:</span>
                <span className="hint-badge">fitpro</span>
                <span className="login-hint-key" style={{marginLeft:8}}>Password:</span>
                <span className="hint-badge">fitpro</span>
              </div>
            </div>
            <div className="login-hint-block">
              <div className="login-hint-label">🛡️ Per accedere come Admin, inserisci:</div>
              <div className="login-hint-creds">
                <span className="login-hint-key">Utente:</span>
                <span className="hint-badge">admin</span>
                <span className="login-hint-key" style={{marginLeft:8}}>Password:</span>
                <span className="hint-badge">admin</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── WELCOME TRANSITION ────────────────────────────────────────────────────────
function WelcomeScreen({user,onDone}) {
  const [leaving,setLeaving]=useState(false);
  useEffect(()=>{ const t=setTimeout(()=>{ setLeaving(true); setTimeout(onDone,500); },2600); return()=>clearTimeout(t); },[]);
  return (
    <div className={`welcome-screen${leaving?" leaving":""}`}>
      <div className="welcome-text">
        <div className="welcome-ciao">Bentornato</div>
        <div className="welcome-name"><span>{user.name.split(" ")[0]}</span> {user.name.split(" ").slice(1).join(" ")}</div>
      </div>
      <div className="lifter-wrap">
        <svg className="lifter-svg" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="60" cy="28" r="10" stroke="var(--accent)" strokeWidth="2.5"/>
          <line x1="60" y1="38" x2="60" y2="72" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="60" y1="72" x2="48" y2="95" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="60" y1="72" x2="72" y2="95" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round"/>
          <g className="arm-l"><line x1="60" y1="50" x2="36" y2="62" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round"/></g>
          <g className="arm-r"><line x1="60" y1="50" x2="84" y2="62" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round"/></g>
          <g className="bar-group">
            <line x1="24" y1="60" x2="96" y2="60" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round"/>
            <rect x="18" y="54" width="8" height="12" rx="2" fill="var(--accent)" opacity="0.7"/>
            <rect x="94" y="54" width="8" height="12" rx="2" fill="var(--accent)" opacity="0.7"/>
          </g>
        </svg>
      </div>
      <div className="welcome-dots">
        <div className="welcome-dot"/>
        <div className="welcome-dot"/>
        <div className="welcome-dot"/>
      </div>
    </div>
  );
}

// ── SIDEBAR ───────────────────────────────────────────────────────────────────
const NAV_TRAINER = [
  { id:"dashboard", icon:"⚡", label:"Dashboard" },
  { id:"library",   icon:"📚", label:"Libreria"  },
  { id:"builder",   icon:"📋", label:"Builder"   },
  { id:"clients",   icon:"👥", label:"Clienti"   },
  { id:"calendar",  icon:"📅", label:"Calendario"},
];
const NAV_ADMIN = [
  { id:"dashboard",      icon:"⚡",  label:"Dashboard"    },
  { id:"admin-stats",    icon:"📊",  label:"Statistiche"  },
  { id:"admin-pt",       icon:"👥",  label:"I miei PT"    },
  { id:"admin-calendar", icon:"📅",  label:"Calendario"   },
];

function Sidebar({user,view,setView,onLogout}) {
  const items = user.role==="admin" ? NAV_ADMIN : NAV_TRAINER;
  const logo = user.theme?.logo || ["PT","Studio"];
  return (
    <div className="sidebar">
      <div className="sidebar-logo">{logo[0]}<span>{logo[1]}</span></div>
      <div className="sidebar-user">
        <div className="sidebar-username">{user.name}</div>
        <div className="sidebar-role">{user.role==="admin"?"Amministratore":"Personal Trainer"}</div>
      </div>
      <nav className="sidebar-nav">
        {items.map(item=>(
          <div key={item.id} className={`sidebar-item${view===item.id?" active":""}`} onClick={()=>setView(item.id)}>
            <span className="sidebar-icon">{item.icon}</span>{item.label}
          </div>
        ))}
      </nav>
      <button className="sidebar-logout" onClick={onLogout}>
        <span className="sidebar-icon">↩</span>Esci
      </button>
    </div>
  );
}

// ── MOBILE NAV ────────────────────────────────────────────────────────────────
function MobileNav({user,view,setView,onLogout}) {
  const items = user.role==="admin" ? NAV_ADMIN : NAV_TRAINER;
  return (
    <nav className="mobile-nav">
      <div className="mobile-nav-inner">
        {items.map(item=>(
          <button
            key={item.id}
            className={`mobile-nav-item${view===item.id?" active":""}`}
            onClick={()=>setView(item.id)}
          >
            <span className="mobile-nav-item-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
        <button className="mobile-nav-item mobile-nav-logout" onClick={onLogout}>
          <span className="mobile-nav-item-icon">↩</span>
          Esci
        </button>
      </div>
    </nav>
  );
}

// ── BACK BUTTON ───────────────────────────────────────────────────────────────
function BackBtn({setView}) {
  return (
    <button className="back-btn" onClick={()=>setView("dashboard")}>
      ← Dashboard
    </button>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function Dashboard({user,setView}) {
  const oggi=new Date().toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long"});

  if(user.role==="admin") {
    const adminStats=[
      {icon:"👥",val:String(ADMIN_PT.length),label:"PT attivi"},
      {icon:"📋",val:"39",                   label:"Schede totali create"},
      {icon:"🟢",val:"99.8%",                label:"Uptime sistema"},
      {icon:"✨",val:"2",                    label:"Nuovi PT questo mese"},
    ];
    const adminNav=[
      {id:"admin-stats",    icon:"📊",label:"Statistiche",  desc:"Grafici e metriche"},
      {id:"admin-pt",       icon:"👥",label:"I miei PT",    desc:"Gestisci i PT registrati"},
    ];
    return (
      <div>
        <div className="page-head">
          <div className="page-title">Pannello di Controllo 🛡️</div>
          <div className="page-sub" style={{textTransform:"capitalize"}}>{oggi}</div>
        </div>
        <div className="stats-grid">
          {adminStats.map((s,i)=>(
            <div className="stat-card" key={i} style={{animationDelay:`${i*.07}s`}}>
              <div className="stat-glow"/>
              <div className="stat-icon">{s.icon}</div>
              <div className="stat-val">{s.val}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{marginBottom:16}}><div className="page-sub" style={{fontSize:13,letterSpacing:1,textTransform:"uppercase",fontWeight:600}}>Vai a</div></div>
        <div className="quick-nav" style={{gridTemplateColumns:"1fr 1fr"}}>
          {adminNav.map((q,i)=>(
            <div className="quick-card" key={q.id} onClick={()=>setView(q.id)} style={{animationDelay:`${i*.07+.2}s`}}>
              <div className="quick-card-icon">{q.icon}</div>
              <div className="quick-card-label">{q.label}</div>
              <div className="quick-card-desc">{q.desc}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const stats=[
    {icon:"👥",val:"4",label:"Clienti attivi"},
    {icon:"📋",val:"6",label:"Schede create"},
    {icon:"📅",val:"Oggi 10:00",label:"Prossimo appuntamento"},
    {icon:"💪",val:"20",label:"Esercizi in libreria"},
  ];
  const quickNav=[
    {id:"library",  icon:"📚",label:"Libreria", desc:"Sfoglia 20 esercizi"},
    {id:"builder",  icon:"📋",label:"Builder",  desc:"Crea schede A/B/C"},
    {id:"clients",  icon:"👥",label:"Clienti",  desc:"Gestisci i tuoi clienti"},
    {id:"calendar", icon:"📅",label:"Calendario",desc:"Organizza gli appuntamenti"},
  ];
  return (
    <div>
      <div className="page-head">
        <div className="page-title">Ciao, {user.name.split(" ")[0]} 👋</div>
        <div className="page-sub" style={{textTransform:"capitalize"}}>{oggi}</div>
      </div>
      <div className="stats-grid">
        {stats.map((s,i)=>(
          <div className="stat-card" key={i} style={{animationDelay:`${i*.07}s`}}>
            <div className="stat-glow"/>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-val">{s.val}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{marginBottom:16}}><div className="page-sub" style={{fontSize:13,letterSpacing:1,textTransform:"uppercase",fontWeight:600}}>Vai a</div></div>
      <div className="quick-nav">
        {quickNav.map((q,i)=>(
          <div className="quick-card" key={q.id} onClick={()=>setView(q.id)} style={{animationDelay:`${i*.07+.2}s`}}>
            <div className="quick-card-icon">{q.icon}</div>
            <div className="quick-card-label">{q.label}</div>
            <div className="quick-card-desc">{q.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── LIBRARY ───────────────────────────────────────────────────────────────────
function VideoModal({ex,onClose}) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{ex.name}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-video">
          <iframe src={`https://www.youtube.com/embed/${ex.yt}?autoplay=1&rel=0`} allow="autoplay; encrypted-media" allowFullScreen title={ex.name}/>
        </div>
        <div className="modal-body">
          <div className="modal-muscles"><strong>Muscoli coinvolti:</strong> {ex.muscles}</div>
        </div>
      </div>
    </div>
  );
}

function ExCard({ex,onVideo}) {
  const cc=CAT_COLORS[ex.cat]||"#e8ff47";
  const [ok,setOk]=useState(true);
  const slug=EX_IMAGES[ex.id];
  return (
    <div className="ex-card">
      {ok&&slug
        ?<img className="ex-thumb" src={`/exercises-custom/${slug}.jpg`} alt={ex.name}
            style={{objectFit:"cover",objectPosition:"center top"}}
            onError={()=>setOk(false)}/>
        :<div className="ex-thumb-ph">💪</div>
      }
      <div className="ex-body">
        <span className="ex-cat" style={{color:cc,background:`${cc}16`}}>{ex.cat}</span>
        <div className="ex-name">{ex.name}</div>
        <div className="ex-muscles"><strong>Muscoli:</strong> {ex.muscles}</div>
        <button className="video-btn" onClick={()=>onVideo(ex)}>
          <span className="play-icon">▶</span>Guarda il video
        </button>
      </div>
    </div>
  );
}

function Library({setView}) {
  const [filter,setFilter]=useState("Tutte");
  const [search,setSearch]=useState("");
  const [modal,setModal]=useState(null);
  const list=EXERCISES.filter(e=>(filter==="Tutte"||e.cat===filter)&&(e.name.toLowerCase().includes(search.toLowerCase())||e.muscles.toLowerCase().includes(search.toLowerCase())));
  return (
    <div>
      <BackBtn setView={setView}/>
      <div className="page-head"><div className="page-title">Libreria Esercizi</div><div className="page-sub">{list.length} esercizi</div></div>
      <div className="library-controls">
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input className="search-input" type="text" placeholder="Cerca esercizio o muscolo…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <div className="filters">
          {CATEGORIES.map(c=><button key={c} className={`filter-btn${filter===c?" active":""}`} onClick={()=>setFilter(c)}>{c}</button>)}
        </div>
      </div>
      <div className="grid">
        {list.map(ex=><ExCard key={ex.id} ex={ex} onVideo={setModal}/>)}
      </div>
      {list.length===0&&<div style={{textAlign:"center",color:"var(--muted)",padding:"60px 0"}}>Nessun risultato per "{search}"</div>}
      {modal&&<VideoModal ex={modal} onClose={()=>setModal(null)}/>}
    </div>
  );
}

// ── BUILDER ───────────────────────────────────────────────────────────────────
const ALL_DAYS = ["A","B","C","D","E","F","G"];

function Builder({setView}) {
  const [nome,setNome]=useState(""); const [cognome,setCognome]=useState("");
  const [obiettivo,setObiettivo]=useState(""); const [livello,setLivello]=useState("");
  const [numDays,setNumDays]=useState(3);
  const [activeDay,setActiveDay]=useState("A");
  const [giorni,setGiorni]=useState({A:[],B:[],C:[],D:[],E:[],F:[],G:[]});
  const [selId,setSelId]=useState(EXERCISES[0].id);
  const [sets,setSets]=useState(3); const [reps,setReps]=useState(10); const [rest,setRest]=useState(90);
  const [pdfState,setPdfState]=useState(null);

  const activeDays=ALL_DAYS.slice(0,numDays);
  const scheda=giorni[activeDay]||[];

  const handleNumDays=(n)=>{
    const newDays=ALL_DAYS.slice(0,n);
    const removedDays=ALL_DAYS.slice(n,numDays);
    const hasContent=removedDays.some(d=>(giorni[d]||[]).length>0);
    if(hasContent){
      const names=removedDays.filter(d=>(giorni[d]||[]).length>0).map(d=>`Giorno ${d}`).join(", ");
      if(!window.confirm(`${names} contiene esercizi. Vuoi rimuoverlo?`)) return;
    }
    setNumDays(n);
    if(!newDays.includes(activeDay)) setActiveDay(newDays[newDays.length-1]);
  };

  const add=()=>{ const ex=EXERCISES.find(e=>e.id===Number(selId)); setGiorni(prev=>({...prev,[activeDay]:[...(prev[activeDay]||[]),{...ex,sets,reps,rest,uid:Date.now()}]})); };
  const del=(uid)=>setGiorni(prev=>({...prev,[activeDay]:(prev[activeDay]||[]).filter(r=>r.uid!==uid)}));
  const clear=()=>setGiorni(prev=>({...prev,[activeDay]:[]}));

  const activeGiorni=Object.fromEntries(activeDays.map(d=>[d,giorni[d]||[]]));
  const totalEx=Object.values(activeGiorni).reduce((s,d)=>s+d.length,0);
  const sum=calcSummary(scheda);

  const handlePDF=async()=>{
    if(!Object.values(activeGiorni).some(d=>d.length>0)) return;
    setPdfState({progress:0,label:"Preparazione…"});
    try{ await buildPDF({nome,cognome,obiettivo,livello,giorni:activeGiorni,onProgress:(p,l)=>setPdfState({progress:p,label:l})}); }
    catch(e){console.error(e);}
    finally{setPdfState(null);}
  };

  return (
    <div>
      <BackBtn setView={setView}/>
      <div className="page-head"><div className="page-title">Builder Scheda</div><div className="page-sub">{totalEx} esercizi totali</div></div>
      <div className="builder">
        <div className="client-card">
          <div className="card-section-title">Dati Cliente</div>
          <div className="client-grid">
            <label className="field-label">Nome<input className="field-input" type="text" placeholder="Marco" value={nome} onChange={e=>setNome(e.target.value)}/></label>
            <label className="field-label">Cognome<input className="field-input" type="text" placeholder="Rossi" value={cognome} onChange={e=>setCognome(e.target.value)}/></label>
            <label className="field-label">Obiettivo<select className="field-select" value={obiettivo} onChange={e=>setObiettivo(e.target.value)}><option value="">— seleziona —</option>{OBIETTIVI.map(o=><option key={o}>{o}</option>)}</select></label>
            <label className="field-label">Livello<select className="field-select" value={livello} onChange={e=>setLivello(e.target.value)}><option value="">— seleziona —</option>{LIVELLI.map(l=><option key={l}>{l}</option>)}</select></label>
          </div>
        </div>

        <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
          <label style={{display:"flex",alignItems:"center",gap:10,fontSize:13,color:"var(--muted)",fontWeight:600,letterSpacing:".5px",textTransform:"uppercase"}}>
            Giorni
            <select
              value={numDays}
              onChange={e=>handleNumDays(Number(e.target.value))}
              style={{background:"var(--card)",border:"1px solid var(--border)",color:"var(--text)",fontFamily:"'DM Sans',sans-serif",fontSize:14,padding:"6px 12px",borderRadius:8,outline:"none",width:"auto",appearance:"none",cursor:"pointer"}}
            >
              {[1,2,3,4,5,6,7].map(n=><option key={n} value={n}>{n} {n===1?"giorno":"giorni"}</option>)}
            </select>
          </label>

          <div className="day-tabs">
            {activeDays.map(d=>(
              <button key={d} className={`day-tab${activeDay===d?" active":""}`} onClick={()=>setActiveDay(d)}>
                Giorno {d}{(giorni[d]||[]).length>0&&<span style={{marginLeft:6,background:"rgba(0,0,0,.2)",borderRadius:"100px",padding:"1px 7px",fontSize:11}}>{(giorni[d]||[]).length}</span>}
              </button>
            ))}
          </div>
          <span style={{fontSize:13,color:"var(--muted)"}}>{scheda.length===0?"Giorno vuoto":`${scheda.length} esercizi`}</span>
        </div>

        <div className="builder-top">
          <label>Esercizio
            <select value={selId} onChange={e=>setSelId(e.target.value)}>
              {CATEGORIES.slice(1).map(cat=><optgroup key={cat} label={`── ${cat} ──`}>{EXERCISES.filter(e=>e.cat===cat).map(ex=><option key={ex.id} value={ex.id}>{ex.name}</option>)}</optgroup>)}
            </select>
          </label>
          <label>Serie<input type="number" min={1} max={20} value={sets} onChange={e=>setSets(Number(e.target.value))}/></label>
          <label>Rip.<input type="number" min={1} max={100} value={reps} onChange={e=>setReps(Number(e.target.value))}/></label>
          <label>Rec.(s)<input type="number" min={0} max={600} step={15} value={rest} onChange={e=>setRest(Number(e.target.value))}/></label>
          <button className="add-btn" onClick={add} style={{marginTop:22}}>+ Aggiungi</button>
        </div>

        <div className="scheda-wrap">
          {scheda.length===0?<div className="empty-state"><div className="empty-icon">📋</div><div>Giorno {activeDay} vuoto.<br/>Aggiungi il primo esercizio!</div></div>:(
            <><div className="scheda-head"><div>Esercizio</div><div>Serie × Rip.</div><div>Recupero</div><div>Muscoli</div><div/></div>
            {scheda.map(row=>{const cc=CAT_COLORS[row.cat]||"#e8ff47"; return(
              <div className="scheda-row" key={row.uid}>
                <div><span className="scheda-dot" style={{background:cc}}/>{row.name}</div>
                <div><span className="badge">{row.sets}</span>{" × "}<span className="badge">{row.reps}</span></div>
                <div><span className="badge badge2">{row.rest}s</span></div>
                <div style={{fontSize:12,color:"var(--muted)"}}>{row.muscles.split(",")[0]}…</div>
                <div><button className="del-btn" onClick={()=>del(row.uid)}>✕</button></div>
              </div>
            );})}</>
          )}
        </div>

        {scheda.length>0&&(
          <div className="summary-grid">
            <div className="summary-card"><div className="summary-label">Serie totali</div><div className="summary-val">{sum.totalSets}</div><div className="summary-sub">Giorno {activeDay}</div></div>
            <div className="summary-card"><div className="summary-label">Tempo stimato</div><div className="summary-val">{sum.estMin}</div><div className="summary-sub">minuti</div></div>
            <div className="summary-card"><div className="summary-label">Esercizi</div><div className="summary-val">{sum.count}</div><div className="summary-sub">Giorno {activeDay}</div></div>
            <div className="summary-card"><div className="summary-label">Gruppi</div><div className="summary-val" style={{fontSize:15,paddingTop:4,lineHeight:1.5}}>{sum.cats.join(", ")||"—"}</div></div>
          </div>
        )}

        {pdfState&&<div className="pdf-progress"><span style={{fontSize:18}}>⏳</span><div className="prog-wrap"><div className="prog-fill" style={{width:`${Math.round(pdfState.progress*100)}%`}}/></div><span className="prog-label">{pdfState.label}</span></div>}

        {totalEx>0&&!pdfState&&(
          <div className="actions-row">
            {scheda.length>0&&<button className="btn-ghost" onClick={clear}>Svuota Giorno {activeDay}</button>}
            <button className="btn-primary" onClick={handlePDF}>⬇ Esporta PDF completo</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── CLIENTS ───────────────────────────────────────────────────────────────────
function Clients({setView}) {
  const [clients,setClients]=useState(DEMO_CLIENTS);
  const [selected,setSelected]=useState(null);
  const [showForm,setShowForm]=useState(false);
  const [form,setForm]=useState({nome:"",cognome:"",obiettivo:"",livello:""});

  const COLORS=["#e8ff47","#47ffe8","#ff9f47","#ff47a3","#a47ffe","#47a3ff"];
  const addClient=()=>{
    if(!form.nome||!form.cognome) return;
    setClients(prev=>[...prev,{id:Date.now(),color:COLORS[prev.length%COLORS.length],lastSeen:"Adesso",schede:0,...form}]);
    setForm({nome:"",cognome:"",obiettivo:"",livello:""});
    setShowForm(false);
  };

  return (
    <div>
      <BackBtn setView={setView}/>
      <div className="page-head" style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
        <div><div className="page-title">Clienti</div><div className="page-sub">{clients.length} clienti attivi</div></div>
        <button className="btn-primary" onClick={()=>setShowForm(true)}>+ Nuovo cliente</button>
      </div>

      <div className="clients-grid">
        {clients.map(c=>(
          <div className="client-item" key={c.id} onClick={()=>setSelected(c)}>
            <div className="avatar" style={{background:c.color}}>{getInitials(c.nome,c.cognome)}</div>
            <div className="client-info">
              <div className="client-name">{c.nome} {c.cognome}</div>
              <div className="client-tags">
                {c.obiettivo&&<span className="tag">{c.obiettivo}</span>}
                {c.livello&&<span className="tag">{c.livello}</span>}
              </div>
              <div className="client-meta">
                <span>🕐 {c.lastSeen}</span>
                <span>📋 {c.schede} schede</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selected&&(
        <div className="overlay" onClick={()=>setSelected(null)}>
          <div className="client-modal" onClick={e=>e.stopPropagation()}>
            <div className="client-modal-header">
              <div className="avatar" style={{background:selected.color,width:52,height:52,fontSize:18}}>{getInitials(selected.nome,selected.cognome)}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:20,fontWeight:700}}>{selected.nome} {selected.cognome}</div>
                <div style={{fontSize:13,color:"var(--muted)",marginTop:2}}>{selected.obiettivo} · {selected.livello}</div>
              </div>
              <button className="modal-close" onClick={()=>setSelected(null)}>✕</button>
            </div>
            <div className="client-modal-body">
              <div style={{fontSize:12,fontWeight:600,letterSpacing:1,textTransform:"uppercase",color:"var(--muted)",marginBottom:12}}>Schede assegnate</div>
              {selected.schede>0?(
                Array.from({length:selected.schede},(_,i)=>(
                  <span key={i} className="scheda-chip">📋 Scheda {i+1} — Giorno {DAYS[i%3]}</span>
                ))
              ):<div style={{color:"var(--muted)",fontSize:14}}>Nessuna scheda assegnata ancora.</div>}
              <div style={{marginTop:24,padding:"16px",background:"var(--card2)",borderRadius:10,border:"1px solid var(--border)"}}>
                <div style={{fontSize:12,fontWeight:600,letterSpacing:1,textTransform:"uppercase",color:"var(--muted)",marginBottom:8}}>Statistiche</div>
                <div style={{display:"flex",gap:24,fontSize:14}}>
                  <div><span style={{color:"var(--muted)"}}>Ultimo accesso: </span><strong>{selected.lastSeen}</strong></div>
                  <div><span style={{color:"var(--muted)"}}>Schede: </span><strong style={{color:"var(--accent)"}}>{selected.schede}</strong></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm&&(
        <div className="overlay" onClick={()=>setShowForm(false)}>
          <div className="form-modal" onClick={e=>e.stopPropagation()}>
            <div className="form-modal-header">
              <div className="modal-title">Nuovo Cliente</div>
              <button className="modal-close" onClick={()=>setShowForm(false)}>✕</button>
            </div>
            <div className="form-modal-body">
              <div className="form-row">
                <label className="field-label">Nome<input className="field-input" type="text" placeholder="Marco" value={form.nome} onChange={e=>setForm(p=>({...p,nome:e.target.value}))}/></label>
                <label className="field-label">Cognome<input className="field-input" type="text" placeholder="Rossi" value={form.cognome} onChange={e=>setForm(p=>({...p,cognome:e.target.value}))}/></label>
              </div>
              <label className="field-label">Obiettivo<select className="field-select" value={form.obiettivo} onChange={e=>setForm(p=>({...p,obiettivo:e.target.value}))}><option value="">— seleziona —</option>{OBIETTIVI.map(o=><option key={o}>{o}</option>)}</select></label>
              <label className="field-label">Livello<select className="field-select" value={form.livello} onChange={e=>setForm(p=>({...p,livello:e.target.value}))}><option value="">— seleziona —</option>{LIVELLI.map(l=><option key={l}>{l}</option>)}</select></label>
            </div>
            <div className="form-actions">
              <button className="btn-ghost" onClick={()=>setShowForm(false)}>Annulla</button>
              <button className="btn-primary" onClick={addClient}>Aggiungi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── CALENDAR ──────────────────────────────────────────────────────────────────
function CalendarView({setView}) {
  const now=new Date();
  const [year,setYear]=useState(now.getFullYear());
  const [month,setMonth]=useState(now.getMonth());
  const [events,setEvents]=useState(DEMO_EVENTS);
  const [showForm,setShowForm]=useState(null);
  const [deleteEv,setDeleteEv]=useState(null);
  const [form,setForm]=useState({clientName:"",time:"10:00",type:"Allenamento"});

  const prevM=()=>{ if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); };
  const nextM=()=>{ if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); };

  const firstDay=new Date(year,month,1).getDay();
  const offset=(firstDay===0?6:firstDay-1);
  const daysInMonth=new Date(year,month+1,0).getDate();
  const cells=[];
  for(let i=0;i<offset;i++) cells.push({day:null,date:null});
  for(let d=1;d<=daysInMonth;d++){
    const date=`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    cells.push({day:d,date});
  }

  const todayStr=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;

  const addEvent=()=>{
    if(!form.clientName) return;
    setEvents(prev=>[...prev,{id:Date.now(),clientName:form.clientName,date:showForm,time:form.time,type:form.type}]);
    setShowForm(null); setForm({clientName:"",time:"10:00",type:"Allenamento"});
  };
  const confirmDelete=()=>{ setEvents(prev=>prev.filter(e=>e.id!==deleteEv.id)); setDeleteEv(null); };

  return (
    <div>
      <BackBtn setView={setView}/>
      <div className="page-head">
        <div className="cal-header">
          <button className="cal-nav" onClick={prevM}>‹</button>
          <div className="cal-month">{MONTHS_IT[month]} {year}</div>
          <button className="cal-nav" onClick={nextM}>›</button>
        </div>
      </div>

      <div className="cal-grid">
        {DAYS_IT.map(d=><div key={d} className="cal-day-label">{d}</div>)}
        {cells.map((cell,i)=>{
          if(!cell.date) return <div key={`e${i}`}/>;
          const dayEvents=events.filter(e=>e.date===cell.date);
          const isToday=cell.date===todayStr;
          return (
            <div key={cell.date} className={`cal-cell${isToday?" today":""}${cell.day?"":" other-month"}`}>
              <div className="cal-num">{cell.day}</div>
              {dayEvents.map(ev=>(
                <div key={ev.id} className={`cal-event ${ev.type.toLowerCase()}`} onClick={e=>{e.stopPropagation();setDeleteEv(ev);}} style={{cursor:"pointer"}}>{ev.time} {ev.clientName.split(" ")[0]}</div>
              ))}
              <button className="cal-add-btn" onClick={()=>setShowForm(cell.date)}>+</button>
            </div>
          );
        })}
      </div>

      {showForm&&(
        <div className="overlay" onClick={()=>setShowForm(null)}>
          <div className="form-modal" onClick={e=>e.stopPropagation()}>
            <div className="form-modal-header">
              <div className="modal-title">Nuovo Appuntamento</div>
              <button className="modal-close" onClick={()=>setShowForm(null)}>✕</button>
            </div>
            <div className="form-modal-body">
              <div style={{fontSize:13,color:"var(--muted)",background:"var(--card2)",padding:"10px 14px",borderRadius:8}}>
                📅 {new Date(showForm+"T12:00").toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long"})}
              </div>
              <label className="field-label">Cliente<input className="field-input" type="text" placeholder="Nome cliente" value={form.clientName} onChange={e=>setForm(p=>({...p,clientName:e.target.value}))}/></label>
              <div className="form-row">
                <label className="field-label">Orario<input className="field-input" type="time" value={form.time} onChange={e=>setForm(p=>({...p,time:e.target.value}))}/></label>
                <label className="field-label">Tipo<select className="field-select" value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))}>{SESSION_TYPES.map(t=><option key={t}>{t}</option>)}</select></label>
              </div>
            </div>
            <div className="form-actions">
              <button className="btn-ghost" onClick={()=>setShowForm(null)}>Annulla</button>
              <button className="btn-primary" onClick={addEvent}>Salva</button>
            </div>
          </div>
        </div>
      )}

      {deleteEv&&(
        <div className="overlay" onClick={()=>setDeleteEv(null)}>
          <div className="form-modal" onClick={e=>e.stopPropagation()}>
            <div className="form-modal-header">
              <div className="modal-title">Elimina Appuntamento</div>
              <button className="modal-close" onClick={()=>setDeleteEv(null)}>✕</button>
            </div>
            <div className="form-modal-body">
              <div style={{fontSize:14,color:"var(--text)",lineHeight:1.6}}>
                <strong>{deleteEv.clientName}</strong><br/>
                <span style={{color:"var(--muted)",fontSize:13}}>📅 {new Date(deleteEv.date+"T12:00").toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long"})} · {deleteEv.time}</span>
              </div>
              <div style={{fontSize:13,color:"var(--muted)"}}>Vuoi eliminare questo appuntamento? L'azione non può essere annullata.</div>
            </div>
            <div className="form-actions">
              <button className="btn-ghost" onClick={()=>setDeleteEv(null)}>Annulla</button>
              <button style={{background:"var(--danger)",border:"none",color:"#fff",fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:700,padding:"10px 22px",borderRadius:9,cursor:"pointer"}} onClick={confirmDelete}>Elimina</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ADMIN STATS ───────────────────────────────────────────────────────────────
function AdminStats({setView}) {
  const lineData=[{l:"Gen",v:1},{l:"Feb",v:2},{l:"Mar",v:2},{l:"Apr",v:3},{l:"Mag",v:4},{l:"Giu",v:5}];
  const barData=[{l:"Lun",v:3},{l:"Mar",v:7},{l:"Mer",v:5},{l:"Gio",v:9},{l:"Ven",v:6},{l:"Sab",v:2},{l:"Dom",v:1}];
  const actData=[{l:"28",v:2},{l:"29",v:4},{l:"30",v:3},{l:"31",v:5},{l:"1",v:4},{l:"2",v:3},{l:"3",v:5}];
  const sysCards=[
    {label:"Uptime",    val:"99.8%",      icon:"🟢", sub:"ultimi 30 giorni"},
    {label:"Versione",  val:"v1.2.0",      icon:"📦", sub:"ultimo deploy 2gg fa"},
    {label:"Ambiente",  val:"Production",  icon:"🚀", sub:"Vercel — EU West"},
    {label:"PT attivi", val:String(ADMIN_PT.length), icon:"👥", sub:"questo mese"},
  ];
  return (
    <div>
      <BackBtn setView={setView}/>
      <div className="page-head"><div className="page-title">Statistiche</div><div className="page-sub">Metriche e andamento della piattaforma</div></div>
      <div className="admin-banner">
        <span className="admin-badge">Admin</span>
        <div><div style={{fontSize:15,fontWeight:600}}>Stato sistema</div><div style={{fontSize:13,color:"var(--muted)",marginTop:2}}>Dati simulati — aggiornati in tempo reale</div></div>
      </div>
      <div className="stats-grid" style={{marginBottom:28}}>
        {sysCards.map((c,i)=>(
          <div className="stat-card" key={i} style={{animationDelay:`${i*.06}s`}}>
            <div className="stat-glow"/>
            <div className="stat-icon">{c.icon}</div>
            <div className="stat-val" style={{fontSize:24}}>{c.val}</div>
            <div className="stat-label">{c.label}</div>
            <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>{c.sub}</div>
          </div>
        ))}
      </div>
      <div className="charts-grid">
        <div className="chart-card"><div className="chart-title">PT Registrati — ultimi 6 mesi</div><div className="chart-area"><LineChart data={lineData} color="#e8ff47"/></div></div>
        <div className="chart-card"><div className="chart-title">Schede create — questa settimana</div><div className="chart-area"><BarChart data={barData} color="#47ffe8"/></div></div>
        <div className="chart-card"><div className="chart-title">Login giornalieri — ultimi 7 giorni</div><div className="chart-area"><BarChart data={actData} color="#ff47a3"/></div></div>
      </div>
    </div>
  );
}

// ── ADMIN PT ──────────────────────────────────────────────────────────────────
function AdminPT({setView}) {
  const topExercises=[
    {name:"Squat con bilanciere", uses:47, cat:"Gambe"  },
    {name:"Stacco da terra",      uses:38, cat:"Schiena"},
    {name:"Curl con bilanciere",  uses:34, cat:"Braccia"},
    {name:"Alzate laterali",      uses:29, cat:"Spalle" },
    {name:"Trazioni alla sbarra", uses:26, cat:"Schiena"},
  ];
  const maxUses=topExercises[0].uses;
  const feed=[
    {pt:"Andrea Rossi",   action:"ha creato una nuova scheda",  time:"2 min fa",    icon:"📋"},
    {pt:"Marta Savi",     action:"ha aggiunto un nuovo cliente", time:"18 min fa",   icon:"👤"},
    {pt:"Giulia Moretti", action:"ha esportato un PDF",          time:"1 ora fa",    icon:"📄"},
    {pt:"Andrea Rossi",   action:"ha effettuato l'accesso",      time:"2 ore fa",    icon:"🔑"},
    {pt:"Paolo Crespi",   action:"ha creato una nuova scheda",   time:"ieri, 18:30", icon:"📋"},
    {pt:"Lorenzo De Luca",action:"ha aggiunto un nuovo cliente", time:"ieri, 15:10", icon:"👤"},
  ];
  return (
    <div>
      <BackBtn setView={setView}/>
      <div className="page-head"><div className="page-title">I miei PT</div><div className="page-sub">Personal trainer registrati sulla piattaforma</div></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:20}}>
        <div className="chart-card">
          <div className="chart-title">Top 5 Esercizi più usati</div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {topExercises.map((ex,i)=>{
              const cc=CAT_COLORS[ex.cat]||"#e8ff47";
              const pct=Math.round((ex.uses/maxUses)*100);
              return (
                <div key={i}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                    <span style={{fontSize:13,color:"var(--text)",fontWeight:500}}>{ex.name}</span>
                    <span style={{fontSize:12,color:"var(--muted)"}}>{ex.uses} schede</span>
                  </div>
                  <div style={{height:5,background:"var(--border)",borderRadius:100,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${pct}%`,background:cc,borderRadius:100,transition:"width .6s ease"}}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="chart-card">
          <div className="chart-title">Attività recente</div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {feed.map((f,i)=>(
              <div key={i} style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                <div style={{width:32,height:32,borderRadius:8,background:"var(--card2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>{f.icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,color:"var(--text)",lineHeight:1.4}}><strong style={{color:"var(--accent)"}}>{f.pt}</strong> {f.action}</div>
                  <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>{f.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="pt-table">
        <div className="pt-table-head" style={{gridTemplateColumns:"2fr 1fr 1fr"}}>
          <div>Personal Trainer</div><div>Ultimo accesso</div><div>Schede create</div>
        </div>
        {ADMIN_PT.map((pt,i)=>(
          <div className="pt-table-row" key={i} style={{gridTemplateColumns:"2fr 1fr 1fr"}}>
            <div style={{fontWeight:600}}>{i<2&&<span className="online-dot"/>}{pt.name}</div>
            <div style={{color:"var(--muted)",fontSize:13}}>{pt.lastLogin}</div>
            <div><span className="badge badge2">{pt.schede}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── ADMIN CALENDAR ────────────────────────────────────────────────────────────
function AdminCalendar({setView}) {
  const now=new Date();
  const [year,setYear]=useState(now.getFullYear());
  const [month,setMonth]=useState(now.getMonth());
  const [events,setEvents]=useState(ADMIN_EVENTS);
  const [showForm,setShowForm]=useState(null);
  const [deleteEv,setDeleteEv]=useState(null);
  const [form,setForm]=useState({clientName:"",time:"10:00",type:"Call"});
  const prevM=()=>{ if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); };
  const nextM=()=>{ if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); };
  const firstDay=new Date(year,month,1).getDay();
  const offset=(firstDay===0?6:firstDay-1);
  const daysInMonth=new Date(year,month+1,0).getDate();
  const cells=[];
  for(let i=0;i<offset;i++) cells.push({day:null,date:null});
  for(let d=1;d<=daysInMonth;d++){
    const date=`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    cells.push({day:d,date});
  }
  const todayStr=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  const addEvent=()=>{
    if(!form.clientName) return;
    setEvents(prev=>[...prev,{id:Date.now(),clientName:form.clientName,date:showForm,time:form.time,type:form.type}]);
    setShowForm(null); setForm({clientName:"",time:"10:00",type:"Call"});
  };
  const confirmDelete=()=>{ setEvents(prev=>prev.filter(e=>e.id!==deleteEv.id)); setDeleteEv(null); };
  return (
    <div>
      <BackBtn setView={setView}/>
      <div className="page-head">
        <div className="cal-header">
          <button className="cal-nav" onClick={prevM}>‹</button>
          <div className="cal-month">{MONTHS_IT[month]} {year}</div>
          <button className="cal-nav" onClick={nextM}>›</button>
        </div>
        <div className="page-sub">I tuoi appuntamenti con i PT</div>
      </div>
      <div className="cal-grid">
        {DAYS_IT.map(d=><div key={d} className="cal-day-label">{d}</div>)}
        {cells.map((cell,i)=>{
          if(!cell.date) return <div key={`e${i}`}/>;
          const dayEvents=events.filter(e=>e.date===cell.date);
          const isToday=cell.date===todayStr;
          return (
            <div key={cell.date} className={`cal-cell${isToday?" today":""}`}>
              <div className="cal-num">{cell.day}</div>
              {dayEvents.map(ev=>(
                <div key={ev.id} className={`cal-event ${ev.type.toLowerCase()}`} onClick={e=>{e.stopPropagation();setDeleteEv(ev);}} style={{cursor:"pointer"}}>{ev.time} {ev.clientName.split(" ").slice(-1)[0]}</div>
              ))}
              <button className="cal-add-btn" onClick={()=>setShowForm(cell.date)}>+</button>
            </div>
          );
        })}
      </div>
      {showForm&&(
        <div className="overlay" onClick={()=>setShowForm(null)}>
          <div className="form-modal" onClick={e=>e.stopPropagation()}>
            <div className="form-modal-header">
              <div className="modal-title">Nuovo Appuntamento</div>
              <button className="modal-close" onClick={()=>setShowForm(null)}>✕</button>
            </div>
            <div className="form-modal-body">
              <div style={{fontSize:13,color:"var(--muted)",background:"var(--card2)",padding:"10px 14px",borderRadius:8}}>
                📅 {new Date(showForm+"T12:00").toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long"})}
              </div>
              <label className="field-label">PT / Contatto<input className="field-input" type="text" placeholder="es. Andrea Rossi" value={form.clientName} onChange={e=>setForm(p=>({...p,clientName:e.target.value}))}/></label>
              <div className="form-row">
                <label className="field-label">Orario<input className="field-input" type="time" value={form.time} onChange={e=>setForm(p=>({...p,time:e.target.value}))}/></label>
                <label className="field-label">Tipo<select className="field-select" value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))}>{ADMIN_SESSION_TYPES.map(t=><option key={t}>{t}</option>)}</select></label>
              </div>
            </div>
            <div className="form-actions">
              <button className="btn-ghost" onClick={()=>setShowForm(null)}>Annulla</button>
              <button className="btn-primary" onClick={addEvent}>Salva</button>
            </div>
          </div>
        </div>
      )}
      {deleteEv&&(
        <div className="overlay" onClick={()=>setDeleteEv(null)}>
          <div className="form-modal" onClick={e=>e.stopPropagation()}>
            <div className="form-modal-header">
              <div className="modal-title">Elimina Appuntamento</div>
              <button className="modal-close" onClick={()=>setDeleteEv(null)}>✕</button>
            </div>
            <div className="form-modal-body">
              <div style={{fontSize:14,color:"var(--text)",lineHeight:1.6}}>
                <strong>{deleteEv.clientName}</strong><br/>
                <span style={{color:"var(--muted)",fontSize:13}}>📅 {new Date(deleteEv.date+"T12:00").toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long"})} · {deleteEv.time}</span>
              </div>
              <div style={{fontSize:13,color:"var(--muted)"}}>Vuoi eliminare questo appuntamento? L'azione non può essere annullata.</div>
            </div>
            <div className="form-actions">
              <button className="btn-ghost" onClick={()=>setDeleteEv(null)}>Annulla</button>
              <button style={{background:"var(--danger)",border:"none",color:"#fff",fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:700,padding:"10px 22px",borderRadius:9,cursor:"pointer"}} onClick={confirmDelete}>Elimina</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── APP ROOT ──────────────────────────────────────────────────────────────────
export default function App() {
  const [phase,setPhase]=useState("login");
  const [user,setUser]=useState(null);
  const [view,setView]=useState("dashboard");

  useEffect(()=>{ if(window.location.pathname==="/admin"&&user?.role==="admin") setView("admin"); },[user]);

  const handleLogin=(acc)=>{
    if(acc.theme) applyTheme(acc.theme);
    setUser(acc);
    setPhase("welcome");
    if(acc.role==="admin") setView("dashboard");
  };
  const handleWelcomeDone=()=>{ setPhase("app"); };
  const handleLogout=()=>{ resetTheme(); setUser(null); setPhase("login"); setView("dashboard"); };

  return (
    <>
      <style>{FONTS+CSS}</style>
      {phase==="login"&&<LoginScreen onLogin={handleLogin}/>}
      {phase==="welcome"&&<WelcomeScreen user={user} onDone={handleWelcomeDone}/>}
      {phase==="app"&&(
        <div className="app-wrap">
          <Sidebar user={user} view={view} setView={setView} onLogout={handleLogout}/>
          <div className="content">
            {view==="dashboard"&&<Dashboard user={user} setView={setView}/>}
            {view==="library"&&user?.role!=="admin"&&<Library setView={setView}/>}
            {view==="builder"&&user?.role!=="admin"&&<Builder setView={setView}/>}
            {view==="clients"&&user?.role!=="admin"&&<Clients setView={setView}/>}
            {view==="calendar"&&user?.role!=="admin"&&<CalendarView setView={setView}/>}
            {view==="admin-stats"&&user?.role==="admin"&&<AdminStats setView={setView}/>}
            {view==="admin-pt"&&user?.role==="admin"&&<AdminPT setView={setView}/>}
            {view==="admin-calendar"&&user?.role==="admin"&&<AdminCalendar setView={setView}/>}
          </div>
          <MobileNav user={user} view={view} setView={setView} onLogout={handleLogout}/>
        </div>
      )}
    </>
  );
}
