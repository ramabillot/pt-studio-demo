import { useState, useEffect } from "react";
import { supabase } from "./supabase.js";
import { riprendiSessioneAtleta, logoutAtleta } from "./api/atleta.js";
import LoginScreen from "./components/LoginScreen.jsx";
import WelcomeScreen from "./components/WelcomeScreen.jsx";
import PendingApproval from "./components/PendingApproval.jsx";
import { Sidebar, MobileNav } from "./components/Sidebar.jsx";
import Dashboard from "./components/Dashboard.jsx";
import Library from "./components/Library.jsx";
import Builder from "./components/Builder.jsx";
import Atleti from "./components/Atleti.jsx";
import { CalendarView } from "./components/Calendar.jsx";
import AdminStats from "./components/AdminStats.jsx";
import AdminPanel from "./components/AdminPanel.jsx";
import AtletaView from "./components/AtletaView.jsx";
import AccountSettings from "./components/AccountSettings.jsx";

import "./styles/app.css";

// ── APP ROOT ──────────────────────────────────────────────────────────────────
export default function App() {
  const [phase,setPhase]=useState("loading");
  const [user,setUser]=useState(null);
  const [view,setView]=useState("dashboard");
  const [builderPreload,setBuilderPreload]=useState(null);

  // Ripristino sessione all'apertura:
  //  · PT/admin → sessione Supabase Auth (evento INITIAL_SESSION, JWT già propagato)
  //  · atleta   → token salvato sul telefono (atleta_me); così non deve rifare il login
  useEffect(()=>{
    const { data:{ subscription } } = supabase.auth.onAuthStateChange(async (event, session)=>{
      if(event==="INITIAL_SESSION"){
        if(session?.user){
          const { data:profile, error:profileErr } = await supabase
            .from("profiles").select("*").eq("id",session.user.id).maybeSingle();
          if(profileErr || !profile){ setPhase("login"); return; }
          const acc = buildUserObjApp(session.user, profile);
          setUser(acc);
          setPhase(acc.is_approved ? "app" : "pending");
          return;
        }
        const atleta = await riprendiSessioneAtleta();
        if(atleta){ setUser(atleta); setPhase("app"); return; }
        setPhase("login");
      } else if(event==="SIGNED_OUT"){
        setUser(null); setPhase("login"); setView("dashboard"); setBuilderPreload(null);
      }
    });
    return ()=>subscription.unsubscribe();
  },[]);

  useEffect(()=>{ if(window.location.pathname==="/admin"&&user?.role==="admin") setView("admin"); },[user]);

  const handleLogin=(acc)=>{
    setUser(acc);
    if(acc.role!=="atleta" && !acc.is_approved){ setPhase("pending"); return; }
    setPhase("welcome");
    if(acc.role==="admin") setView("dashboard");
  };
  const handleWelcomeDone=()=>{ setPhase("app"); };
  const handleLogout=async()=>{
    if(user?.role==="atleta") await logoutAtleta();
    else await supabase.auth.signOut();
    setUser(null); setPhase("login"); setView("dashboard"); setBuilderPreload(null);
  };

  // Fallback: is_admin flag è l'autorità, role="admin" è il percorso normale.
  // Se il profilo viene letto con is_admin=true ma role finisce "trainer" per un
  // problema di lettura, is_admin garantisce comunque l'accesso alle viste admin.
  const isAdmin = user?.role==="admin" || !!user?.is_admin;

  return (
    <>
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
            {view==="library"&&!isAdmin&&<Library setView={setView} user={user}/>}
            {view==="builder"&&!isAdmin&&<Builder setView={setView} preload={builderPreload} setPreload={setBuilderPreload} user={user}/>}
            {view==="atleti"&&!isAdmin&&<Atleti setView={setView} setBuilderPreload={setBuilderPreload} user={user}/>}
            {view==="calendar"&&!isAdmin&&<CalendarView setView={setView} user={user}/>}
            {view==="admin-stats"&&isAdmin&&<AdminStats setView={setView} user={user}/>}
            {view==="admin-pt"&&isAdmin&&<AdminPanel setView={setView}/>}
            {view==="account"&&<AccountSettings setView={setView} user={user}/>}
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
  };
}
