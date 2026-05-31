import React, { useState, useEffect } from "react";
import { applyTheme, resetTheme } from "./utils.js";
import { supabase } from "./supabase.js";
import LoginScreen from "./components/LoginScreen.jsx";
import WelcomeScreen from "./components/WelcomeScreen.jsx";
import PendingApproval from "./components/PendingApproval.jsx";
import { Sidebar, MobileNav } from "./components/Sidebar.jsx";
import Dashboard from "./components/Dashboard.jsx";
import Library from "./components/Library.jsx";
import Builder from "./components/Builder.jsx";
import Atleti from "./components/Atleti.jsx";
import { CalendarView, AdminCalendar } from "./components/Calendar.jsx";
import AdminStats from "./components/AdminStats.jsx";
import AdminPT from "./components/AdminPT.jsx";
import AdminPanel from "./components/AdminPanel.jsx";
import AtletaView from "./components/AtletaView.jsx";

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
    .stats-grid,.quick-nav { grid-template-columns:1fr 1fr; }
    .stat-card { padding:14px 16px; }
    .stat-val { font-size:24px; letter-spacing:.5px; }
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

// ── APP ROOT ──────────────────────────────────────────────────────────────────
export default function App() {
  const [phase,setPhase]=useState("loading");
  const [user,setUser]=useState(null);
  const [view,setView]=useState("dashboard");
  const [builderPreload,setBuilderPreload]=useState(null);

  // Session restore + auth listener.
  // INITIAL_SESSION fires after the auth token is fully set — queries here are authenticated.
  // getSession() inside .then() is NOT reliable for this because the JWT may not yet be
  // propagated to the query client at the time the callback runs, causing RLS to deny the
  // profiles query and silently returning null (is_approved defaults to false → "pending").
  useEffect(()=>{
    const { data:{ subscription } } = supabase.auth.onAuthStateChange(async (event, session)=>{
      if(event==="INITIAL_SESSION"){
        if(session?.user){
          const { data:profile, error:profileErr } = await supabase
            .from("profiles").select("*").eq("id",session.user.id).maybeSingle();
          console.log("[profile restore] user.id:", session.user.id, "| profile:", profile, "| error:", profileErr);
          if(profileErr || !profile){ setPhase("login"); return; }
          const acc = buildUserObjApp(session.user, profile);
          if(acc.theme) applyTheme(acc.theme);
          setUser(acc);
          setPhase(acc.is_approved ? "app" : "pending");
        } else {
          setPhase("login");
        }
      } else if(event==="SIGNED_OUT"){
        resetTheme(); setUser(null); setPhase("login"); setView("dashboard"); setBuilderPreload(null);
      }
    });
    return ()=>subscription.unsubscribe();
  },[]);

  useEffect(()=>{ if(window.location.pathname==="/admin"&&user?.role==="admin") setView("admin"); },[user]);

  const handleLogin=(acc)=>{
    if(acc.theme) applyTheme(acc.theme);
    setUser(acc);
    if(acc.isSupabase && !acc.is_approved){ setPhase("pending"); return; }
    setPhase("welcome");
    if(acc.role==="admin") setView("dashboard");
  };
  const handleWelcomeDone=()=>{ setPhase("app"); };
  const handleLogout=async()=>{
    if(user?.isSupabase) await supabase.auth.signOut();
    resetTheme(); setUser(null); setPhase("login"); setView("dashboard"); setBuilderPreload(null);
  };

  // Fallback: is_admin flag è l'autorità, role="admin" è il percorso normale.
  // Se il profilo viene letto con is_admin=true ma role finisce "trainer" per un
  // problema di lettura, is_admin garantisce comunque l'accesso alle viste admin.
  const isAdmin = user?.role==="admin" || !!user?.is_admin;

  return (
    <>
      <style>{FONTS+CSS}</style>
      {phase==="loading"&&null}
      {phase==="login"&&<LoginScreen onLogin={handleLogin}/>}
      {phase==="welcome"&&<WelcomeScreen user={user} onDone={handleWelcomeDone}/>}
      {phase==="pending"&&<PendingApproval user={user} onLogout={handleLogout}/>}
      {phase==="app"&&user?.role==="atleta"&&(
        <AtletaView user={user} onLogout={handleLogout}/>
      )}
      {phase==="app"&&user?.role!=="atleta"&&(
        <div className="app-wrap">
          <Sidebar user={user} view={view} setView={setView} onLogout={handleLogout}/>
          <div className="content">
            {view==="dashboard"&&<Dashboard user={user} setView={setView}/>}
            {view==="library"&&!isAdmin&&<Library setView={setView}/>}
            {view==="builder"&&!isAdmin&&<Builder setView={setView} preload={builderPreload} setPreload={setBuilderPreload} user={user}/>}
            {view==="atleti"&&!isAdmin&&<Atleti setView={setView} setBuilderPreload={setBuilderPreload} user={user}/>}
            {view==="calendar"&&!isAdmin&&<CalendarView setView={setView} user={user}/>}
            {view==="admin-stats"&&isAdmin&&<AdminStats setView={setView} user={user}/>}
            {view==="admin-pt"&&isAdmin&&(user?.isSupabase?<AdminPanel setView={setView}/>:<AdminPT setView={setView}/>)}
            {view==="admin-calendar"&&isAdmin&&<AdminCalendar setView={setView}/>}
          </div>
          <MobileNav user={user} view={view} setView={setView} onLogout={handleLogout}/>
        </div>
      )}
    </>
  );
}

function buildUserObjApp(supaUser, profile) {
  return {
    supabaseId: supaUser.id,
    email: supaUser.email,
    name: profile ? ((`${profile.nome || ""} ${profile.cognome || ""}`).trim() || supaUser.email) : supaUser.email,
    nome: profile?.nome || "",
    cognome: profile?.cognome || "",
    role: profile?.is_admin ? "admin" : "trainer",
    is_approved: profile?.is_approved ?? false,
    is_admin: profile?.is_admin ?? false,
    piano: profile?.piano ?? "base",
    max_atleti: profile?.max_atleti ?? 5,
    isSupabase: true,
    theme: { accent:"#e8ff47", accentFg:"#07070d", logo:["PT","Studio"] },
  };
}
