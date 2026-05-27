import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
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

  /* login hint */
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
  /* details/summary per altri accessi */
  .login-details {
    border:1px solid var(--border); border-radius:10px;
    background:var(--card2); overflow:hidden;
  }
  .login-details summary {
    font-size:11px; font-weight:700; letter-spacing:1px; text-transform:uppercase;
    color:var(--muted); padding:11px 14px; cursor:pointer; list-style:none;
    user-select:none; transition:color .15s;
  }
  .login-details summary::-webkit-details-marker { display:none; }
  .login-details summary:hover { color:var(--text); }
  .login-details[open] summary { border-bottom:1px solid var(--border); }
  .login-details-inner { display:flex; flex-direction:column; gap:8px; padding:10px; }

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

  /* ATLETI */
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

  /* ATLETA DETAIL MODAL */
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
  .cal-header { display:flex; align-items:center; gap:16px; }
  .cal-nav { background:none; border:1px solid var(--border); color:var(--text); width:36px; height:36px; border-radius:8px; cursor:pointer; font-size:16px; display:flex; align-items:center; justify-content:center; transition:all .2s; }
  .cal-nav:hover { border-color:var(--accent); color:var(--accent); }
  .cal-month { font-family:'Bebas Neue',sans-serif; font-size:24px; letter-spacing:2px; }
  .cal-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:2px; }
  .cal-day-label { text-align:center; font-size:11px; font-weight:600; letter-spacing:1px; text-transform:uppercase; color:var(--muted); padding:8px 0; }

  /* view toggle */
  .cal-view-toggle { display:flex; gap:3px; background:var(--card); border:1px solid var(--border); border-radius:10px; padding:3px; width:fit-content; }
  .cal-view-btn { background:none; border:none; color:var(--muted); font-family:'DM Sans',sans-serif; font-size:13px; font-weight:600; padding:7px 18px; border-radius:8px; cursor:pointer; transition:all .18s; }
  .cal-view-btn.active { background:var(--accent); color:#07070d; }

  /* monthly cells */
  .cal-cell-month { background:var(--card); border:1px solid var(--border); border-radius:10px; height:80px; padding:8px; cursor:pointer; transition:all .15s; position:relative; display:flex; flex-direction:column; overflow:hidden; min-width:0; box-sizing:border-box; width:100%; }
  .cal-cell-month:hover { border-color:rgba(232,255,71,.3); }
  .cal-cell-month.today { border-color:var(--accent); }
  .cal-cell-month.other-month { opacity:.35; }
  .cal-num { font-size:13px; font-weight:600; color:var(--muted); margin-bottom:4px; }
  .cal-cell-month.today .cal-num { color:var(--accent); }
  .cal-event-badge { display:flex; align-items:center; gap:4px; margin-top:2px; }
  .cal-event-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
  .cal-event-count { font-size:11px; font-weight:700; color:var(--text); }
  .cal-day-bar { height:2px; border-radius:1px; margin-top:auto; }
  .cal-add-btn { background:none; border:none; color:var(--muted); font-size:16px; cursor:pointer; opacity:0; transition:opacity .15s; line-height:1; position:absolute; top:6px; right:6px; }
  .cal-cell-month:hover .cal-add-btn { opacity:1; }

  /* event type colors (shared) */
  .cal-event { font-size:10px; padding:2px 5px; border-radius:4px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .cal-event.allenamento,.cal-event.riunione { background:rgba(232,255,71,.15); color:var(--accent); }
  .cal-event.valutazione,.cal-event.call     { background:rgba(71,255,232,.15); color:var(--accent2); }
  .cal-event.recupero                        { background:rgba(255,71,163,.15); color:var(--accent3); }
  .cal-event.visita                          { background:rgba(255,159,71,.15); color:#ff9f47; }
  .cal-event.onboarding                      { background:rgba(164,127,254,.15); color:#a47ffe; }

  /* weekly view */
  .cal-week-wrap { overflow-x:auto; border:1px solid var(--border); border-radius:var(--radius); }
  .cal-week-grid { display:grid; grid-template-columns:44px repeat(7,1fr); min-width:560px; }
  .cal-week-head-empty { border-bottom:1px solid var(--border); border-right:1px solid var(--border); }
  .cal-week-header { font-size:11px; font-weight:600; text-transform:uppercase; color:var(--muted); padding:10px 4px; text-align:center; border-bottom:1px solid var(--border); border-right:1px solid var(--border); letter-spacing:.5px; line-height:1.5; }
  .cal-week-header.today-col { color:var(--accent); }
  .cal-hour-label { font-size:10px; color:var(--muted); padding:4px 6px 0; height:48px; border-right:1px solid var(--border); border-bottom:1px solid rgba(34,34,58,.4); box-sizing:border-box; }
  .cal-week-cell { height:48px; border-bottom:1px solid rgba(34,34,58,.4); border-right:1px solid rgba(34,34,58,.3); padding:2px 3px; box-sizing:border-box; overflow:hidden; }
  .cal-week-cell.today-col { background:rgba(232,255,71,.025); }
  .cal-week-event { font-size:10px; padding:2px 5px; border-radius:4px; font-weight:500; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; cursor:pointer; width:100%; display:block; margin-bottom:1px; }

  /* day modal */
  .day-modal { background:var(--card); border:1px solid var(--border); border-radius:18px; width:100%; max-width:460px; overflow:hidden; animation:slideUp .25s ease; max-height:80vh; display:flex; flex-direction:column; }
  .day-modal-header { padding:20px 24px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; flex-shrink:0; }
  .day-modal-body { padding:16px 24px; overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:8px; }
  .day-modal-footer { padding:12px 24px 20px; border-top:1px solid var(--border); flex-shrink:0; }
  .day-event-row { display:flex; align-items:center; gap:8px; padding:10px 12px; background:var(--card2); border:1px solid var(--border); border-radius:10px; }
  .day-event-time { font-size:12px; font-weight:700; color:var(--accent); width:38px; flex-shrink:0; }
  .day-event-name { flex:1; font-size:13px; font-weight:500; color:var(--text); min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .day-event-type-badge { font-size:9px; font-weight:700; letter-spacing:.8px; text-transform:uppercase; padding:2px 7px; border-radius:4px; flex-shrink:0; }
  .day-event-actions { display:flex; gap:2px; flex-shrink:0; }
  .day-event-btn { background:none; border:none; cursor:pointer; color:var(--muted); font-size:13px; padding:4px 5px; border-radius:4px; transition:color .15s; }
  .day-event-btn:hover { color:var(--text); }
  .day-delete-confirm { background:rgba(255,71,87,.06); border:1px solid rgba(255,71,87,.2); border-radius:8px; padding:10px 12px; display:flex; align-items:center; justify-content:space-between; gap:8px; }
  .btn-danger { background:var(--danger); border:none; color:#fff; font-family:'DM Sans',sans-serif; font-size:12px; font-weight:700; padding:6px 14px; border-radius:8px; cursor:pointer; transition:opacity .2s; }
  .btn-danger:hover { opacity:.85; }

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

  /* ── ATLETA LAYOUT ── */
  .cliente-header {
    position:sticky; top:0; z-index:100;
    background:var(--surface); border-bottom:1px solid var(--border);
    display:flex; align-items:center; justify-content:space-between;
    padding:14px 20px;
  }
  .cliente-body { max-width:600px; margin:0 auto; padding:28px 16px 60px; }
  .scheda-info-card { background:var(--card); border:1px solid var(--border); border-radius:var(--radius); padding:20px 24px; margin-bottom:24px; }
  .scheda-info-title { font-family:'Bebas Neue',sans-serif; font-size:26px; letter-spacing:2px; margin-bottom:4px; }
  .scheda-info-meta { display:flex; gap:12px; flex-wrap:wrap; font-size:12px; color:var(--muted); }
  /* ── ATLETA EXERCISE CARD ── */
  .ex-atleta-card {
    background:var(--card); border:1px solid var(--border); border-radius:var(--radius);
    overflow:hidden; margin-bottom:12px; transition:border-color .2s;
  }
  .ex-atleta-card:hover { border-color:rgba(232,255,71,.2); }
  .ex-atleta-thumb { width:100%; height:160px; object-fit:cover; object-position:center top; display:block; }
  .ex-atleta-thumb-ph { width:100%; height:80px; background:var(--surface); display:flex; align-items:center; justify-content:center; font-size:32px; color:var(--muted); }
  .ex-atleta-body { padding:14px 16px; }
  .ex-atleta-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; gap:8px; }
  .ex-cliente-name { font-size:15px; font-weight:600; color:var(--text); margin-bottom:3px; }
  .ex-cliente-meta { font-size:12px; color:var(--muted); }
  .ex-peso-wrap { display:flex; align-items:center; gap:6px; flex-shrink:0; }
  .ex-peso-input { background:var(--surface); border:1px solid var(--border); color:var(--text); font-family:'DM Sans',sans-serif; font-size:15px; font-weight:600; width:70px; padding:8px 10px; border-radius:9px; outline:none; text-align:center; transition:border-color .2s; }
  .ex-peso-input:focus { border-color:var(--accent); }
  .ex-peso-unit { font-size:12px; color:var(--muted); font-weight:600; }
  .save-session-btn { width:100%; background:var(--accent); border:none; color:var(--accent-fg); font-family:'DM Sans',sans-serif; font-size:15px; font-weight:700; padding:16px; border-radius:12px; cursor:pointer; transition:opacity .2s; margin-top:8px; }
  .save-session-btn:hover { opacity:.88; }
  .session-saved-banner { background:rgba(71,255,232,.08); border:1px solid rgba(71,255,232,.2); border-radius:10px; padding:12px 16px; font-size:13px; color:var(--accent2); text-align:center; margin-bottom:16px; }

  /* ── DATE NAV ── */
  .date-nav { display:flex; align-items:center; justify-content:space-between; background:var(--card); border:1px solid var(--border); border-radius:10px; padding:8px 14px; margin-bottom:16px; gap:8px; }
  .date-nav-btn { background:none; border:none; color:var(--text); font-size:20px; cursor:pointer; padding:2px 10px; border-radius:6px; transition:all .15s; line-height:1; font-family:'DM Sans',sans-serif; }
  .date-nav-btn:hover:not(:disabled) { background:rgba(232,255,71,.08); color:var(--accent); }
  .date-nav-btn:disabled { color:var(--muted); cursor:default; opacity:.4; }
  .date-nav-label { flex:1; font-size:13px; font-weight:600; color:var(--text); text-align:center; text-transform:capitalize; }
  .date-nav.past { border-color:rgba(71,255,232,.25); background:rgba(71,255,232,.04); }

  /* ── APPOINTMENTS (atleta) ── */
  .appt-section { background:var(--card); border:1px solid var(--border); border-radius:var(--radius); padding:18px 20px; margin-bottom:20px; }
  .appt-section-title { font-size:11px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:var(--muted); margin-bottom:12px; }
  .appt-card { display:flex; align-items:center; gap:10px; padding:10px 12px; background:var(--card2); border:1px solid var(--border); border-radius:10px; margin-bottom:7px; animation:cardIn .25s ease; }
  .appt-card:last-child { margin-bottom:0; }
  .appt-time { font-size:12px; font-weight:700; color:var(--accent); width:38px; flex-shrink:0; }
  .appt-date-label { font-size:11px; font-weight:600; color:var(--muted); min-width:90px; flex-shrink:0; text-transform:capitalize; }
  .appt-name { flex:1; font-size:13px; color:var(--text); font-weight:500; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .appt-type-badge { font-size:9px; font-weight:700; letter-spacing:.8px; text-transform:uppercase; padding:2px 7px; border-radius:4px; flex-shrink:0; }
  .appt-expand-btn { background:none; border:none; color:var(--accent); font-size:12px; font-weight:600; cursor:pointer; padding:8px 0 0; font-family:'DM Sans',sans-serif; display:block; }
  .appt-expand-btn:hover { opacity:.75; }

  /* ── MISURAZIONI ── */
  .misure-entry { display:flex; align-items:center; gap:8px; flex-wrap:wrap; padding:10px 14px; background:var(--card2); border:1px solid var(--border); border-radius:10px; margin-bottom:7px; }
  .misura-badge { font-size:12px; font-weight:600; color:var(--text); background:var(--card); border:1px solid var(--border); padding:3px 9px; border-radius:6px; }
  .misure-date { font-size:11px; color:var(--muted); font-weight:600; min-width:70px; }
  .misure-avanzati { display:flex; flex-direction:column; gap:10px; margin-top:8px; padding:12px; background:var(--card2); border:1px solid var(--border); border-radius:10px; }

  /* ── PROFILO GRID ── */
  .profilo-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px; }
  .profilo-cell { background:var(--card2); border:1px solid var(--border); border-radius:9px; padding:10px 14px; }
  .profilo-cell-label { font-size:10px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:var(--muted); margin-bottom:4px; }
  .profilo-cell-val { font-size:14px; font-weight:600; color:var(--text); line-height:1.4; }

  /* ── MOBILE NAV ── */
  .mobile-nav {
    display:none; position:fixed; bottom:0; left:0; right:0;
    background:var(--surface); border-top:1px solid var(--border);
    z-index:200; padding-bottom:env(safe-area-inset-bottom, 0px);
    flex-direction:column;
  }
  .mobile-nav-logout-bar {
    display:flex; align-items:center; justify-content:flex-end;
    padding:5px 16px; border-bottom:1px solid var(--border);
    background:var(--surface);
  }
  .mobile-nav-logout-btn {
    background:none; border:none; cursor:pointer;
    color:var(--muted); font-family:'DM Sans',sans-serif;
    font-size:11px; font-weight:600; letter-spacing:.5px;
    display:flex; align-items:center; gap:5px;
    padding:4px 10px; border-radius:6px;
    transition:color .15s, background .15s;
  }
  .mobile-nav-logout-btn:hover { color:var(--danger); background:rgba(255,71,87,.06); }
  .mobile-nav-inner { display:flex; align-items:stretch; padding:6px 0; }
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

  .atleta-tab-nav { display:flex; justify-content:center; gap:4px; padding:8px 16px; background:var(--surface); border-bottom:1px solid var(--border); }
  .atleta-tab { background:none; border:1px solid transparent; color:var(--muted); font-family:'DM Sans',sans-serif; font-size:13px; font-weight:600; padding:7px 18px; border-radius:9px; cursor:pointer; transition:all .15s; }
  .atleta-tab:hover { color:var(--text); }
  .atleta-tab.active { background:rgba(232,255,71,.08); border-color:rgba(232,255,71,.2); color:var(--accent); }

  /* ── STATS BAR ATLETA ── */
  .atleta-stats-bar { display:flex; gap:16px; flex-wrap:wrap; padding:7px 16px; background:var(--surface); border-bottom:1px solid var(--border); font-size:12px; color:var(--muted); }
  .atleta-stats-item { display:flex; align-items:center; gap:4px; white-space:nowrap; }
  .atleta-stats-item strong { color:var(--text); font-weight:700; }

  /* ── RESET DEMO DIALOG ── */
  .reset-overlay { position:fixed; inset:0; background:rgba(0,0,0,.75); backdrop-filter:blur(8px); z-index:2000; display:flex; align-items:center; justify-content:center; padding:24px; animation:fadeIn .15s ease; }
  .reset-dialog { background:var(--card); border:1px solid rgba(255,71,87,.3); border-radius:16px; padding:28px; width:100%; max-width:360px; animation:slideUp .2s ease; }
  .reset-dialog-title { font-size:16px; font-weight:700; color:var(--text); margin-bottom:8px; }
  .reset-dialog-body { font-size:13px; color:var(--muted); line-height:1.6; margin-bottom:22px; }
  .reset-dialog-actions { display:flex; gap:10px; justify-content:flex-end; }

  /* ── OVERWRITE CONFIRM (Builder) ── */
  .overwrite-confirm { background:rgba(255,71,87,.06); border:1px solid rgba(255,71,87,.25); border-radius:10px; padding:14px 18px; margin-bottom:12px; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
  .overwrite-confirm-text { font-size:13px; color:var(--text); flex:1; min-width:160px; }
  .overwrite-confirm-actions { display:flex; gap:8px; flex-shrink:0; }

  /* ── PROGRESSI ── */
  .prog-section { padding:0 0 24px; }
  .prog-section-head { font-size:11px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:var(--muted); margin-bottom:10px; }
  .prog-chips { display:flex; flex-wrap:wrap; gap:7px; margin-bottom:16px; }
  .prog-chip { background:var(--card2); border:1px solid var(--border); color:var(--muted); font-family:'DM Sans',sans-serif; font-size:12px; font-weight:600; padding:6px 12px; border-radius:100px; cursor:pointer; transition:all .2s; display:flex; align-items:center; gap:4px; }
  .prog-chip.unlocked { cursor:pointer; }
  .prog-chip.unlocked:hover { border-color:var(--accent); color:var(--accent); }
  .prog-chip.locked { opacity:.5; cursor:default; }
  .prog-chip.selected { }
  .prog-lock-msg { font-size:11px; color:var(--muted); background:var(--card2); border:1px solid var(--border); border-radius:8px; padding:6px 10px; margin-top:4px; margin-bottom:4px; max-width:280px; line-height:1.4; }
  .prog-legend { display:flex; flex-wrap:wrap; gap:10px; margin-bottom:10px; }
  .prog-legend-item { display:flex; align-items:center; gap:5px; font-size:11px; color:var(--muted); }
  .prog-chart-box { border:1px solid var(--border); border-radius:var(--radius); background:var(--card); padding:12px 8px 6px; overflow:hidden; }
  .prog-empty { text-align:center; color:var(--muted); padding:36px 0; font-size:14px; }
  .prog-empty-icon { font-size:36px; margin-bottom:8px; }
  @media(max-width:800px) {
    .sidebar { display:none; }
    .mobile-nav { display:flex; }
    .content { padding:20px 16px 88px; }
    .client-grid,.form-row { grid-template-columns:1fr; }
    .builder-top { grid-template-columns:1fr 1fr; }
    .builder-top>*:first-child { grid-column:1/-1; }
    .builder-top .add-btn { grid-column:1/-1; width:100%; }
    .scheda-head,.scheda-row { grid-template-columns:2fr 1fr 40px; }
    .scheda-head>*:nth-child(3),.scheda-head>*:nth-child(4),.scheda-row>*:nth-child(3),.scheda-row>*:nth-child(4) { display:none; }
    .summary-grid { grid-template-columns:1fr 1fr; }
    .cal-grid { gap:1px; }
    .cal-cell-month { height:60px; min-width:0; overflow:hidden; width:100%; box-sizing:border-box; }
    .pt-table-head,.pt-table-row { grid-template-columns:2fr 1fr 1fr; }
    .pt-table-head>*:last-child,.pt-table-row>*:last-child { display:none; }
  }
  @media(max-width:600px) {
    .welcome-name { font-size:32px; line-height:1.2; }
  }
`;

// ── DATA ──────────────────────────────────────────────────────────────────────
const ACCOUNTS = {
  "pt":       { password:"pt",       name:"Personal Trainer Demo",      role:"trainer",
                 theme:{ accent:"#e8ff47", accentFg:"#07070d", logo:["PT","Studio"] } },
  "pt_pro":   { password:"pt_pro",   name:"FitExpress — Personal Trainer", role:"trainer",
                 theme:{
                   accent:"#FFD600", accentFg:"#0a0a00", logo:["FitExpress","Pro"],
                   bg:"#080800", surface:"#0f0f00", card:"#141400", card2:"#1a1a00",
                   border:"#2a2a00", accent2:"#ff9900", accent3:"#ff4400",
                 } },
  "admin":    { password:"admin",    name:"Admin",                         role:"admin",
                 theme:{ accent:"#e8ff47", accentFg:"#07070d", logo:["PT","Studio"] } },
  "atleta":   { password:"atleta",   name:"Atleta Demo",                   role:"atleta",
                 theme:{ accent:"#e8ff47", accentFg:"#07070d", logo:["PT","Studio"] } },
};

const THEME_DEFAULTS = {
  "--accent":   "#e8ff47",
  "--accent-fg":"#07070d",
  "--bg":       "#07070d",
  "--surface":  "#0f0f18",
  "--card":     "#13131e",
  "--card2":    "#1a1a28",
  "--border":   "#22223a",
  "--accent2":  "#47ffe8",
  "--accent3":  "#ff47a3",
};
const THEME_MAP = {
  accent:"--accent", accentFg:"--accent-fg",
  bg:"--bg", surface:"--surface", card:"--card", card2:"--card2",
  border:"--border", accent2:"--accent2", accent3:"--accent3",
};
function applyTheme(theme) {
  Object.entries(THEME_MAP).forEach(([key, cssVar])=>{
    if(theme[key]) document.documentElement.style.setProperty(cssVar, theme[key]);
  });
}
function resetTheme() {
  Object.entries(THEME_DEFAULTS).forEach(([cssVar, val])=>{
    document.documentElement.style.setProperty(cssVar, val);
  });
}

const CAT_COLORS    = { Braccia:"#e8ff47", Spalle:"#47ffe8", Schiena:"#ff9f47", Gambe:"#ff47a3" };
const LINE_COLORS   = ["#e8ff47","#47ffe8","#ff47a3","#ff9f47","#a47ffe","#47a3ff","#ff4757","#2ecc71"];
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

const DEMO_ATLETI = [
  { id:0, nome:"Atleta", cognome:"Demo",    obiettivo:"Ipertrofia",   livello:"Intermedio",   lastSeen:"oggi",         schede:1, color:"#47ffe8", isDemoAtleta:true, hasAccount:true },
  { id:1, nome:"Luca",   cognome:"Ferrari",  obiettivo:"Ipertrofia",   livello:"Intermedio",   lastSeen:"3 giorni fa",  schede:2, color:"#e8ff47" },
  { id:2, nome:"Sofia",  cognome:"Martini",  obiettivo:"Dimagrimento", livello:"Principiante", lastSeen:"ieri",         schede:1, color:"#47ffe8" },
  { id:3, nome:"Marco",  cognome:"Bianchi",  obiettivo:"Forza",        livello:"Avanzato",     lastSeen:"oggi",         schede:3, color:"#ff9f47" },
  { id:4, nome:"Chiara", cognome:"Esposito", obiettivo:"Tonificazione",livello:"Intermedio",   lastSeen:"5 giorni fa",  schede:1, color:"#ff47a3" },
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

// ── DATI PRE-CARICATI ATLETI FINTI ───────────────────────────────────────────
// Hardcodati nel componente, mai scritti in localStorage.
// Formato identico a pt_sessions_demo_atleta: {date, day, weights:{[exId]:string}}
// Luca (id:1) e Marco (id:3): 5 sessioni, pesi crescenti
// Sofia (id:2) e Chiara (id:4): 2 sessioni (sotto soglia grafici)

const FAKE_EX_IDS = {
  1: [1, 3, 7, 16, 12],   // Luca: curl bilanciere, tricep pushdown, alzate lat, squat, trazioni
  3: [11, 16, 13, 6],     // Marco: stacco, squat, rematore, lento avanti
  2: [20, 7, 17],         // Sofia: calf raises, alzate lat, leg press
  4: [19, 7, 2],          // Chiara: leg curl, alzate lat, curl manubri
};

const FAKE_SESSIONS = {
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

// Helper: restituisce gli EXERCISES corrispondenti agli ID fake di un atleta
function getFakeExercises(atletaId) {
  return (FAKE_EX_IDS[atletaId]||[]).map(id=>EXERCISES.find(e=>e.id===id)).filter(Boolean);
}

// Helper: dato un array di sessioni, restituisce i conteggi di sessioni con peso>0 per ogni exId
function countSessionsPerEx(sessions) {
  const counts = {};
  sessions.forEach(s=>{
    Object.entries(s.weights||{}).forEach(([id,v])=>{
      if(+v>0) counts[id]=(counts[id]||0)+1;
    });
  });
  return counts; // {[exId]: count}
}

const ADMIN_PT = [
  { name:"Andrea Rossi",   lastLogin:"Oggi, 09:14",     clients:4, schede:7  },
  { name:"Giulia Moretti", lastLogin:"Ieri, 18:30",     clients:6, schede:12 },
  { name:"Paolo Crespi",   lastLogin:"3 giorni fa",     clients:2, schede:3  },
  { name:"Marta Savi",     lastLogin:"Oggi, 11:02",     clients:8, schede:15 },
  { name:"Lorenzo De Luca",lastLogin:"Una settimana fa",clients:1, schede:2  },
];

const ADMIN_SESSION_TYPES = ["Riunione","Call","Visita","Onboarding"];

const ADMIN_EVENTS = [
  { id:1, clientName:"Call con Andrea Rossi",     date:fmtDate(addDays(today, 0)), time:"10:00", type:"Call"       },
  { id:2, clientName:"Onboarding Giulia Moretti", date:fmtDate(addDays(today, 3)), time:"14:00", type:"Onboarding" },
  { id:3, clientName:"Visita Paolo Crespi",        date:fmtDate(addDays(today, 7)), time:"11:00", type:"Visita"     },
  { id:4, clientName:"Riunione Marta Savi",        date:fmtDate(addDays(today,-1)), time:"16:00", type:"Riunione"   },
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
  const fn=[nome,cognome].filter(Boolean).join("-")||"atleta";
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

// ── PROGRESSI MULTI-LINE CHART ────────────────────────────────────────────────
// lines = [{id, name, color, points:[{date:"YYYY-MM-DD", kg:number}]}]
// SVG puro, nessuna libreria esterna.
function ProgressiMultiChart({lines}) {
  const W=560,H=190,padL=38,padR=14,padT=10,padB=26;
  const cW=W-padL-padR, cH=H-padT-padB;

  const allDates=[...new Set(lines.flatMap(l=>l.points.map(p=>p.date)))].sort();
  const n=allDates.length;
  if(n===0) return null;

  const allKg=lines.flatMap(l=>l.points.map(p=>p.kg)).filter(k=>k>0);
  if(!allKg.length) return null;

  const rawMin=Math.min(...allKg), rawMax=Math.max(...allKg);
  const pad=Math.max((rawMax-rawMin)*0.15, 5);
  const minV=Math.max(0,Math.floor(rawMin-pad));
  const maxV=Math.ceil(rawMax+pad);
  const range=maxV-minV||1;

  const xOf=(i)=>padL+(n>1?i/(n-1):0.5)*cW;
  const yOf=(kg)=>padT+cH-((kg-minV)/range)*cH;

  // 4 grid lines
  const gridVals=Array.from({length:4},(_,i)=>Math.round(minV+(i/3)*range));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"auto",display:"block"}}>
      {/* grid */}
      {gridVals.map((v,i)=>(
        <g key={i}>
          <line x1={padL} y1={yOf(v)} x2={W-padR} y2={yOf(v)} stroke="#22223a" strokeWidth="1" strokeDasharray="5,4"/>
          <text x={padL-4} y={yOf(v)+4} textAnchor="end" fill="#5a5a78" fontSize="10">{v}</text>
        </g>
      ))}
      {/* x labels */}
      {allDates.map((d,i)=>(
        <text key={i} x={xOf(i)} y={H-5} textAnchor="middle" fill="#5a5a78" fontSize="9">
          {d.slice(8)}/{d.slice(5,7)}
        </text>
      ))}
      {/* lines + dots */}
      {lines.map(line=>{
        const pts=allDates
          .map((d,i)=>{const p=line.points.find(p=>p.date===d);return p?{i,kg:p.kg}:null;})
          .filter(Boolean);
        if(pts.length<1) return null;
        const ptStr=pts.map(p=>`${xOf(p.i)},${yOf(p.kg)}`).join(" ");
        return (
          <g key={line.id}>
            {pts.length>1&&<polyline points={ptStr} fill="none" stroke={line.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>}
            {pts.map((p,j)=>(
              <circle key={j} cx={xOf(p.i)} cy={yOf(p.kg)} r="4" fill={line.color} stroke="#07070d" strokeWidth="1.5"/>
            ))}
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
            Una piattaforma per personal trainer — gestisci atleti, crea schede di allenamento personalizzate ed esportale in PDF. Accedi con le credenziali demo per esplorare tutte le funzionalità.
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
            {/* Blocco PT Demo — sempre visibile */}
            <div className="login-hint-block">
              <div className="login-hint-label">💪 Per accedere alla Demo 1, inserisci:</div>
              <div className="login-hint-creds">
                <span className="login-hint-key">Utente:</span>
                <span className="hint-badge">pt</span>
                <span className="login-hint-key" style={{marginLeft:8}}>Password:</span>
                <span className="hint-badge">pt</span>
              </div>
            </div>

            {/* Altri accessi — nascosti in details */}
            <details className="login-details">
              <summary>Altri accessi demo ▾</summary>
              <div className="login-details-inner">
                <div className="login-hint-block" style={{borderColor:"rgba(164,127,254,.25)"}}>
                  <div className="login-hint-label" style={{color:"#a47ffe"}}>🟣 Per accedere alla Demo 2 (FitPro), inserisci:</div>
                  <div className="login-hint-creds">
                    <span className="login-hint-key">Utente:</span>
                    <span className="hint-badge">pt_pro</span>
                    <span className="login-hint-key" style={{marginLeft:8}}>Password:</span>
                    <span className="hint-badge">pt_pro</span>
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
                <div className="login-hint-block" style={{borderColor:"rgba(71,255,232,.25)"}}>
                  <div className="login-hint-label" style={{color:"var(--accent2)"}}>👤 Per accedere come Atleta Demo, inserisci:</div>
                  <div className="login-hint-creds">
                    <span className="login-hint-key">Utente:</span>
                    <span className="hint-badge">atleta</span>
                    <span className="login-hint-key" style={{marginLeft:8}}>Password:</span>
                    <span className="hint-badge">atleta</span>
                  </div>
                </div>
              </div>
            </details>
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

// ── RESET DEMO DIALOG ────────────────────────────────────────────────────────
// Renderizzato via createPortal su document.body — sempre sopra tutto il layout
function ResetDemoDialog({onClose}) {
  const doReset = () => {
    Object.keys(localStorage)
      .filter(k => k.startsWith("pt_"))
      .forEach(k => localStorage.removeItem(k));
    window.location.reload();
  };
  return ReactDOM.createPortal(
    <div className="reset-overlay" onClick={onClose}>
      <div className="reset-dialog" onClick={e=>e.stopPropagation()}>
        <div className="reset-dialog-title">⚠️ Reset demo</div>
        <div className="reset-dialog-body">
          Tutti i dati verranno cancellati (schede, sessioni, atleti, calendario). Continuare?
        </div>
        <div className="reset-dialog-actions">
          <button className="btn-ghost" onClick={onClose}>Annulla</button>
          <button className="btn-danger" onClick={doReset}>Reset</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── SIDEBAR ───────────────────────────────────────────────────────────────────
const NAV_TRAINER = [
  { id:"dashboard", icon:"⚡", label:"Dashboard" },
  { id:"library",   icon:"📚", label:"Libreria"  },
  { id:"builder",   icon:"📋", label:"Builder"   },
  { id:"atleti",    icon:"👥", label:"Atleti"    },
  { id:"calendar",  icon:"📅", label:"Calendario"},
];
const NAV_ADMIN = [
  { id:"dashboard",      icon:"⚡",  label:"Dashboard"    },
  { id:"admin-stats",    icon:"📊",  label:"Statistiche"  },
  { id:"admin-pt",       icon:"👥",  label:"I miei PT"    },
  { id:"admin-calendar", icon:"📅",  label:"Calendario"   },
];

function Sidebar({user,view,setView,onLogout}) {
  const [showReset, setShowReset] = useState(false);
  const logoLastClick = useRef(0);

  const handleLogoClick = () => {
    const now = Date.now();
    if(now - logoLastClick.current <= 400) setShowReset(true);
    logoLastClick.current = now;
  };

  const items = user.role==="admin" ? NAV_ADMIN : NAV_TRAINER;
  const logo = user.theme?.logo || ["PT","Studio"];
  return (
    <div className="sidebar">
      <div className="sidebar-logo" onClick={handleLogoClick} style={{cursor:"default",userSelect:"none"}}>{logo[0]}<span>{logo[1]}</span></div>
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
      {showReset&&<ResetDemoDialog onClose={()=>setShowReset(false)}/>}
    </div>
  );
}

// ── MOBILE NAV ────────────────────────────────────────────────────────────────
function MobileNav({user,view,setView,onLogout}) {
  const items = user.role==="admin" ? NAV_ADMIN : NAV_TRAINER;
  return (
    <nav className="mobile-nav">
      {/* Barra logout separata, sopra la nav — piccola, difficile da cliccare accidentalmente */}
      <div className="mobile-nav-logout-bar">
        <button className="mobile-nav-logout-btn" onClick={onLogout}>
          ↩ Esci
        </button>
      </div>
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
    {icon:"👥",val:"4",label:"Atleti attivi"},
    {icon:"📋",val:"6",label:"Schede create"},
    {icon:"📅",val:"Oggi 10:00",label:"Prossimo appuntamento"},
    {icon:"💪",val:"20",label:"Esercizi in libreria"},
  ];
  const quickNav=[
    {id:"library", icon:"📚",label:"Libreria",  desc:"Sfoglia 20 esercizi"},
    {id:"builder", icon:"📋",label:"Builder",   desc:"Crea schede A/B/C"},
    {id:"atleti",  icon:"👥",label:"Atleti",    desc:"Gestisci i tuoi atleti"},
    {id:"calendar",icon:"📅",label:"Calendario",desc:"Organizza gli appuntamenti"},
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

function Builder({setView, preload=null, setPreload=null}) {
  const [selectedAtleta,setSelectedAtleta]=useState(null);
  const [searchQ,setSearchQ]=useState("");
  const [showDrop,setShowDrop]=useState(false);
  const [obiettivo,setObiettivo]=useState("");
  const [livello,setLivello]=useState("");
  const [numDays,setNumDays]=useState(3);
  const [activeDay,setActiveDay]=useState("A");
  const [giorni,setGiorni]=useState({A:[],B:[],C:[],D:[],E:[],F:[],G:[]});
  const [dayNames,setDayNames]=useState({A:"",B:"",C:"",D:"",E:"",F:"",G:""});
  const [selId,setSelId]=useState(EXERCISES[0].id);
  const [sets,setSets]=useState(3); const [reps,setReps]=useState(10); const [rest,setRest]=useState(90);
  const [pdfState,setPdfState]=useState(null);
  const [toast,setToast]=useState(null);
  const [assigned,setAssigned]=useState(false);
  const [showOverwriteConfirm,setShowOverwriteConfirm]=useState(false);

  const allAtleti = loadAtleti();

  // ── Preload scheda esistente (da "Modifica nel Builder") ──
  useEffect(()=>{
    if(!preload) return;
    // Trova atleta in lista
    const atleta = allAtleti.find(a=>a.id===preload.atletaId)||null;
    if(atleta) {
      setSelectedAtleta(atleta);
      setSearchQ(`${atleta.nome} ${atleta.cognome}`);
    } else if(preload.nome||preload.cognome) {
      setSearchQ(`${preload.nome} ${preload.cognome}`.trim());
    }
    if(preload.obiettivo) setObiettivo(preload.obiettivo);
    if(preload.livello) setLivello(preload.livello);
    // Ripristina giorni con uid freschi per ogni esercizio
    const giorniKeys = Object.keys(preload.giorni||{});
    const numD = giorniKeys.length||3;
    setNumDays(numD);
    if(giorniKeys.length>0) setActiveDay(giorniKeys[0]);
    const newGiorni={A:[],B:[],C:[],D:[],E:[],F:[],G:[]};
    giorniKeys.forEach(d=>{
      newGiorni[d]=(preload.giorni[d]||[]).map((ex,idx)=>({...ex,uid:Date.now()+idx}));
    });
    setGiorni(newGiorni);
    // Ripristina nomi giorni
    if(preload.dayNames) {
      setDayNames(prev=>({...prev,...preload.dayNames}));
    }
    // Consuma il preload
    if(setPreload) setPreload(null);
  },[preload]);

  const filtered = searchQ.trim().length>0
    ? allAtleti.filter(a=>{
        const q=searchQ.toLowerCase();
        return a.nome.toLowerCase().includes(q)||a.cognome.toLowerCase().includes(q);
      }).slice(0,5)
    : [];

  const selectAtleta=(a)=>{
    setSelectedAtleta(a);
    setSearchQ(`${a.nome} ${a.cognome}`);
    setShowDrop(false);
    if(a.obiettivo) setObiettivo(a.obiettivo);
    if(a.livello) setLivello(a.livello);
  };

  const clearAtleta=()=>{ setSelectedAtleta(null); setSearchQ(""); setObiettivo(""); setLivello(""); };

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
    const nome=selectedAtleta?.nome||"";
    const cognome=selectedAtleta?.cognome||"";
    setPdfState({progress:0,label:"Preparazione…"});
    try{ await buildPDF({nome,cognome,obiettivo,livello,giorni:activeGiorni,onProgress:(p,l)=>setPdfState({progress:p,label:l})}); }
    catch(e){console.error(e);}
    finally{setPdfState(null);}
  };

  const doAssegna=()=>{
    if(!selectedAtleta||totalEx===0) return;
    const key=`pt_scheda_${selectedAtleta.id}`;
    const payload={
      atletaId:selectedAtleta.id,
      nome:selectedAtleta.nome,
      cognome:selectedAtleta.cognome,
      pt:"Personal Trainer Demo",
      obiettivo,livello,
      giorni:activeGiorni,
      dayNames:Object.fromEntries(activeDays.map(d=>[d,dayNames[d]||""])),
      assegnataIl:fmtDate(new Date()),
    };
    localStorage.setItem(key,JSON.stringify(payload));
    setShowOverwriteConfirm(false);
    setToast(`✓ Scheda assegnata a ${selectedAtleta.nome} ${selectedAtleta.cognome} — l'atleta può accedere ora con atleta / atleta`);
    setAssigned(true);
    setTimeout(()=>setAssigned(false), 2000);
  };

  const handleAssegna=()=>{
    if(!selectedAtleta||totalEx===0) return;
    const key=`pt_scheda_${selectedAtleta.id}`;
    if(localStorage.getItem(key)) { setShowOverwriteConfirm(true); return; }
    doAssegna();
  };

  return (
    <div>
      <BackBtn setView={setView}/>
      <div className="page-head"><div className="page-title">Builder Scheda</div><div className="page-sub">{totalEx} esercizi totali</div></div>
      {toast&&(
        <div style={{background:"rgba(71,255,232,.1)",border:"1px solid rgba(71,255,232,.3)",borderRadius:10,padding:"12px 18px",marginBottom:16,fontSize:13,fontWeight:600,color:"var(--accent2)",display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}>
          <span>{toast}</span>
          <button onClick={()=>setToast(null)} style={{background:"none",border:"none",color:"var(--accent2)",cursor:"pointer",fontSize:16,lineHeight:1,padding:0,flexShrink:0,opacity:.7,transition:"opacity .15s"}} onMouseEnter={e=>e.currentTarget.style.opacity=1} onMouseLeave={e=>e.currentTarget.style.opacity=.7}>✕</button>
        </div>
      )}
      <div className="builder">
        <div className="client-card">
          <div className="card-section-title">Dati Atleta</div>
          <div className="client-grid">
            {/* Ricerca atleta */}
            <div style={{gridColumn:"1 / span 2",position:"relative"}}>
              <label className="field-label">
                Atleta
                <input
                  className="field-input"
                  type="text"
                  placeholder="Cerca atleta…"
                  value={searchQ}
                  onChange={e=>{setSearchQ(e.target.value);setShowDrop(true);if(!e.target.value)clearAtleta();}}
                  onFocus={()=>setShowDrop(true)}
                  onBlur={()=>setTimeout(()=>setShowDrop(false),150)}
                  autoComplete="off"
                />
              </label>
              {showDrop&&filtered.length>0&&(
                <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:50,background:"var(--card2)",border:"1px solid var(--border)",borderRadius:10,overflow:"hidden",boxShadow:"0 8px 24px rgba(0,0,0,.4)"}}>
                  {filtered.map(a=>(
                    <div
                      key={a.id}
                      onMouseDown={()=>selectAtleta(a)}
                      style={{padding:"10px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:10,fontSize:14,borderBottom:"1px solid var(--border)"}}
                      onMouseEnter={e=>e.currentTarget.style.background="var(--border)"}
                      onMouseLeave={e=>e.currentTarget.style.background=""}
                    >
                      <div style={{width:28,height:28,borderRadius:7,background:a.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#07070d",flexShrink:0}}>{getInitials(a.nome,a.cognome)}</div>
                      <div>
                        <div style={{fontWeight:600,color:"var(--text)"}}>{a.nome} {a.cognome}</div>
                        <div style={{fontSize:11,color:"var(--muted)"}}>{a.obiettivo} · {a.livello}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
                {dayNames[d]||`Giorno ${d}`}{(giorni[d]||[]).length>0&&<span style={{marginLeft:6,background:"rgba(0,0,0,.2)",borderRadius:"100px",padding:"1px 7px",fontSize:11}}>{(giorni[d]||[]).length}</span>}
              </button>
            ))}
          </div>
          <span style={{fontSize:13,color:"var(--muted)"}}>{scheda.length===0?"Giorno vuoto":`${scheda.length} esercizi`}</span>
        </div>

        {/* Nome giorno personalizzato */}
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
          <input
            className="field-input"
            type="text"
            placeholder={`Nome giorno (es. Push, Braccia, Gambe…)`}
            value={dayNames[activeDay]||""}
            onChange={e=>setDayNames(prev=>({...prev,[activeDay]:e.target.value}))}
            style={{maxWidth:320,fontSize:13,padding:"8px 12px"}}
          />
          {dayNames[activeDay]&&(
            <button onClick={()=>setDayNames(prev=>({...prev,[activeDay]:""}))} style={{background:"none",border:"none",color:"var(--muted)",cursor:"pointer",fontSize:14,padding:"4px"}}>✕</button>
          )}
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

        {showOverwriteConfirm&&(
          <div className="overwrite-confirm">
            <span className="overwrite-confirm-text">⚠️ Questo atleta ha già una scheda assegnata. Sostituirla?</span>
            <div className="overwrite-confirm-actions">
              <button className="btn-ghost" style={{padding:"7px 14px",fontSize:13}} onClick={()=>setShowOverwriteConfirm(false)}>Annulla</button>
              <button className="btn-primary" style={{background:"var(--accent2)",color:"#07070d",padding:"7px 14px",fontSize:13}} onClick={doAssegna}>Sì, sostituisci</button>
            </div>
          </div>
        )}

        {totalEx>0&&!pdfState&&(
          <div className="actions-row">
            {scheda.length>0&&<button className="btn-ghost" onClick={clear}>Svuota Giorno {activeDay}</button>}
            <button className="btn-primary" onClick={handlePDF}>⬇ Esporta PDF completo</button>
            {selectedAtleta?.hasAccount&&<button className="btn-primary" style={{background:assigned?"var(--accent2)":"var(--accent2)",color:"#07070d",opacity:assigned?1:1,cursor:assigned?"default":"pointer",transition:"all .2s"}} disabled={assigned} onClick={handleAssegna}>{assigned?"✓ Assegnata!":"📲 Assegna all'atleta"}</button>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── ATLETI ────────────────────────────────────────────────────────────────────
const LS_ATLETI = "pt_atleti_demo";

function loadAtleti() {
  try {
    const raw = localStorage.getItem(LS_ATLETI);
    if(raw) return JSON.parse(raw);
  } catch {}
  localStorage.setItem(LS_ATLETI, JSON.stringify(DEMO_ATLETI));
  return DEMO_ATLETI;
}

function persistAtleti(arr) {
  localStorage.setItem(LS_ATLETI, JSON.stringify(arr));
}

// ── SCHEDA DEMO SECTION (lato PT, modal atleta demo) ─────────────────────────
function SchedaDemoSection({setView, onClose, setBuilderPreload}) {
  const [sd, setSd] = useState(undefined); // undefined=loading, null=nessuna, obj=scheda

  useEffect(()=>{
    try {
      const raw = localStorage.getItem("pt_scheda_0");
      setSd(raw ? JSON.parse(raw) : null);
    } catch { setSd(null); }
  },[]);

  if(sd===undefined) return null;

  if(!sd) return (
    <div style={{color:"var(--muted)",fontSize:14}}>Nessuna scheda assegnata ancora.</div>
  );

  return (
    <div>
      {/* Info scheda */}
      <div style={{background:"var(--card2)",border:"1px solid var(--border)",borderRadius:10,padding:"14px 16px",marginBottom:14}}>
        <div style={{display:"flex",flexWrap:"wrap",gap:"10px 20px",fontSize:13}}>
          {sd.obiettivo&&<span><span style={{color:"var(--muted)"}}>Obiettivo: </span><strong style={{color:"var(--text)"}}>{sd.obiettivo}</strong></span>}
          {sd.livello&&<span><span style={{color:"var(--muted)"}}>Livello: </span><strong style={{color:"var(--text)"}}>{sd.livello}</strong></span>}
          {sd.assegnataIl&&<span><span style={{color:"var(--muted)"}}>Assegnata il: </span><strong style={{color:"var(--text)"}}>{sd.assegnataIl}</strong></span>}
        </div>
      </div>
      {/* Esercizi per giorno */}
      {Object.entries(sd.giorni||{}).map(([day, exList])=>{
        const customName = sd.dayNames?.[day];
        return (
        <div key={day} style={{marginBottom:12}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:"var(--muted)",marginBottom:7}}>
            Giorno {day}{customName?` — ${customName}`:""} · {(exList||[]).length} esercizi
          </div>
          {(exList||[]).map(ex=>{
            const cc=CAT_COLORS[ex.cat]||"var(--accent)";
            return (
              <div key={ex.id} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 12px",background:"var(--card2)",border:"1px solid var(--border)",borderRadius:8,marginBottom:5}}>
                <span style={{fontSize:10,fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:cc,background:`${cc}16`,padding:"2px 7px",borderRadius:4,flexShrink:0}}>{ex.cat}</span>
                <span style={{fontSize:13,fontWeight:600,color:"var(--text)",flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ex.name}</span>
                <span style={{fontSize:12,color:"var(--muted)",flexShrink:0}}>{ex.sets}×{ex.reps} · {ex.rest}s</span>
              </div>
            );
          })}
        </div>
        );
      })}
      {/* Bottone modifica */}
      <button
        className="btn-primary"
        style={{marginTop:8,display:"flex",alignItems:"center",gap:6,fontSize:13}}
        onClick={()=>{
          if(setBuilderPreload) {
            setBuilderPreload({
              atletaId: sd.atletaId ?? 0,
              nome: sd.nome||"",
              cognome: sd.cognome||"",
              obiettivo: sd.obiettivo||"",
              livello: sd.livello||"",
              giorni: sd.giorni||{},
              dayNames: sd.dayNames||{},
            });
          }
          onClose();
          setView("builder");
        }}
      >
        ✏️ Modifica nel Builder
      </button>
    </div>
  );
}

function Atleti({setView, setBuilderPreload}) {
  const [atleti,setAtleti]=useState(()=>loadAtleti());
  const [selected,setSelected]=useState(null);
  const [showForm,setShowForm]=useState(false);
  const [editingProfilo,setEditingProfilo]=useState(false);
  const [editProfiloForm,setEditProfiloForm]=useState(null);
  const FORM_EMPTY = {nome:"",cognome:"",obiettivo:"",livello:"",altezza:"",dataNascita:"",sesso:"",note:""};
  const [form,setForm]=useState(FORM_EMPTY);

  const COLORS=["#e8ff47","#47ffe8","#ff9f47","#ff47a3","#a47ffe","#47a3ff"];

  // Seed misurazioni demo per atleta id=0
  useEffect(()=>{
    const existing = localStorage.getItem("pt_misure_0");
    if(!existing) saveMisure(0, DEMO_MISURE_0);
  },[]);

  const addAtleta=()=>{
    if(!form.nome||!form.cognome) return;
    const updated=[...atleti,{id:Date.now(),color:COLORS[atleti.length%COLORS.length],lastSeen:"Adesso",schede:0,...form}];
    setAtleti(updated);
    persistAtleti(updated);
    setForm(FORM_EMPTY);
    setShowForm(false);
  };

  const saveProfilo=()=>{
    if(!editProfiloForm) return;
    const updated = atleti.map(a=>a.id===selected.id?{...a,...editProfiloForm}:a);
    setAtleti(updated);
    persistAtleti(updated);
    // Aggiorna selected con i nuovi dati
    const updated_sel = updated.find(a=>a.id===selected.id);
    setSelected(updated_sel);
    setEditingProfilo(false);
  };

  return (
    <div>
      <BackBtn setView={setView}/>
      <div className="page-head" style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
        <div><div className="page-title">Atleti</div><div className="page-sub">{atleti.length} atleti attivi</div></div>
        <button className="btn-primary" onClick={()=>setShowForm(true)}>+ Nuovo atleta</button>
      </div>

      <div className="clients-grid">
        {atleti.map(a=>(
          <div className="client-item" key={a.id} onClick={()=>setSelected(a)}>
            <div className="avatar" style={{background:a.color}}>{getInitials(a.nome,a.cognome)}</div>
            <div className="client-info">
              <div className="client-name">{a.nome} {a.cognome}</div>
              <div className="client-tags">
                {a.obiettivo&&<span className="tag">{a.obiettivo}</span>}
                {a.livello&&<span className="tag">{a.livello}</span>}
              </div>
              <div className="client-meta">
                <span>🕐 {a.lastSeen}</span>
                <span>📋 {a.schede} schede</span>
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
              {/* ── SCHEDA ── */}
              <div style={{fontSize:12,fontWeight:600,letterSpacing:1,textTransform:"uppercase",color:"var(--muted)",marginBottom:12}}>Scheda assegnata</div>
              {selected.isDemoAtleta?(
                <SchedaDemoSection setView={setView} onClose={()=>setSelected(null)} setBuilderPreload={setBuilderPreload}/>
              ):selected.schede>0?(
                Array.from({length:selected.schede},(_,i)=>(
                  <span key={i} className="scheda-chip">📋 Scheda {i+1} — Giorno {DAYS[i%3]}</span>
                ))
              ):<div style={{color:"var(--muted)",fontSize:14}}>Nessuna scheda assegnata ancora.</div>}

              {/* ── PROFILO ── */}
              <div style={{marginTop:24}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                  <div style={{fontSize:12,fontWeight:600,letterSpacing:1,textTransform:"uppercase",color:"var(--muted)"}}>Profilo</div>
                  {!editingProfilo&&(
                    <button className="btn-ghost" style={{fontSize:11,padding:"4px 10px"}} onClick={()=>{setEditProfiloForm({obiettivo:selected.obiettivo||"",livello:selected.livello||"",altezza:selected.altezza||"",dataNascita:selected.dataNascita||"",sesso:selected.sesso||"",note:selected.note||""});setEditingProfilo(true);}}>✏️ Modifica</button>
                  )}
                </div>
                {editingProfilo&&editProfiloForm?(
                  <div style={{background:"var(--card2)",border:"1px solid var(--border)",borderRadius:10,padding:"14px 16px",marginBottom:10}}>
                    <div className="form-row" style={{marginBottom:10}}>
                      <label className="field-label">Obiettivo<select className="field-select" value={editProfiloForm.obiettivo} onChange={e=>setEditProfiloForm(p=>({...p,obiettivo:e.target.value}))}><option value="">— seleziona —</option>{OBIETTIVI.map(o=><option key={o}>{o}</option>)}</select></label>
                      <label className="field-label">Livello<select className="field-select" value={editProfiloForm.livello} onChange={e=>setEditProfiloForm(p=>({...p,livello:e.target.value}))}><option value="">— seleziona —</option>{LIVELLI.map(l=><option key={l}>{l}</option>)}</select></label>
                    </div>
                    <div className="form-row" style={{marginBottom:10}}>
                      <label className="field-label">Altezza (cm)<input className="field-input" type="number" min={100} max={250} placeholder="175" value={editProfiloForm.altezza} onChange={e=>setEditProfiloForm(p=>({...p,altezza:e.target.value}))}/></label>
                      <label className="field-label">Data di nascita<input className="field-input" type="date" value={editProfiloForm.dataNascita} onChange={e=>setEditProfiloForm(p=>({...p,dataNascita:e.target.value}))}/></label>
                    </div>
                    <label className="field-label" style={{marginBottom:10}}>Sesso<select className="field-select" value={editProfiloForm.sesso} onChange={e=>setEditProfiloForm(p=>({...p,sesso:e.target.value}))}><option value="">— non specificato —</option><option value="M">M</option><option value="F">F</option><option value="Altro">Altro</option></select></label>
                    <label className="field-label" style={{marginBottom:10}}>Note PT<textarea className="field-input" rows={3} placeholder="Infortuni, note mediche, preferenze…" value={editProfiloForm.note} onChange={e=>setEditProfiloForm(p=>({...p,note:e.target.value}))} style={{resize:"vertical",fontFamily:"'DM Sans',sans-serif",fontSize:14}}/></label>
                    <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                      <button className="btn-ghost" style={{fontSize:12,padding:"6px 14px"}} onClick={()=>setEditingProfilo(false)}>Annulla</button>
                      <button className="btn-primary" style={{fontSize:12,padding:"6px 14px"}} onClick={saveProfilo}>Salva</button>
                    </div>
                  </div>
                ):(
                  <div className="profilo-grid">
                    <div className="profilo-cell">
                      <div className="profilo-cell-label">Altezza</div>
                      <div className="profilo-cell-val">{selected.altezza?`${selected.altezza} cm`:"—"}</div>
                    </div>
                    <div className="profilo-cell">
                      <div className="profilo-cell-label">Età</div>
                      <div className="profilo-cell-val">{selected.dataNascita&&calcEta(selected.dataNascita)!==null?`${calcEta(selected.dataNascita)} anni`:"—"}</div>
                    </div>
                    <div className="profilo-cell">
                      <div className="profilo-cell-label">Sesso</div>
                      <div className="profilo-cell-val">{selected.sesso||"—"}</div>
                    </div>
                    <div className="profilo-cell" style={{gridColumn:"1/-1"}}>
                      <div className="profilo-cell-label">Note PT</div>
                      <div className="profilo-cell-val" style={{fontSize:13,whiteSpace:"pre-wrap"}}>{selected.note||"—"}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── STATISTICHE ── */}
              <div style={{marginTop:16,padding:"14px 16px",background:"var(--card2)",borderRadius:10,border:"1px solid var(--border)"}}>
                <div style={{fontSize:12,fontWeight:600,letterSpacing:1,textTransform:"uppercase",color:"var(--muted)",marginBottom:8}}>Statistiche</div>
                <div style={{display:"flex",gap:24,fontSize:14}}>
                  <div><span style={{color:"var(--muted)"}}>Ultimo accesso: </span><strong>{selected.lastSeen}</strong></div>
                  <div><span style={{color:"var(--muted)"}}>Schede: </span><strong style={{color:"var(--accent)"}}>{selected.schede||1}</strong></div>
                </div>
              </div>

              {/* ── MISURAZIONI ── */}
              <div style={{marginTop:24}}>
                <div style={{fontSize:12,fontWeight:600,letterSpacing:1,textTransform:"uppercase",color:"var(--muted)",marginBottom:12}}>📏 Misurazioni</div>
                <MisureSection atletaId={selected.id}/>
              </div>

              {/* ── PROGRESSI ── */}
              <div style={{marginTop:24}}>
                <div style={{fontSize:12,fontWeight:600,letterSpacing:1,textTransform:"uppercase",color:"var(--muted)",marginBottom:12}}>Progressi allenamento</div>
                <ProgressiSectionPT atleta={selected}/>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm&&(
        <div className="overlay" onClick={()=>setShowForm(false)}>
          <div className="form-modal" style={{maxWidth:520}} onClick={e=>e.stopPropagation()}>
            <div className="form-modal-header">
              <div className="modal-title">Nuovo Atleta</div>
              <button className="modal-close" onClick={()=>setShowForm(false)}>✕</button>
            </div>
            <div className="form-modal-body">
              <div className="form-row">
                <label className="field-label">Nome<input className="field-input" type="text" placeholder="Marco" value={form.nome} onChange={e=>setForm(p=>({...p,nome:e.target.value}))}/></label>
                <label className="field-label">Cognome<input className="field-input" type="text" placeholder="Rossi" value={form.cognome} onChange={e=>setForm(p=>({...p,cognome:e.target.value}))}/></label>
              </div>
              <div className="form-row">
                <label className="field-label">Obiettivo<select className="field-select" value={form.obiettivo} onChange={e=>setForm(p=>({...p,obiettivo:e.target.value}))}><option value="">— seleziona —</option>{OBIETTIVI.map(o=><option key={o}>{o}</option>)}</select></label>
                <label className="field-label">Livello<select className="field-select" value={form.livello} onChange={e=>setForm(p=>({...p,livello:e.target.value}))}><option value="">— seleziona —</option>{LIVELLI.map(l=><option key={l}>{l}</option>)}</select></label>
              </div>
              <div className="form-row">
                <label className="field-label">Altezza (cm)<input className="field-input" type="number" min={100} max={250} placeholder="175" value={form.altezza} onChange={e=>setForm(p=>({...p,altezza:e.target.value}))}/></label>
                <label className="field-label">Data di nascita<input className="field-input" type="date" value={form.dataNascita} onChange={e=>setForm(p=>({...p,dataNascita:e.target.value}))}/></label>
              </div>
              <label className="field-label">Sesso<select className="field-select" value={form.sesso} onChange={e=>setForm(p=>({...p,sesso:e.target.value}))}><option value="">— non specificato —</option><option value="M">M</option><option value="F">F</option><option value="Altro">Altro</option></select></label>
              <label className="field-label">Note PT<textarea className="field-input" rows={3} placeholder="Infortuni, note mediche, preferenze…" value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))} style={{resize:"vertical",fontFamily:"'DM Sans',sans-serif",fontSize:14}}/></label>
            </div>
            <div className="form-actions">
              <button className="btn-ghost" onClick={()=>setShowForm(false)}>Annulla</button>
              <button className="btn-primary" onClick={addAtleta}>Aggiungi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ATLETA SEARCH FIELD (usato nel calendario PT) ────────────────────────────
// Dropdown di ricerca atleti, rimane editabile liberamente (si può scrivere qualsiasi nome)
function AtletaSearchField({value, onChange}) {
  const [q, setQ] = useState(value||"");
  const [showDrop, setShowDrop] = useState(false);
  const allAtleti = loadAtleti();

  // Sincronizza q se value cambia dall'esterno (es. reset form)
  useEffect(()=>{ setQ(value||""); },[value]);

  const filtered = allAtleti.filter(a=>
    `${a.nome} ${a.cognome}`.toLowerCase().includes(q.toLowerCase())
  ).slice(0,5);

  const select = (a) => {
    const name = `${a.nome} ${a.cognome}`;
    setQ(name);
    onChange(name);
    setShowDrop(false);
  };

  return (
    <div style={{position:"relative"}}>
      <input
        className="field-input"
        type="text"
        placeholder="Cerca atleta o inserisci nome…"
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
              <div style={{width:28,height:28,borderRadius:7,background:a.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#07070d",flexShrink:0}}>
                {getInitials(a.nome,a.cognome)}
              </div>
              <div style={{minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>{a.nome} {a.cognome}</div>
                {a.obiettivo&&<div style={{fontSize:11,color:"var(--muted)"}}>{a.obiettivo}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── CALENDAR BASE (shared by trainer + admin) ─────────────────────────────────
function typeColor(type) {
  const t=(type||"").toLowerCase();
  if(t==="allenamento"||t==="riunione") return "var(--accent)";
  if(t==="valutazione"||t==="call")     return "var(--accent2)";
  if(t==="recupero")                    return "var(--accent3)";
  if(t==="visita")                      return "#ff9f47";
  if(t==="onboarding")                  return "#a47ffe";
  return "var(--accent)";
}
function typeBg(type) {
  const t=(type||"").toLowerCase();
  if(t==="allenamento"||t==="riunione") return "rgba(232,255,71,.15)";
  if(t==="valutazione"||t==="call")     return "rgba(71,255,232,.15)";
  if(t==="recupero")                    return "rgba(255,71,163,.15)";
  if(t==="visita")                      return "rgba(255,159,71,.15)";
  if(t==="onboarding")                  return "rgba(164,127,254,.15)";
  return "rgba(232,255,71,.15)";
}
function getMonday(d) {
  const date=new Date(d); const day=date.getDay();
  date.setDate(date.getDate()-day+(day===0?-6:1)); return date;
}
const HOURS=Array.from({length:16},(_,i)=>i+6); // 06..21

function CalendarBase({events,setEvents,sessionTypes,clientLabel,setView,pageSubtitle,enableAtletaSearch=false}) {
  const now=new Date();
  const todayStr=fmtDate(now);
  const [calView,setCalView]=useState("month");
  const [year,setYear]=useState(now.getFullYear());
  const [month,setMonth]=useState(now.getMonth());
  const [weekStart,setWeekStart]=useState(getMonday(now));
  const [dayModal,setDayModal]=useState(null);
  const [showAddForm,setShowAddForm]=useState(null);
  const [editEv,setEditEv]=useState(null);
  const [deleteConfirm,setDeleteConfirm]=useState(null);
  const [form,setForm]=useState({clientName:"",time:"10:00",type:sessionTypes[0]});
  const [editForm,setEditForm]=useState({clientName:"",time:"10:00",type:sessionTypes[0]});

  const evsByDate=(ds)=>[...events].filter(e=>e.date===ds).sort((a,b)=>a.time.localeCompare(b.time));

  const openAddForm=(date,time="10:00")=>{ setShowAddForm(date); setForm({clientName:"",time,type:sessionTypes[0]}); };
  const addEvent=()=>{
    if(!form.clientName) return;
    setEvents(prev=>[...prev,{id:Date.now(),clientName:form.clientName,date:showAddForm,time:form.time,type:form.type}]);
    setShowAddForm(null); setForm({clientName:"",time:"10:00",type:sessionTypes[0]});
  };
  const deleteEvent=(id)=>{ setEvents(prev=>prev.filter(e=>e.id!==id)); setDeleteConfirm(null); };
  const startEdit=(ev)=>{ setEditEv(ev); setEditForm({clientName:ev.clientName,time:ev.time,type:ev.type}); };
  const saveEdit=()=>{ setEvents(prev=>prev.map(e=>e.id===editEv.id?{...e,...editForm}:e)); setEditEv(null); };

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

  const prevW=()=>{ const d=new Date(weekStart); d.setDate(d.getDate()-7); setWeekStart(d); };
  const nextW=()=>{ const d=new Date(weekStart); d.setDate(d.getDate()+7); setWeekStart(d); };
  const weekDays=Array.from({length:7},(_,i)=>{ const d=new Date(weekStart); d.setDate(d.getDate()+i); return d; });
  const weekLabel=`${weekDays[0].getDate()} ${MONTHS_IT[weekDays[0].getMonth()]} — ${weekDays[6].getDate()} ${MONTHS_IT[weekDays[6].getMonth()]} ${weekDays[6].getFullYear()}`;

  return (
    <div>
      <BackBtn setView={setView}/>
      <div className="page-head">
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12,marginBottom:20}}>
          <div className="cal-view-toggle">
            <button className={`cal-view-btn${calView==="month"?" active":""}`} onClick={()=>setCalView("month")}>Mese</button>
            <button className={`cal-view-btn${calView==="week"?" active":""}`} onClick={()=>setCalView("week")}>Settimana</button>
          </div>
          <div className="cal-header">
            <button className="cal-nav" onClick={calView==="month"?prevM:prevW}>‹</button>
            <div className="cal-month" style={{fontSize:calView==="week"?"16px":"24px",letterSpacing:calView==="week"?"1px":"2px"}}>
              {calView==="month"?`${MONTHS_IT[month]} ${year}`:weekLabel}
            </div>
            <button className="cal-nav" onClick={calView==="month"?nextM:nextW}>›</button>
          </div>
        </div>
        {pageSubtitle&&<div className="page-sub">{pageSubtitle}</div>}
      </div>

      {/* ── MONTHLY VIEW ── */}
      {calView==="month"&&(
        <div className="cal-grid">
          {DAYS_IT.map(d=><div key={d} className="cal-day-label">{d}</div>)}
          {cells.map((cell,i)=>{
            if(!cell.date) return <div key={`e${i}`}/>;
            const dayEvs=evsByDate(cell.date);
            const isToday=cell.date===todayStr;
            const fc=dayEvs.length>0?typeColor(dayEvs[0].type):null;
            return (
              <div key={cell.date} className={`cal-cell-month${isToday?" today":""}`} onClick={()=>setDayModal(cell.date)}>
                <div className="cal-num">{cell.day}</div>
                {dayEvs.length>0&&(
                  <div className="cal-event-badge">
                    <div className="cal-event-dot" style={{background:fc}}/>
                    <span className="cal-event-count">{dayEvs.length}</span>
                  </div>
                )}
                {fc&&<div className="cal-day-bar" style={{background:fc,opacity:.45}}/>}
                <button className="cal-add-btn" onClick={e=>{e.stopPropagation();openAddForm(cell.date);}}>+</button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── WEEKLY VIEW ── */}
      {calView==="week"&&(
        <div className="cal-week-wrap">
          <div className="cal-week-grid">
            <div className="cal-week-head-empty"/>
            {weekDays.map((d,i)=>{
              const ds=fmtDate(d);
              const isToday=ds===todayStr;
              return (
                <div key={i} className={`cal-week-header${isToday?" today-col":""}`}>
                  {DAYS_IT[i]}<br/><span style={{fontSize:14,fontWeight:700}}>{d.getDate()}</span>
                </div>
              );
            })}
            {HOURS.map(h=>(
              <React.Fragment key={h}>
                <div className="cal-hour-label">{String(h).padStart(2,"0")}:00</div>
                {weekDays.map((d,di)=>{
                  const ds=fmtDate(d);
                  const isToday=ds===todayStr;
                  const cellEvs=evsByDate(ds).filter(e=>parseInt(e.time.split(":")[0])===h);
                  return (
                    <div key={di} className={`cal-week-cell${isToday?" today-col":""}`} onClick={()=>openAddForm(ds,`${String(h).padStart(2,"0")}:00`)} style={{cursor:"pointer"}}>
                      {cellEvs.map(ev=>(
                        <div key={ev.id} className={`cal-week-event cal-event ${ev.type.toLowerCase()}`} onClick={e=>{e.stopPropagation();startEdit(ev);}}>
                          {ev.time} {ev.clientName.split(" ")[0]}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* ── DAY MODAL ── */}
      {dayModal&&(
        <div className="overlay" onClick={()=>{setDayModal(null);setDeleteConfirm(null);}}>
          <div className="day-modal" onClick={e=>e.stopPropagation()}>
            <div className="day-modal-header">
              <div className="modal-title" style={{fontSize:16,textTransform:"capitalize"}}>
                {new Date(dayModal+"T12:00").toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long"})}
              </div>
              <button className="modal-close" onClick={()=>{setDayModal(null);setDeleteConfirm(null);}}>✕</button>
            </div>
            <div className="day-modal-body">
              {evsByDate(dayModal).length===0&&(
                <div style={{color:"var(--muted)",fontSize:14,textAlign:"center",padding:"20px 0"}}>Nessun appuntamento</div>
              )}
              {evsByDate(dayModal).map(ev=>(
                <div key={ev.id}>
                  <div className="day-event-row">
                    <div className="day-event-time">{ev.time}</div>
                    <div className="day-event-name">{ev.clientName}</div>
                    <div className="day-event-type-badge" style={{background:typeBg(ev.type),color:typeColor(ev.type)}}>{ev.type}</div>
                    <div className="day-event-actions">
                      <button className="day-event-btn" title="Modifica" onClick={()=>{setDayModal(null);setDeleteConfirm(null);startEdit(ev);}}>✏️</button>
                      <button className="day-event-btn" title="Elimina" onClick={()=>setDeleteConfirm(deleteConfirm===ev.id?null:ev.id)}>🗑️</button>
                    </div>
                  </div>
                  {deleteConfirm===ev.id&&(
                    <div className="day-delete-confirm">
                      <span style={{fontSize:13,color:"var(--text)"}}>Eliminare questo appuntamento?</span>
                      <div style={{display:"flex",gap:8}}>
                        <button className="btn-ghost" style={{padding:"5px 12px",fontSize:12}} onClick={()=>setDeleteConfirm(null)}>Annulla</button>
                        <button className="btn-danger" onClick={()=>deleteEvent(ev.id)}>Elimina</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="day-modal-footer">
              <button className="btn-primary" style={{width:"100%"}} onClick={()=>{const d=dayModal;setDayModal(null);setDeleteConfirm(null);openAddForm(d);}}>+ Aggiungi appuntamento</button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD FORM ── */}
      {showAddForm&&(
        <div className="overlay" onClick={()=>setShowAddForm(null)}>
          <div className="form-modal" onClick={e=>e.stopPropagation()}>
            <div className="form-modal-header">
              <div className="modal-title">Nuovo Appuntamento</div>
              <button className="modal-close" onClick={()=>setShowAddForm(null)}>✕</button>
            </div>
            <div className="form-modal-body">
              <div style={{fontSize:13,color:"var(--muted)",background:"var(--card2)",padding:"10px 14px",borderRadius:8}}>
                📅 {new Date(showAddForm+"T12:00").toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long"})}
              </div>
              <label className="field-label">
                {clientLabel}
                {enableAtletaSearch
                  ? <AtletaSearchField value={form.clientName} onChange={v=>setForm(p=>({...p,clientName:v}))}/>
                  : <input className="field-input" type="text" placeholder="Nome cognome" value={form.clientName} onChange={e=>setForm(p=>({...p,clientName:e.target.value}))}/>
                }
              </label>
              <div className="form-row">
                <label className="field-label">Orario<input className="field-input" type="time" value={form.time} onChange={e=>setForm(p=>({...p,time:e.target.value}))}/></label>
                <label className="field-label">Tipo<select className="field-select" value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))}>{sessionTypes.map(t=><option key={t}>{t}</option>)}</select></label>
              </div>
            </div>
            <div className="form-actions">
              <button className="btn-ghost" onClick={()=>setShowAddForm(null)}>Annulla</button>
              <button className="btn-primary" onClick={addEvent}>Salva</button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT FORM ── */}
      {editEv&&(
        <div className="overlay" onClick={()=>setEditEv(null)}>
          <div className="form-modal" onClick={e=>e.stopPropagation()}>
            <div className="form-modal-header">
              <div className="modal-title">Modifica Appuntamento</div>
              <button className="modal-close" onClick={()=>setEditEv(null)}>✕</button>
            </div>
            <div className="form-modal-body">
              <label className="field-label">
                {clientLabel}
                {enableAtletaSearch
                  ? <AtletaSearchField value={editForm.clientName} onChange={v=>setEditForm(p=>({...p,clientName:v}))}/>
                  : <input className="field-input" type="text" value={editForm.clientName} onChange={e=>setEditForm(p=>({...p,clientName:e.target.value}))}/>
                }
              </label>
              <div className="form-row">
                <label className="field-label">Orario<input className="field-input" type="time" value={editForm.time} onChange={e=>setEditForm(p=>({...p,time:e.target.value}))}/></label>
                <label className="field-label">Tipo<select className="field-select" value={editForm.type} onChange={e=>setEditForm(p=>({...p,type:e.target.value}))}>{sessionTypes.map(t=><option key={t}>{t}</option>)}</select></label>
              </div>
            </div>
            <div className="form-actions" style={{justifyContent:"space-between"}}>
              <button className="btn-danger" onClick={()=>{deleteEvent(editEv.id);setEditEv(null);}}>Elimina</button>
              <div style={{display:"flex",gap:10}}>
                <button className="btn-ghost" onClick={()=>setEditEv(null)}>Annulla</button>
                <button className="btn-primary" onClick={saveEdit}>Salva modifiche</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── CALENDAR ──────────────────────────────────────────────────────────────────
const LS_CAL_SHARED = "pt_calendar_shared";

function loadSharedCal() {
  try { const r=localStorage.getItem(LS_CAL_SHARED); return r?JSON.parse(r):null; } catch { return null; }
}
function saveSharedCal(events) {
  try { localStorage.setItem(LS_CAL_SHARED, JSON.stringify(events)); } catch {}
}

function CalendarView({setView}) {
  const [events,setEvents]=useState(()=>loadSharedCal()||DEMO_EVENTS);

  // Ogni volta che gli eventi cambiano, sincronizza su localStorage condiviso
  useEffect(()=>{ saveSharedCal(events); },[events]);

  return <CalendarBase events={events} setEvents={setEvents} sessionTypes={SESSION_TYPES} clientLabel="Atleta" setView={setView} enableAtletaSearch={true}/>;
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
    {pt:"Marta Savi",     action:"ha aggiunto un nuovo atleta",  time:"18 min fa",   icon:"👤"},
    {pt:"Giulia Moretti", action:"ha esportato un PDF",          time:"1 ora fa",    icon:"📄"},
    {pt:"Andrea Rossi",   action:"ha effettuato l'accesso",      time:"2 ore fa",    icon:"🔑"},
    {pt:"Paolo Crespi",   action:"ha creato una nuova scheda",   time:"ieri, 18:30", icon:"📋"},
    {pt:"Lorenzo De Luca",action:"ha aggiunto un nuovo atleta",  time:"ieri, 15:10", icon:"👤"},
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
  const [events,setEvents]=useState(ADMIN_EVENTS);
  return <CalendarBase events={events} setEvents={setEvents} sessionTypes={ADMIN_SESSION_TYPES} clientLabel="PT / Contatto" setView={setView} pageSubtitle="I tuoi appuntamenti con i PT"/>;
}

// ── MISURE SECTION ────────────────────────────────────────────────────────────
// Riusato sia nel modal PT che nella tab Progressi atleta
const MISURE_FIELDS = [
  { key:"peso",      label:"Peso",      emoji:"⚖️", unit:"kg"  },
  { key:"vita",      label:"Vita",      emoji:"📏", unit:"cm"  },
  { key:"fianchi",   label:"Fianchi",   emoji:"🍑", unit:"cm"  },
  { key:"petto",     label:"Petto",     emoji:"💪", unit:"cm"  },
  { key:"braccio",   label:"Braccio",   emoji:"💪", unit:"cm"  },
  { key:"grassoPerc",label:"Grasso",    emoji:"🔬", unit:"%"   },
  { key:"fcRiposo",  label:"FC Riposo", emoji:"❤️", unit:"bpm" },
];

function MisureSection({atletaId, readOnly=false}) {
  const todayStr = fmtDate(new Date());
  const [misure, setMisure] = useState(()=>loadMisure(atletaId));
  const [form, setForm] = useState({
    data:todayStr, peso:"", vita:"", fianchi:"", petto:"", braccio:"", grassoPerc:"", fcRiposo:""
  });
  const [showAvanzati, setShowAvanzati] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  // Chip grafico
  const [selMisure, setSelMisure] = useState([]);

  const handleSave = () => {
    if(!form.peso && !form.vita) return; // richiede almeno un campo
    const newEntry = {...form};
    const updated = [...misure.filter(m=>m.data!==form.data), newEntry]
      .sort((a,b)=>a.data.localeCompare(b.data));
    setMisure(updated);
    saveMisure(atletaId, updated);
    setForm({data:todayStr, peso:"", vita:"", fianchi:"", petto:"", braccio:"", grassoPerc:"", fcRiposo:""});
    setShowAvanzati(false);
  };

  const handleDelete = (idx) => {
    const updated = misure.filter((_,i)=>i!==idx);
    setMisure(updated);
    saveMisure(atletaId, updated);
    setDeleteConfirm(null);
  };

  const toggleMisura = (key) => {
    setSelMisure(prev=>prev.includes(key)?prev.filter(k=>k!==key):[...prev,key]);
  };

  // Chip attivi = quelli con ≥2 valori non vuoti
  const activeMisureKeys = MISURE_FIELDS
    .filter(f=>misure.filter(m=>m[f.key]&&+m[f.key]>0).length>=2)
    .map(f=>f.key);

  // Linee grafico
  const chartLines = MISURE_FIELDS
    .filter(f=>selMisure.includes(f.key)&&activeMisureKeys.includes(f.key))
    .map((f,i)=>({
      id:f.key, name:`${f.emoji} ${f.label}`,
      color:LINE_COLORS[i%LINE_COLORS.length],
      points:misure
        .filter(m=>m[f.key]&&+m[f.key]>0)
        .map(m=>({date:m.data,kg:+m[f.key]}))
    }));

  const visibleMisure = expanded ? misure : [...misure].reverse().slice(0,3);

  return (
    <div>
      {/* ── FORM NUOVA MISURAZIONE ── */}
      {!readOnly&&(
        <div style={{background:"var(--card2)",border:"1px solid var(--border)",borderRadius:10,padding:"14px 16px",marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:"var(--muted)",marginBottom:10}}>Nuova misurazione</div>
          <div className="form-row" style={{marginBottom:10}}>
            <label className="field-label">Data<input className="field-input" type="date" value={form.data} onChange={e=>setForm(p=>({...p,data:e.target.value}))}/></label>
          </div>
          <div className="form-row" style={{marginBottom:10}}>
            <label className="field-label">Peso (kg)<input className="field-input" type="number" min={0} max={300} step={0.1} placeholder="78.5" value={form.peso} onChange={e=>setForm(p=>({...p,peso:e.target.value}))}/></label>
            <label className="field-label">Vita (cm)<input className="field-input" type="number" min={0} max={200} placeholder="82" value={form.vita} onChange={e=>setForm(p=>({...p,vita:e.target.value}))}/></label>
          </div>
          <button className="btn-ghost" style={{fontSize:11,padding:"5px 12px",marginBottom:showAvanzati?8:0}} onClick={()=>setShowAvanzati(v=>!v)}>
            {showAvanzati?"▲ Nascondi avanzati":"➕ Dati avanzati"}
          </button>
          {showAvanzati&&(
            <div className="misure-avanzati">
              <div className="form-row">
                <label className="field-label">Fianchi (cm)<input className="field-input" type="number" min={0} max={200} placeholder="96" value={form.fianchi} onChange={e=>setForm(p=>({...p,fianchi:e.target.value}))}/></label>
                <label className="field-label">Petto (cm)<input className="field-input" type="number" min={0} max={200} placeholder="100" value={form.petto} onChange={e=>setForm(p=>({...p,petto:e.target.value}))}/></label>
              </div>
              <div className="form-row">
                <label className="field-label">Braccio (cm)<input className="field-input" type="number" min={0} max={100} placeholder="36" value={form.braccio} onChange={e=>setForm(p=>({...p,braccio:e.target.value}))}/></label>
                <label className="field-label">FC Riposo (bpm)<input className="field-input" type="number" min={30} max={200} placeholder="65" value={form.fcRiposo} onChange={e=>setForm(p=>({...p,fcRiposo:e.target.value}))}/></label>
              </div>
              <label className="field-label">% Massa grassa<input className="field-input" type="number" min={0} max={70} step={0.1} placeholder="18.5" value={form.grassoPerc} onChange={e=>setForm(p=>({...p,grassoPerc:e.target.value}))}/></label>
            </div>
          )}
          <button className="btn-primary" style={{marginTop:10,width:"100%"}} onClick={handleSave}>Salva misurazione</button>
        </div>
      )}

      {/* ── LISTA MISURAZIONI ── */}
      {misure.length===0?(
        <div style={{color:"var(--muted)",fontSize:13,padding:"8px 0"}}>
          {readOnly?"Il tuo PT non ha ancora registrato misurazioni":"Nessuna misurazione registrata ancora."}
        </div>
      ):(
        <>
          {[...misure].reverse().slice(0, expanded?999:3).map((m,i)=>{
            const realIdx = misure.length-1-i;
            const badges = MISURE_FIELDS.filter(f=>m[f.key]&&+m[f.key]>0);
            return (
              <div key={m.data+i}>
                <div className="misure-entry">
                  <span className="misure-date">{fmtDateShort(m.data)}</span>
                  {badges.map(f=>(
                    <span key={f.key} className="misura-badge">{f.emoji} {m[f.key]} {f.unit}</span>
                  ))}
                  <div style={{flex:1}}/>
                  {!readOnly&&(
                    <button className="day-event-btn" onClick={()=>setDeleteConfirm(deleteConfirm===realIdx?null:realIdx)}>🗑️</button>
                  )}
                </div>
                {deleteConfirm===realIdx&&(
                  <div className="day-delete-confirm" style={{marginBottom:7}}>
                    <span style={{fontSize:13,color:"var(--text)"}}>Eliminare questa misurazione?</span>
                    <div style={{display:"flex",gap:8}}>
                      <button className="btn-ghost" style={{padding:"5px 12px",fontSize:12}} onClick={()=>setDeleteConfirm(null)}>Annulla</button>
                      <button className="btn-danger" onClick={()=>handleDelete(realIdx)}>Elimina</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {misure.length>3&&(
            <button className="appt-expand-btn" onClick={()=>setExpanded(v=>!v)}>
              {expanded?"Mostra meno ▲":`Vedi tutte (${misure.length}) ▼`}
            </button>
          )}
        </>
      )}

      {/* ── GRAFICO ── */}
      {misure.length<2?(
        <div style={{color:"var(--muted)",fontSize:13,marginTop:12,padding:"10px 0",textAlign:"center"}}>
          {misure.length===0?"":readOnly?"":"Aggiungi almeno 2 misurazioni per vedere il grafico"}
        </div>
      ):(
        <div style={{marginTop:14}}>
          <div className="prog-chips" style={{marginBottom:8}}>
            {MISURE_FIELDS.filter(f=>activeMisureKeys.includes(f.key)).map((f,i)=>{
              const sel=selMisure.includes(f.key);
              const cc=LINE_COLORS[i%LINE_COLORS.length];
              return (
                <button key={f.key}
                  className={`prog-chip unlocked${sel?" selected":""}`}
                  style={sel?{background:`${cc}1a`,borderColor:cc,color:cc}:{}}
                  onClick={()=>toggleMisura(f.key)}
                >{f.emoji} {f.label}</button>
              );
            })}
          </div>
          {chartLines.length===0?(
            <div style={{color:"var(--muted)",fontSize:13,textAlign:"center",padding:"8px 0"}}>
              Seleziona una metrica per vedere il grafico
            </div>
          ):(
            <>
              <div className="prog-legend">
                {chartLines.map(l=>(
                  <div key={l.id} className="prog-legend-item">
                    <div style={{width:8,height:8,borderRadius:"50%",background:l.color,flexShrink:0}}/>
                    <span>{l.name}</span>
                  </div>
                ))}
              </div>
              <div className="prog-chart-box"><ProgressiMultiChart lines={chartLines}/></div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── ATLETA EXERCISE CARD ──────────────────────────────────────────────────────
// Componente con proprio state per immagine e video modal, usato in AtletaView
function AtletaExCard({ex, peso, onPesoChange}) {
  const [imgOk, setImgOk] = useState(true);
  const [showVideo, setShowVideo] = useState(false);
  const cc = CAT_COLORS[ex.cat] || "#e8ff47";
  const slug = EX_IMAGES[ex.id];
  const exFull = EXERCISES.find(e => e.id === ex.id);

  return (
    <>
      <div className="ex-atleta-card">
        {imgOk && slug
          ? <img
              className="ex-atleta-thumb"
              src={`/exercises-custom/${slug}.jpg`}
              alt={ex.name}
              onError={()=>setImgOk(false)}
            />
          : <div className="ex-atleta-thumb-ph">💪</div>
        }
        <div className="ex-atleta-body">
          <div className="ex-atleta-top">
            <span className="ex-cat" style={{color:cc,background:`${cc}16`}}>{ex.cat}</span>
            <div className="ex-peso-wrap">
              <input
                className="ex-peso-input"
                type="number"
                min={0}
                max={999}
                placeholder="0"
                value={peso||""}
                onChange={e=>onPesoChange(e.target.value)}
              />
              <span className="ex-peso-unit">kg</span>
            </div>
          </div>
          <div className="ex-cliente-name">{ex.name}</div>
          <div className="ex-cliente-meta">{ex.sets} serie × {ex.reps} rip · recupero {ex.rest}s</div>
          {exFull?.yt&&(
            <button className="video-btn" style={{marginTop:10}} onClick={()=>setShowVideo(true)}>
              <span className="play-icon">▶</span>Guarda il video
            </button>
          )}
        </div>
      </div>
      {showVideo&&exFull&&<VideoModal ex={exFull} onClose={()=>setShowVideo(false)}/>}
    </>
  );
}

// ── PROGRESSI — SEZIONE PT (usata nel modal Atleti) ──────────────────────────
function ProgressiSectionPT({atleta}) {
  const [selIds,setSelIds]=useState(null); // null = non ancora inizializzato

  // Atleti con dati insufficienti (<3 sessioni totali)
  if(atleta.id===2||atleta.id===4) {
    return (
      <div style={{color:"var(--muted)",fontSize:13,padding:"8px 0",lineHeight:1.6}}>
        Dati insufficienti — servono almeno 3 sessioni per visualizzare i progressi.
      </div>
    );
  }

  // Sorgente sessioni
  const sessions = atleta.isDemoAtleta ? loadSessions() : (FAKE_SESSIONS[atleta.id]||[]);
  const exercises = atleta.isDemoAtleta
    ? [...new Set(sessions.flatMap(s=>Object.keys(s.weights||{}).map(Number)))]
        .map(id=>EXERCISES.find(e=>e.id===id)).filter(Boolean)
    : getFakeExercises(atleta.id);

  if(!sessions.length||!exercises.length) {
    return <div style={{color:"var(--muted)",fontSize:13}}>Nessuna sessione registrata ancora.</div>;
  }

  const counts=countSessionsPerEx(sessions);
  const unlockedIds=exercises.filter(ex=>(counts[ex.id]||0)>=3).map(ex=>ex.id);

  if(!unlockedIds.length) {
    return <div style={{color:"var(--muted)",fontSize:13}}>Dati insufficienti — servono almeno 3 sessioni per esercizio.</div>;
  }

  // Colore per indice (indipendente dalla categoria)
  const colorMap = Object.fromEntries(exercises.map((ex,i)=>[ex.id, LINE_COLORS[i%LINE_COLORS.length]]));

  // Inizializzazione: seleziona tutti gli esercizi sbloccati
  const activeSel = selIds!==null ? selIds : unlockedIds;

  const toggle=(id)=>{
    const cur=selIds!==null?selIds:unlockedIds;
    const next=cur.includes(id)?cur.filter(x=>x!==id):[...cur,id];
    setSelIds(next);
  };

  const lines=exercises
    .filter(ex=>activeSel.includes(ex.id)&&(counts[ex.id]||0)>=3)
    .map(ex=>({
      id:ex.id, name:ex.name, color:colorMap[ex.id],
      points:sessions
        .filter(s=>+s.weights?.[ex.id]>0)
        .map(s=>({date:s.date,kg:+s.weights[ex.id]}))
        .sort((a,b)=>a.date.localeCompare(b.date))
    }));

  return (
    <div style={{marginTop:4}}>
      <div className="prog-chips">
        {exercises.map(ex=>{
          const unlocked=(counts[ex.id]||0)>=3;
          const sel=activeSel.includes(ex.id);
          const cc=colorMap[ex.id];
          return (
            <button key={ex.id}
              className={`prog-chip${unlocked?" unlocked":" locked"}${sel?" selected":""}`}
              style={sel&&unlocked?{background:`${cc}1a`,borderColor:cc,color:cc}:{}}
              onClick={()=>unlocked&&toggle(ex.id)}
            >
              {ex.name.length>20?ex.name.slice(0,20)+"…":ex.name}
              {!unlocked&&<span style={{marginLeft:4,fontSize:9,opacity:.7}}>🔒</span>}
            </button>
          );
        })}
      </div>
      {lines.length>0?(
        <>
          <div className="prog-legend">
            {lines.map(l=>(
              <div key={l.id} className="prog-legend-item">
                <div style={{width:8,height:8,borderRadius:"50%",background:l.color,flexShrink:0}}/>
                <span>{l.name}</span>
              </div>
            ))}
          </div>
          <div className="prog-chart-box"><ProgressiMultiChart lines={lines}/></div>
        </>
      ):(
        <div style={{textAlign:"center",color:"var(--muted)",fontSize:13,padding:"16px 0"}}>
          Seleziona almeno un esercizio per vedere il grafico
        </div>
      )}
    </div>
  );
}

// ── PROGRESSI — SCHERMATA ATLETA ──────────────────────────────────────────────
function AtletaProgressi({scheda}) {
  const [selIds,setSelIds]=useState([]); // esercizi selezionati (default: nessuno)
  const [lockedExId,setLockedExId]=useState(null); // chip bloccato cliccato

  if(!scheda) {
    return (
      <div className="cliente-body">
        <div style={{textAlign:"center",paddingTop:48}}>
          <div style={{fontSize:40,marginBottom:12}}>📋</div>
          <div style={{fontSize:15,fontWeight:600,color:"var(--text)",marginBottom:6}}>Nessuna scheda assegnata</div>
          <div style={{fontSize:13,color:"var(--muted)"}}>Chiedi al tuo PT.</div>
        </div>
      </div>
    );
  }

  // Tutti gli esercizi unici della scheda (da tutti i giorni)
  const seen=new Set();
  const allExercises=[];
  Object.values(scheda.giorni).forEach(exList=>{
    (exList||[]).forEach(ex=>{
      if(!seen.has(ex.id)){
        seen.add(ex.id);
        const full=EXERCISES.find(e=>e.id===ex.id)||ex;
        allExercises.push(full);
      }
    });
  });

  const sessions=loadSessions();
  const counts=countSessionsPerEx(sessions);

  // Colore per indice (indipendente dalla categoria)
  const colorMap = Object.fromEntries(allExercises.map((ex,i)=>[ex.id, LINE_COLORS[i%LINE_COLORS.length]]));

  const toggle=(id)=>{
    setLockedExId(null);
    setSelIds(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);
  };

  const lines=allExercises
    .filter(ex=>selIds.includes(ex.id)&&(counts[ex.id]||0)>=3)
    .map(ex=>({
      id:ex.id, name:ex.name, color:colorMap[ex.id],
      points:sessions
        .filter(s=>+s.weights?.[ex.id]>0)
        .map(s=>({date:s.date,kg:+s.weights[ex.id]}))
        .sort((a,b)=>a.date.localeCompare(b.date))
    }));

  return (
    <div className="cliente-body">
      <div className="prog-section">
        <div className="prog-section-head">Esercizi</div>
        <div className="prog-chips">
          {allExercises.map(ex=>{
            const unlocked=(counts[ex.id]||0)>=3;
            const sel=selIds.includes(ex.id);
            const cc=colorMap[ex.id];
            const isLocked=lockedExId===ex.id;
            return (
              <div key={ex.id} style={{display:"flex",flexDirection:"column",gap:4}}>
                <button
                  className={`prog-chip${unlocked?" unlocked":" locked"}${sel?" selected":""}`}
                  style={sel&&unlocked?{background:`${cc}1a`,borderColor:cc,color:cc}:{}}
                  onClick={()=>{
                    if(!unlocked){setLockedExId(isLocked?null:ex.id);}
                    else toggle(ex.id);
                  }}
                >
                  {ex.name.length>22?ex.name.slice(0,22)+"…":ex.name}
                  {unlocked
                    ?<span style={{marginLeft:5,fontSize:10,opacity:.6}}>{counts[ex.id]||0}×</span>
                    :<span style={{marginLeft:5,fontSize:10,opacity:.6}}>🔒</span>
                  }
                </button>
                {isLocked&&(
                  <div className="prog-lock-msg">
                    Completa almeno 3 allenamenti con questo esercizio per sbloccare il grafico
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {selIds.length===0?(
          <div className="prog-empty">
            <div className="prog-empty-icon">📈</div>
            Seleziona un esercizio per vedere i tuoi progressi
          </div>
        ):lines.length>0?(
          <>
            <div className="prog-legend">
              {lines.map(l=>(
                <div key={l.id} className="prog-legend-item">
                  <div style={{width:8,height:8,borderRadius:"50%",background:l.color,flexShrink:0}}/>
                  <span>{l.name}</span>
                </div>
              ))}
            </div>
            <div className="prog-chart-box"><ProgressiMultiChart lines={lines}/></div>
          </>
        ):(
          <div className="prog-empty">
            <div className="prog-empty-icon">⏳</div>
            Completa almeno 3 allenamenti con gli esercizi selezionati per visualizzare il grafico
          </div>
        )}
      </div>

      {/* ── LE MIE MISURAZIONI ── */}
      <div className="prog-section" style={{marginTop:8}}>
        <div className="prog-section-head">📏 Le mie misurazioni</div>
        <MisureSection atletaId={0} readOnly={true}/>
      </div>
    </div>
  );
}

// ── ATLETA VIEW ───────────────────────────────────────────────────────────────
const LS_KEY = "pt_sessions_demo_atleta";

function loadSessions() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)||"[]"); } catch { return []; }
}
function saveSessions(arr) {
  localStorage.setItem(LS_KEY, JSON.stringify(arr));
}

// ── MISURAZIONI HELPERS ───────────────────────────────────────────────────────
function loadMisure(atletaId) {
  try { return JSON.parse(localStorage.getItem(`pt_misure_${atletaId}`)||"[]"); } catch { return []; }
}
function saveMisure(atletaId, arr) {
  try { localStorage.setItem(`pt_misure_${atletaId}`, JSON.stringify(arr)); } catch {}
}
function calcEta(dataNascita) {
  if(!dataNascita) return null;
  const d = new Date(dataNascita+"T12:00");
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

// Misurazioni demo per atleta id=0 (precaricare se non esistono)
const DEMO_MISURE_0 = [
  { data:fmtDate(addDays(today,-56)), peso:"82", vita:"92", fianchi:"", petto:"", braccio:"", grassoPerc:"", fcRiposo:"72" },
  { data:fmtDate(addDays(today,-42)), peso:"80", vita:"90", fianchi:"", petto:"", braccio:"", grassoPerc:"", fcRiposo:"70" },
  { data:fmtDate(addDays(today,-28)), peso:"78.5", vita:"88", fianchi:"", petto:"", braccio:"", grassoPerc:"", fcRiposo:"68" },
  { data:fmtDate(addDays(today,-14)), peso:"77", vita:"86", fianchi:"", petto:"", braccio:"", grassoPerc:"", fcRiposo:"67" },
  { data:fmtDate(addDays(today,-3)),  peso:"75.5", vita:"84", fianchi:"", petto:"", braccio:"", grassoPerc:"", fcRiposo:"65" },
];

// Helper: data YYYY-MM-DD → stringa italiana breve (es. "lun 18 mag")
function fmtDateShort(dateStr) {
  return new Date(dateStr+"T12:00").toLocaleDateString("it-IT",{weekday:"short",day:"numeric",month:"short"});
}
// Helper: data YYYY-MM-DD → stringa italiana lunga (es. "lunedì 18 maggio 2026")
function fmtDateLong(dateStr) {
  return new Date(dateStr+"T12:00").toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
}

function AtletaView({user, onLogout}) {
  const todayStr = fmtDate(new Date());

  // Tab: "scheda" | "progressi"
  const [atlView, setAtlView] = useState("scheda");

  // Scheda
  const [scheda, setScheda] = useState(null);
  const [activeDay, setActiveDay] = useState(null);

  // Navigazione giorni
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const isToday = selectedDate === todayStr;

  // Pesi e stato salvataggio
  const [pesi, setPesi] = useState({});
  const [saved, setSaved] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // Stats sessioni (si aggiorna a ogni save)
  const [statsVer, setStatsVer] = useState(0);

  // PDF lato atleta
  const [pdfStateAtleta, setPdfStateAtleta] = useState(null);

  // Reset demo dialog
  const [showReset, setShowReset] = useState(false);
  const logoClickRef = useRef(0);
  const handleLogoClick = () => {
    const now = Date.now();
    if(now - logoClickRef.current <= 400) setShowReset(true);
    logoClickRef.current = now;
  };

  // Appuntamenti dal calendario PT
  const [calEvents, setCalEvents] = useState([]);
  const [apptExpanded, setApptExpanded] = useState(false);

  // Carica scheda
  useEffect(()=>{
    try {
      const raw = localStorage.getItem("pt_scheda_0");
      if(raw) {
        const s = JSON.parse(raw);
        setScheda(s);
        const giorni = Object.keys(s.giorni);
        setActiveDay(giorni[0]);
      }
    } catch {}
  },[]);

  // Carica appuntamenti condivisi al mount
  useEffect(()=>{
    try {
      const raw = localStorage.getItem("pt_calendar_shared");
      if(raw) setCalEvents(JSON.parse(raw));
    } catch {}
  },[]);

  // Carica pesi per il giorno scheda + data selezionata
  useEffect(()=>{
    if(!activeDay) return;
    const sessions = loadSessions();
    const sess = sessions.find(s=>s.date===selectedDate&&s.day===activeDay);
    setPesi(sess?sess.weights:{});
    setSaved(!!sess);
    setJustSaved(false);
  },[activeDay, selectedDate]);

  // Navigazione date
  const prevDate = ()=>{
    const d = new Date(selectedDate+"T12:00");
    d.setDate(d.getDate()-1);
    setSelectedDate(fmtDate(d));
  };
  const nextDate = ()=>{
    if(isToday) return;
    const d = new Date(selectedDate+"T12:00");
    d.setDate(d.getDate()+1);
    setSelectedDate(fmtDate(d));
  };

  // Salvataggio sessione
  const handleSave = ()=>{
    const sessions = loadSessions().filter(s=>!(s.date===selectedDate&&s.day===activeDay));
    sessions.push({date:selectedDate, day:activeDay, weights:pesi});
    saveSessions(sessions);
    setSaved(true);
    setJustSaved(true);
    setStatsVer(v=>v+1);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(()=>setJustSaved(false), 2500);
  };

  // PDF scheda lato atleta
  const handlePDFAtleta = async () => {
    if(!scheda) return;
    setPdfStateAtleta({progress:0,label:"Preparazione…"});
    try {
      await buildPDF({
        nome: scheda.nome||"",
        cognome: scheda.cognome||"",
        obiettivo: scheda.obiettivo||"",
        livello: scheda.livello||"",
        giorni: scheda.giorni,
        onProgress:(p,l)=>setPdfStateAtleta({progress:p,label:l})
      });
    } catch(e){console.error(e);}
    finally{setPdfStateAtleta(null);}
  };

  // Statistiche sessioni (si ricalcola dopo ogni save grazie a statsVer)
  const _allSessions = loadSessions();
  const sessionTotal = _allSessions.length;
  const latestSessionDate = _allSessions.length > 0
    ? [..._allSessions].sort((a,b)=>b.date.localeCompare(a.date))[0].date
    : null;
  const _sessionDates = new Set(_allSessions.map(s=>s.date));
  let sessionStreak = 0;
  if(_sessionDates.has(todayStr)) {
    const _sd = new Date(todayStr+"T12:00");
    while(_sessionDates.has(fmtDate(_sd))){ sessionStreak++; _sd.setDate(_sd.getDate()-1); }
  }

  // Appuntamenti futuri filtrati per nome atleta (partial match, case-insensitive)
  const userNameLower = (user.name||"").toLowerCase();
  const futureAppts = calEvents
    .filter(e=>e.date>=todayStr && (e.clientName||"").toLowerCase().includes(userNameLower))
    .sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time));
  const visibleAppts = apptExpanded ? futureAppts : futureAppts.slice(0,3);

  const logo = ["PT","Studio"];

  // ── Scheda non assegnata ──
  if(!scheda) return (
    <div style={{minHeight:"100vh",background:"var(--bg)"}}>
      {showReset&&<ResetDemoDialog onClose={()=>setShowReset(false)}/>}
      <div className="cliente-header">
        <div className="sidebar-logo" style={{marginBottom:0,cursor:"default",userSelect:"none"}} onClick={handleLogoClick}>{logo[0]}<span style={{color:"var(--text)"}}>{logo[1]}</span></div>
        <div style={{fontSize:13,fontWeight:600,color:"var(--muted)"}}>{user.name}</div>
        <button className="sidebar-logout" style={{width:"auto",marginTop:0,padding:"8px 14px"}} onClick={onLogout}>↩ Esci</button>
      </div>
      <div className="atleta-stats-bar">
        <span className="atleta-stats-item">💪 <strong>{sessionTotal}</strong> sessioni completate</span>
        <span className="atleta-stats-item">📅 Ultima: <strong>{latestSessionDate?fmtDateShort(latestSessionDate):"—"}</strong></span>
        <span className="atleta-stats-item">🔥 <strong>{sessionStreak}</strong> giorni consecutivi</span>
      </div>
      <div className="atleta-tab-nav">
        <button className={`atleta-tab${atlView==="scheda"?" active":""}`} onClick={()=>setAtlView("scheda")}>📋 Scheda</button>
        <button className={`atleta-tab${atlView==="progressi"?" active":""}`} onClick={()=>setAtlView("progressi")}>📈 Progressi</button>
      </div>
      <div className="cliente-body" style={{paddingTop:20}}>
        {/* Appuntamenti anche senza scheda */}
        <div className="appt-section" style={{marginBottom:20}}>
          <div className="appt-section-title">📅 Prossimi appuntamenti</div>
          {futureAppts.length===0 ? (
            <div style={{fontSize:13,color:"var(--muted)",padding:"4px 0"}}>Nessun appuntamento programmato</div>
          ) : (
            <>
              {visibleAppts.map((ev,i)=>(
                <div className="appt-card" key={ev.id||i}>
                  <div className="appt-date-label">{fmtDateShort(ev.date)}</div>
                  <div className="appt-time">{ev.time}</div>
                  <div className="appt-name">{ev.clientName}</div>
                  <div className="appt-type-badge" style={{background:typeBg(ev.type),color:typeColor(ev.type)}}>{ev.type}</div>
                </div>
              ))}
              {futureAppts.length>3&&(
                <button className="appt-expand-btn" onClick={()=>setApptExpanded(v=>!v)}>
                  {apptExpanded?"Mostra meno ▲":`Vedi tutti (${futureAppts.length}) ▼`}
                </button>
              )}
            </>
          )}
        </div>
        {/* Nessuna scheda */}
        <div style={{textAlign:"center",paddingTop:28}}>
          <div style={{fontSize:48,marginBottom:16}}>📋</div>
          <div style={{fontSize:18,fontWeight:600,color:"var(--text)",marginBottom:8}}>Nessuna scheda assegnata</div>
          <div style={{fontSize:14,color:"var(--muted)",lineHeight:1.6}}>Il tuo PT deve creare e assegnare una scheda dal Builder.</div>
        </div>
      </div>
    </div>
  );

  const giorni = Object.keys(scheda.giorni);
  const esercizi = scheda.giorni[activeDay]||[];
  const dayNamesScheda = scheda.dayNames||{};
  const activeDayLabel = dayNamesScheda[activeDay] || `Giorno ${activeDay}`;

  const saveBtnLabel = isToday
    ? (saved ? `Aggiorna sessione — ${activeDayLabel}` : `Salva sessione — ${activeDayLabel}`)
    : `Aggiorna sessione del ${fmtDateShort(selectedDate)} — ${activeDayLabel}`;

  return (
    <div style={{minHeight:"100vh",background:"var(--bg)"}}>
      {showReset&&<ResetDemoDialog onClose={()=>setShowReset(false)}/>}
      <div className="cliente-header">
        <div className="sidebar-logo" style={{marginBottom:0,cursor:"default",userSelect:"none"}} onClick={handleLogoClick}>{logo[0]}<span style={{color:"var(--text)"}}>{logo[1]}</span></div>
        <div style={{fontSize:13,fontWeight:600,color:"var(--muted)"}}>{user.name}</div>
        <button className="sidebar-logout" style={{width:"auto",marginTop:0,padding:"8px 14px"}} onClick={onLogout}>↩ Esci</button>
      </div>

      {/* ── STATS BAR ── */}
      <div className="atleta-stats-bar">
        <span className="atleta-stats-item">💪 <strong>{sessionTotal}</strong> sessioni completate</span>
        <span className="atleta-stats-item">📅 Ultima: <strong>{latestSessionDate?fmtDateShort(latestSessionDate):"—"}</strong></span>
        <span className="atleta-stats-item">🔥 <strong>{sessionStreak}</strong> giorni consecutivi</span>
      </div>

      {/* ── TAB NAV ── */}
      <div className="atleta-tab-nav">
        <button className={`atleta-tab${atlView==="scheda"?" active":""}`} onClick={()=>setAtlView("scheda")}>📋 Scheda</button>
        <button className={`atleta-tab${atlView==="progressi"?" active":""}`} onClick={()=>setAtlView("progressi")}>📈 Progressi</button>
      </div>

      {/* ── PROGRESSI VIEW ── */}
      {atlView==="progressi"&&<AtletaProgressi scheda={scheda}/>}

      {/* ── SCHEDA VIEW ── */}
      {atlView==="scheda"&&<div className="cliente-body">

        {/* ── PROSSIMI APPUNTAMENTI ── */}
        <div className="appt-section">
          <div className="appt-section-title">📅 Prossimi appuntamenti</div>
          {futureAppts.length===0 ? (
            <div style={{fontSize:13,color:"var(--muted)",padding:"4px 0"}}>Nessun appuntamento programmato</div>
          ) : (
            <>
              {visibleAppts.map((ev,i)=>(
                <div className="appt-card" key={ev.id||i}>
                  <div className="appt-date-label">{fmtDateShort(ev.date)}</div>
                  <div className="appt-time">{ev.time}</div>
                  <div className="appt-name">{ev.clientName}</div>
                  <div
                    className="appt-type-badge"
                    style={{background:typeBg(ev.type),color:typeColor(ev.type)}}
                  >{ev.type}</div>
                </div>
              ))}
              {futureAppts.length>3&&(
                <button className="appt-expand-btn" onClick={()=>setApptExpanded(v=>!v)}>
                  {apptExpanded?"Mostra meno ▲":`Vedi tutti (${futureAppts.length}) ▼`}
                </button>
              )}
            </>
          )}
        </div>

        {/* ── SCHEDA INFO ── */}
        <div className="scheda-info-card">
          <div className="scheda-info-title">{scheda.nome||`Scheda ${scheda.cognome||""}`}</div>
          <div className="scheda-info-meta">
            <span>👤 PT: <strong style={{color:"var(--text)"}}>{scheda.pt||"Personal Trainer Demo"}</strong></span>
            {scheda.obiettivo&&<span>🎯 {scheda.obiettivo}</span>}
            {scheda.livello&&<span>📊 {scheda.livello}</span>}
            <span>📅 Assegnata il {scheda.assegnataIl||"—"}</span>
          </div>
        </div>

        {/* ── TAB GIORNI SCHEDA + SCARICA PDF ── */}
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20,flexWrap:"wrap"}}>
          <div className="day-tabs">
            {giorni.map(d=>(
              <button key={d} className={`day-tab${activeDay===d?" active":""}`} onClick={()=>setActiveDay(d)}>
                {dayNamesScheda[d]||`Giorno ${d}`}
              </button>
            ))}
          </div>
          {!pdfStateAtleta&&(
            <button className="btn-ghost" style={{fontSize:12,padding:"7px 14px"}} onClick={handlePDFAtleta}>
              ⬇ Scarica PDF
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

        {/* ── NAVIGAZIONE DATE ── */}
        <div className={`date-nav${!isToday?" past":""}`}>
          <button className="date-nav-btn" onClick={prevDate} title="Giorno precedente">‹</button>
          <div className="date-nav-label">
            {isToday?"Oggi — "+fmtDateLong(selectedDate):fmtDateLong(selectedDate)}
          </div>
          <button className="date-nav-btn" onClick={nextDate} disabled={isToday} title="Giorno successivo">›</button>
        </div>

        {/* ── BANNER STATO SESSIONE ── */}
        {justSaved&&(
          <div className="session-saved-banner" style={{background:"rgba(71,255,232,.15)",borderColor:"rgba(71,255,232,.4)",fontWeight:700}}>
            ✓ Sessione salvata con successo!
          </div>
        )}
        {!justSaved&&saved&&(
          <div className="session-saved-banner">
            {isToday
              ? "↩ Sessione di oggi già salvata — puoi aggiornare i pesi e risalvare"
              : `↩ Sessione del ${fmtDateShort(selectedDate)} già salvata — puoi aggiornare i pesi e risalvare`
            }
          </div>
        )}

        {/* ── ESERCIZI ── */}
        {esercizi.map(ex=>(
          <AtletaExCard
            key={ex.id}
            ex={ex}
            peso={pesi[ex.id]}
            onPesoChange={val=>setPesi(p=>({...p,[ex.id]:val}))}
          />
        ))}

        <button className="save-session-btn" onClick={handleSave}>
          {saveBtnLabel}
        </button>
      </div>}
    </div>
  );
}

// ── APP ROOT ──────────────────────────────────────────────────────────────────
export default function App() {
  const [phase,setPhase]=useState("login");
  const [user,setUser]=useState(null);
  const [view,setView]=useState("dashboard");
  const [builderPreload,setBuilderPreload]=useState(null);

  useEffect(()=>{ if(window.location.pathname==="/admin"&&user?.role==="admin") setView("admin"); },[user]);

  const handleLogin=(acc)=>{
    if(acc.theme) applyTheme(acc.theme);
    setUser(acc);
    setPhase("welcome");
    if(acc.role==="admin") setView("dashboard");
  };
  const handleWelcomeDone=()=>{ setPhase("app"); };
  const handleLogout=()=>{ resetTheme(); setUser(null); setPhase("login"); setView("dashboard"); setBuilderPreload(null); };

  return (
    <>
      <style>{FONTS+CSS}</style>
      {phase==="login"&&<LoginScreen onLogin={handleLogin}/>}
      {phase==="welcome"&&<WelcomeScreen user={user} onDone={handleWelcomeDone}/>}
      {phase==="app"&&user?.role==="atleta"&&(
        <AtletaView user={user} onLogout={handleLogout}/>
      )}
      {phase==="app"&&user?.role!=="atleta"&&(
        <div className="app-wrap">
          <Sidebar user={user} view={view} setView={setView} onLogout={handleLogout}/>
          <div className="content">
            {view==="dashboard"&&<Dashboard user={user} setView={setView}/>}
            {view==="library"&&user?.role!=="admin"&&<Library setView={setView}/>}
            {view==="builder"&&user?.role!=="admin"&&<Builder setView={setView} preload={builderPreload} setPreload={setBuilderPreload}/>}
            {view==="atleti"&&user?.role!=="admin"&&<Atleti setView={setView} setBuilderPreload={setBuilderPreload}/>}
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
