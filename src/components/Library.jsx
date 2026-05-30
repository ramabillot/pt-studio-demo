import React, { useState } from "react";
import { EXERCISES, CATEGORIES, EX_IMAGES, CAT_COLORS } from "../data.js";
import { BackBtn } from "./Sidebar.jsx";

export function VideoModal({ex,onClose}) {
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

export default function Library({setView}) {
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
