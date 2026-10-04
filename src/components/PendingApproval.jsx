import { useTranslation } from "react-i18next";

export default function PendingApproval({ user, onLogout }) {
  const { t } = useTranslation();
  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--bg)",padding:24}}>
      <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:18,padding:"44px 36px",maxWidth:400,width:"100%",textAlign:"center"}}>
        <div style={{fontSize:52,marginBottom:20}}>⏳</div>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,letterSpacing:2,color:"var(--text)",marginBottom:10}}>
          {t("pending.titolo")}
        </div>
        <div style={{fontSize:14,color:"var(--muted)",lineHeight:1.75,marginBottom:28}}>
          {t("pending.testo1")}<br/>
          {t("pending.testo2")}
        </div>
        {user?.email&&(
          <div style={{fontSize:13,fontWeight:600,color:"var(--accent)",background:"rgba(232,255,71,.07)",border:"1px solid rgba(232,255,71,.15)",borderRadius:8,padding:"9px 14px",marginBottom:28}}>
            {user.email}
          </div>
        )}
        <button className="btn-ghost" onClick={onLogout} style={{width:"100%",fontSize:14,padding:11}}>
          ↩ {t("pending.torna")}
        </button>
      </div>
    </div>
  );
}
