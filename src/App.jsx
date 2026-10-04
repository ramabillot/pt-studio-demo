import { useState, useEffect, lazy, Suspense } from "react";
import { supabase } from "./supabase.js";
import { riprendiSessioneAtleta, logoutAtleta, loginConCodice, creaCodiceInstalla } from "./api/atleta.js";
import { isIOSSafari, isStandalone } from "./lib/installa.js";
import LoginScreen from "./components/LoginScreen.jsx";
import WelcomeScreen from "./components/WelcomeScreen.jsx";
import PendingApproval from "./components/PendingApproval.jsx";
import { Sidebar, MobileNav } from "./components/Sidebar.jsx";
import SegnalaBug from "./components/SegnalaBug.jsx";
import AggiornamentoApp from "./components/AggiornamentoApp.jsx";
import InvitoInstalla from "./components/InvitoInstalla.jsx";
import { APP } from "./lib/app.js";

// Viste caricate solo quando servono: l'atleta non scarica il codice del PT e viceversa
const Dashboard       = lazy(()=>import("./components/Dashboard.jsx"));
const Library         = lazy(()=>import("./components/Library.jsx"));
const Builder         = lazy(()=>import("./components/Builder.jsx"));
const Atleti          = lazy(()=>import("./components/Atleti.jsx"));
const CalendarView    = lazy(()=>import("./components/Calendar.jsx").then(m=>({default:m.CalendarView})));
const AdminStats      = lazy(()=>import("./components/AdminStats.jsx"));
const AdminPanel      = lazy(()=>import("./components/AdminPanel.jsx"));
const AtletaView      = lazy(()=>import("./components/AtletaView.jsx"));
const AccountSettings = lazy(()=>import("./components/AccountSettings.jsx"));

import "./styles/app.css";

// ── APP ROOT ──────────────────────────────────────────────────────────────────
export default function App() {
  const [phase,setPhase]=useState("loading");
  const [user,setUser]=useState(null);
  const [view,setView]=useState("dashboard");
  const [builderPreload,setBuilderPreload]=useState(null);

  // Ripristino sessione all'apertura (ogni app guarda SOLO la propria sessione):
  //  · app /atleta/ → token salvato sul telefono (atleta_me); così non deve rifare il login
  //  · app /pt/     → sessione Supabase Auth (evento INITIAL_SESSION, JWT già propagato)
  useEffect(()=>{
    if(APP==="atleta"){
      let vivo=true;
      (async()=>{
        const codice = new URLSearchParams(window.location.search).get("c");
        let atleta = await riprendiSessioneAtleta();
        // Primo avvio dall'icona su iPhone: niente token (dati separati da Safari) → codice monouso
        if(!atleta && codice) atleta = await loginConCodice(codice);
        if(!vivo) return;
        if(atleta && !codice && await preparaIconaIPhone(atleta)) return;   // la pagina si ricarica
        if(atleta){ setUser(atleta); setPhase("app"); } else setPhase("login");
      })();
      return ()=>{ vivo=false; };
    }
    // Niente chiamate a Supabase DENTRO il callback: supabase-js le esegue mentre tiene il
    // blocco della sessione → login successivi possono restare appesi. Si rimandano fuori.
    const caricaProfilo = async (session)=>{
      const { data:profile, error:profileErr } = await supabase
        .from("profiles").select("*").eq("id",session.user.id).maybeSingle();
      if(profileErr || !profile){ setPhase("login"); return; }
      const acc = buildUserObjApp(session.user, profile);
      setUser(acc);
      setPhase(acc.is_approved ? "app" : "pending");
    };
    const { data:{ subscription } } = supabase.auth.onAuthStateChange((event, session)=>{
      if(event==="INITIAL_SESSION"){
        if(session?.user) setTimeout(()=>caricaProfilo(session),0);
        else setPhase("login");
      } else if(event==="SIGNED_OUT"){
        setUser(null); setPhase("login"); setView("dashboard"); setBuilderPreload(null);
      }
    });
    return ()=>subscription.unsubscribe();
  },[]);

  const handleLogin=async(acc)=>{
    if(acc.role==="atleta" && await preparaIconaIPhone(acc)) return;   // la pagina si ricarica
    setUser(acc);
    if(acc.role!=="atleta" && !acc.is_approved){ setPhase("pending"); return; }
    setPhase("welcome");
    if(acc.role==="admin") setView("dashboard");
  };
  const handleWelcomeDone=()=>{ setPhase("app"); };
  const handleLogout=async()=>{
    // Logout solo dell'app aperta: l'altra app sullo stesso telefono resta dentro
    if(APP==="atleta") await logoutAtleta();
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
      {phase==="login"&&<LoginScreen ruolo={APP} onLogin={handleLogin}/>}
      {phase==="welcome"&&<WelcomeScreen user={user} onDone={handleWelcomeDone}/>}
      {phase==="pending"&&<PendingApproval user={user} onLogout={handleLogout}/>}
      {phase==="app"&&user?.role==="atleta"&&(
        <Suspense fallback={null}><AtletaView user={user} onLogout={handleLogout}/></Suspense>
      )}
      {phase==="app"&&user?.role!=="atleta"&&(
        <div className="app-wrap">
          <Sidebar user={user} view={view} setView={setView} onLogout={handleLogout}/>
          <div className="content"><Suspense fallback={null}>
            {view==="dashboard"&&<Dashboard user={user} setView={setView}/>}
            {view==="library"&&!isAdmin&&<Library setView={setView} user={user}/>}
            {view==="builder"&&!isAdmin&&<Builder setView={setView} preload={builderPreload} setPreload={setBuilderPreload} user={user}/>}
            {view==="atleti"&&!isAdmin&&<Atleti setView={setView} setBuilderPreload={setBuilderPreload} user={user}/>}
            {view==="calendar"&&!isAdmin&&<CalendarView setView={setView} user={user}/>}
            {view==="admin-stats"&&isAdmin&&<AdminStats setView={setView} user={user}/>}
            {view==="admin-pt"&&isAdmin&&<AdminPanel setView={setView}/>}
            {view==="account"&&<AccountSettings setView={setView} user={user}/>}
          </Suspense></div>
          <MobileNav user={user} view={view} setView={setView} onLogout={handleLogout}/>
        </div>
      )}
      {phase==="app"&&<SegnalaBug user={user} view={user?.role==="atleta"?null:view}/>}
      {phase==="app"&&<InvitoInstalla/>}
      <AggiornamentoApp/>
    </>
  );
}

// iPhone, Safari, app non ancora installata: l'icona sulla Home non vedrà il login fatto qui.
// Si crea un codice monouso e si ricarica la pagina con ?u=…&c=… : l'inline script di
// atleta/index.html lo mette nel manifest → start_url dell'icona → primo avvio già dentro.
// true = ricarica avviata.
async function preparaIconaIPhone(atleta){
  if(!isIOSSafari() || isStandalone()) return false;
  try {
    const codice = await creaCodiceInstalla();
    if(!codice) return false;
    window.location.replace(`/atleta/?u=${encodeURIComponent(atleta.username)}&c=${codice}`);
    return true;
  } catch { return false; }
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
