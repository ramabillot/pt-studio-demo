import React, { useState } from "react";
import { MONTHS_IT, DAYS_IT, SESSION_TYPES, ADMIN_SESSION_TYPES } from "../data.js";
import { DEMO_EVENTS, ADMIN_EVENTS, fmtDate, loadSharedCal, saveSharedCal } from "../utils.js";
import { BackBtn } from "./Sidebar.jsx";
import { AtletaSearchField } from "./Builder.jsx";
import { useEffect } from "react";

export function typeColor(type) {
  const t=(type||"").toLowerCase();
  if(t==="allenamento"||t==="riunione") return "var(--accent)";
  if(t==="valutazione"||t==="call")     return "var(--accent2)";
  if(t==="recupero")                    return "var(--accent3)";
  if(t==="visita")                      return "#ff9f47";
  if(t==="onboarding")                  return "#a47ffe";
  return "var(--accent)";
}

export function typeBg(type) {
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

const HOURS=Array.from({length:16},(_,i)=>i+6);

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

export function CalendarView({setView}) {
  const [events,setEvents]=useState(()=>loadSharedCal()||DEMO_EVENTS);
  useEffect(()=>{ saveSharedCal(events); },[events]);
  return <CalendarBase events={events} setEvents={setEvents} sessionTypes={SESSION_TYPES} clientLabel="Atleta" setView={setView} enableAtletaSearch={true}/>;
}

export function AdminCalendar({setView}) {
  const [events,setEvents]=useState(ADMIN_EVENTS);
  return <CalendarBase events={events} setEvents={setEvents} sessionTypes={ADMIN_SESSION_TYPES} clientLabel="PT / Contatto" setView={setView} pageSubtitle="I tuoi appuntamenti con i PT"/>;
}
