import { useTranslation } from "react-i18next";

const NAV_TRAINER = [
  { id:"dashboard", icon:"⚡", label:"nav.dashboard" },
  { id:"library",   icon:"📚", label:"nav.libreria" },
  { id:"builder",   icon:"📋", label:"nav.builder" },
  { id:"atleti",    icon:"👥", label:"nav.atleti" },
  { id:"calendar",  icon:"📅", label:"nav.calendario" },
];

const NAV_ADMIN = [
  { id:"dashboard",      icon:"⚡",  label:"nav.dashboard" },
  { id:"admin-stats",    icon:"📊",  label:"nav.statistiche" },
  { id:"admin-pt",       icon:"👥",  label:"nav.mieiPT" },
];

const NAV_ACCOUNT = { id:"account", icon:"⚙", label:"nav.account" };

export function Sidebar({user,view,setView,onLogout}) {
  const { t } = useTranslation();
  const baseItems = (user.role==="admin" || user.is_admin) ? NAV_ADMIN : NAV_TRAINER;
  const items = [...baseItems, NAV_ACCOUNT];
  return (
    <div className="sidebar">
      <div className="sidebar-logo" style={{cursor:"default",userSelect:"none"}}>PT<span>Studio</span></div>
      <div className="sidebar-user">
        <div className="sidebar-username">{user.name}</div>
        <div className="sidebar-role">{user.role==="admin"?t("nav.ruoloAdmin"):t("nav.ruoloPT")}</div>
      </div>
      <nav className="sidebar-nav">
        {items.map(item=>(
          <div key={item.id} className={`sidebar-item${view===item.id?" active":""}`} onClick={()=>setView(item.id)}>
            <span className="sidebar-icon">{item.icon}</span>{t(item.label)}
          </div>
        ))}
      </nav>
      <button className="sidebar-logout" onClick={onLogout}>
        <span className="sidebar-icon">↩</span>{t("comune.esci")}
      </button>
    </div>
  );
}

export function MobileNav({user,view,setView,onLogout}) {
  const { t } = useTranslation();
  const baseItems = (user.role==="admin" || user.is_admin) ? NAV_ADMIN : NAV_TRAINER;
  const items = [...baseItems, NAV_ACCOUNT];
  return (
    <nav className="mobile-nav">
      <div className="mobile-nav-logout-bar">
        <button className="mobile-nav-logout-btn" onClick={onLogout}>
          ↩ {t("comune.esci")}
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
            {t(item.label)}
          </button>
        ))}
      </div>
    </nav>
  );
}

export function BackBtn({setView}) {
  const { t } = useTranslation();
  return (
    <button className="back-btn" onClick={()=>setView("dashboard")}>
      ← {t("nav.dashboard")}
    </button>
  );
}
