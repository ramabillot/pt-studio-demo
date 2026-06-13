import React, { useState, useEffect } from "react";
import { supabase } from "../supabase.js";
import { BackBtn } from "./Sidebar.jsx";

const PIANI = ["base","medio","pro"];

export default function AdminPanel({ setView }) {
  const [pts, setPts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [err, setErr] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null); // {id, email, nome, cognome, isPending}
  const [deleteTyped, setDeleteTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState("");

  useEffect(() => { fetchPTs(); }, []);

  const fetchPTs = async () => {
    setLoading(true); setErr(null);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("is_admin", false)
      .order("created_at", { ascending: false });
    if (error) { console.error("[AdminPanel] fetchPTs:", error); setErr(error.message); }
    else setPts(data || []);
    setLoading(false);
  };

  const save = async (id, changes) => {
    setSaving(s => ({ ...s, [id]: true }));
    const { error } = await supabase.from("profiles").update(changes).eq("id", id);
    if (!error) setPts(prev => prev.map(p => p.id === id ? { ...p, ...changes } : p));
    setSaving(s => ({ ...s, [id]: false }));
  };

  const openDeleteModal = (pt) => {
    setDeleteModal({ id: pt.id, email: pt.email, nome: pt.nome, cognome: pt.cognome, isPending: !pt.is_approved });
    setDeleteTyped("");
    setDeleteErr("");
  };

  const confirmDelete = async () => {
    if (!deleteModal || deleteTyped !== deleteModal.email) return;
    setDeleting(true); setDeleteErr("");
    const { error } = await supabase.rpc("admin_delete_pt", { p_pt_id: deleteModal.id });
    if (error) {
      console.error("[deletePT]", error);
      setDeleteErr(error.message);
      setDeleting(false);
      return;
    }
    setPts(prev => prev.filter(p => p.id !== deleteModal.id));
    setDeleteModal(null);
    setDeleteTyped("");
    setDeleting(false);
  };

  const ptLabel = (pt) => [pt.nome, pt.cognome].filter(Boolean).join(" ") || pt.email;

  return (
    <div>
      <BackBtn setView={setView}/>
      <div className="page-head">
        <div className="page-title">PT Registrati</div>
        <div className="page-sub">{pts.length} personal trainer sulla piattaforma</div>
      </div>

      {loading&&(
        <div style={{color:"var(--muted)",fontSize:14,textAlign:"center",padding:"60px 0"}}>Caricamento…</div>
      )}
      {!loading&&err&&(
        <div style={{color:"var(--danger)",fontSize:14,textAlign:"center",padding:"60px 0"}}>Errore: {err}</div>
      )}
      {!loading&&!err&&pts.length===0&&(
        <div style={{color:"var(--muted)",fontSize:14,textAlign:"center",padding:"60px 0"}}>Nessun PT registrato ancora.</div>
      )}

      {!loading&&!err&&pts.map(pt=>(
        <div key={pt.id} style={{
          background:"var(--card)",border:"1px solid var(--border)",borderRadius:14,
          padding:"18px 20px",marginBottom:12,
          display:"flex",flexWrap:"wrap",gap:14,alignItems:"center"
        }}>
          {/* Identità */}
          <div style={{flex:1,minWidth:180}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
              <div style={{width:36,height:36,borderRadius:10,background:"var(--card2)",border:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"var(--accent)",flexShrink:0}}>
                {(pt.nome?.[0]||pt.email?.[0]||"?").toUpperCase()}
              </div>
              <div style={{minWidth:0}}>
                <div style={{fontSize:15,fontWeight:700,color:"var(--text)",lineHeight:1.2}}>
                  {pt.nome||""} {pt.cognome||""}
                  {!pt.nome&&!pt.cognome&&<span style={{color:"var(--muted)"}}>—</span>}
                </div>
                <div style={{fontSize:12,color:"var(--muted)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pt.email}</div>
              </div>
            </div>
            <div style={{fontSize:11,color:"var(--muted)"}}>
              Registrato il {new Date(pt.created_at).toLocaleDateString("it-IT",{day:"numeric",month:"long",year:"numeric"})}
            </div>
          </div>

          {/* Controlli */}
          <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
            {/* Piano */}
            <select
              value={pt.piano}
              onChange={e=>save(pt.id,{piano:e.target.value})}
              style={{background:"var(--card2)",border:"1px solid var(--border)",color:"var(--text)",fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:600,padding:"7px 12px",borderRadius:8,outline:"none",appearance:"none",cursor:"pointer"}}
            >
              {PIANI.map(p=><option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
            </select>

            {/* Max atleti */}
            <div style={{display:"flex",alignItems:"center",gap:6,background:"var(--card2)",border:"1px solid var(--border)",borderRadius:8,padding:"5px 12px"}}>
              <span style={{fontSize:11,color:"var(--muted)",fontWeight:600,textTransform:"uppercase",letterSpacing:.5,whiteSpace:"nowrap"}}>Max atleti</span>
              <input
                type="number" min={1} max={500}
                value={pt.max_atleti}
                onChange={e=>save(pt.id,{max_atleti:Number(e.target.value)})}
                style={{background:"transparent",border:"none",color:"var(--text)",fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:700,width:64,textAlign:"center",outline:"none"}}
              />
            </div>

            {/* Approva / Blocca */}
            <button
              onClick={()=>save(pt.id,{is_approved:!pt.is_approved})}
              disabled={!!saving[pt.id]}
              style={{
                background:pt.is_approved?"rgba(255,71,87,.1)":"rgba(71,255,232,.1)",
                border:`1px solid ${pt.is_approved?"rgba(255,71,87,.3)":"rgba(71,255,232,.3)"}`,
                color:pt.is_approved?"var(--danger)":"var(--accent2)",
                fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:700,
                padding:"7px 16px",borderRadius:8,cursor:saving[pt.id]?"default":"pointer",
                opacity:saving[pt.id]?.5:1,transition:"opacity .15s",
              }}
            >
              {saving[pt.id]?"…":pt.is_approved?"🔒 Blocca":"✓ Approva"}
            </button>

            {/* Badge stato */}
            <span style={{
              fontSize:11,fontWeight:700,letterSpacing:.8,textTransform:"uppercase",
              padding:"4px 10px",borderRadius:100,
              background:pt.is_approved?"rgba(46,204,113,.12)":"rgba(255,159,71,.12)",
              color:pt.is_approved?"#2ecc71":"#ff9f47",
            }}>
              {pt.is_approved?"Approvato":"In attesa"}
            </span>

            {/* Rifiuta (pending) / Elimina PT (approvato) */}
            <button
              onClick={()=>openDeleteModal(pt)}
              style={{
                background:"none",border:"1px solid rgba(255,71,87,.2)",
                color:"rgba(255,71,87,.7)",
                fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:600,
                padding:"7px 14px",borderRadius:8,cursor:"pointer",
                transition:"all .15s",
              }}
              onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,71,87,.08)";e.currentTarget.style.color="var(--danger)";}}
              onMouseLeave={e=>{e.currentTarget.style.background="none";e.currentTarget.style.color="rgba(255,71,87,.7)";}}
            >
              {pt.is_approved?"🗑 Elimina PT":"✗ Rifiuta"}
            </button>
          </div>
        </div>
      ))}

      {/* ── Modal conferma eliminazione PT ── */}
      {deleteModal&&(
        <div className="overlay" onClick={()=>{ if(!deleting){ setDeleteModal(null); setDeleteTyped(""); setDeleteErr(""); }}}>
          <div style={{
            background:"var(--card)",border:"1px solid rgba(255,71,87,.3)",
            borderRadius:16,padding:"28px 28px 24px",maxWidth:440,width:"100%",
            animation:"slideUp .2s ease",
          }} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:17,fontWeight:700,color:"var(--text)",marginBottom:10}}>
              {deleteModal.isPending?"Rifiuta richiesta":"Elimina PT"}
            </div>
            <div style={{fontSize:13,color:"var(--muted)",lineHeight:1.65,marginBottom:18}}>
              {deleteModal.isPending
                ? <>Stai <strong style={{color:"var(--text)"}}>rifiutando</strong> la richiesta di <strong style={{color:"var(--text)"}}>{ptLabel(deleteModal)}</strong>. Il loro account verrà eliminato definitivamente.</>
                : <>Questa azione elimina <strong style={{color:"var(--text)"}}>{ptLabel(deleteModal)}</strong>, tutti i suoi atleti e l'intero storico (schede, sessioni, misurazioni, appuntamenti). <strong style={{color:"var(--danger)"}}>Non è reversibile.</strong></>
              }
            </div>
            <div style={{fontSize:12,color:"var(--muted)",marginBottom:7}}>
              Digita <strong style={{color:"var(--text)"}}>{deleteModal.email}</strong> per confermare:
            </div>
            <input
              className="field-input"
              type="text"
              value={deleteTyped}
              autoComplete="off"
              onChange={e=>{ setDeleteTyped(e.target.value); setDeleteErr(""); }}
              placeholder={deleteModal.email}
              style={{marginBottom:14,fontSize:13,width:"100%"}}
            />
            {deleteErr&&<div style={{fontSize:12,color:"var(--danger)",marginBottom:10}}>{deleteErr}</div>}
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button
                className="btn-ghost"
                style={{fontSize:13,padding:"7px 16px"}}
                disabled={deleting}
                onClick={()=>{ setDeleteModal(null); setDeleteTyped(""); setDeleteErr(""); }}
              >Annulla</button>
              <button
                className="btn-danger"
                style={{
                  fontSize:13,padding:"7px 18px",
                  opacity:deleteTyped===deleteModal.email&&!deleting?1:.4,
                  cursor:deleteTyped===deleteModal.email&&!deleting?"pointer":"default",
                }}
                disabled={deleteTyped!==deleteModal.email||deleting}
                onClick={confirmDelete}
              >
                {deleting?"…":deleteModal.isPending?"Rifiuta":"Elimina PT"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
