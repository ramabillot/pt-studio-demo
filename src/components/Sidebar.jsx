import React from "react";

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
];

const NAV_ACCOUNT = { id:"account", icon:"⚙", label:"Account" };

export function Sidebar({user,view,setView,onLogout}) {
  const baseItems = (user.role==="admin" || user.is_admin) ? NAV_ADMIN : NAV_TRAINER;
  const items = [...baseItems, NAV_ACCOUNT];
  return (
    <div className="sidebar">
      <div className="sidebar-logo" style={{cursor:"default",userSelect:"none"}}>PT<span>Studio</span></div>
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

export function MobileNav({user,view,setView,onLogout}) {
  const baseItems = (user.role==="admin" || user.is_admin) ? NAV_ADMIN : NAV_TRAINER;
  const items = [...baseItems, NAV_ACCOUNT];
  return (
    <nav className="mobile-nav">
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

export function BackBtn({setView}) {
  return (
    <button className="back-btn" onClick={()=>setView("dashboard")}>
      ← Dashboard
    </button>
  );
}
