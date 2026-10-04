// ── Calendario mensile storico allenamenti ────────────────────────────────────
import { useTranslation } from "react-i18next";
import { nomeMese, inizialiGiorni } from "../../i18n/index.js";

export default function MonthCalendar({year, month, onPrev, onNext, sessionsByDate, selectedDate, onDaySelect, todayStr}) {
  useTranslation();   // ridisegna al cambio lingua (mesi e giorni dal browser)
  const WEEKDAYS_CAL = inizialiGiorni();
  const pad = n => String(n).padStart(2,"0");
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0…Sun=6
  const daysInMonth = new Date(year, month+1, 0).getDate();

  const cells = [];
  for(let i=0; i<firstWeekday; i++) cells.push(null);
  for(let d=1; d<=daysInMonth; d++) cells.push(d);
  while(cells.length % 7 !== 0) cells.push(null);

  const now = new Date();
  const isCurrentMonth = year===now.getFullYear() && month===now.getMonth();

  return (
    <div style={{marginBottom:20}}>
      {/* Month nav */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <button className="date-nav-btn" onClick={onPrev} style={{fontSize:20,padding:"4px 12px"}}>‹</button>
        <span style={{fontWeight:700,fontSize:15,color:"var(--text)",letterSpacing:.5}}>{nomeMese(month)} {year}</span>
        <button className="date-nav-btn" onClick={onNext} disabled={isCurrentMonth} style={{fontSize:20,padding:"4px 12px"}}>›</button>
      </div>

      {/* Weekday header */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:3}}>
        {WEEKDAYS_CAL.map((d,i)=>(
          <div key={i} style={{textAlign:"center",fontSize:9,fontWeight:700,letterSpacing:.8,color:"var(--muted)",textTransform:"uppercase",padding:"2px 0"}}>{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
        {cells.map((day,idx)=>{
          if(!day) return <div key={idx}/>;
          const dateStr=`${year}-${pad(month+1)}-${pad(day)}`;
          const sessions=sessionsByDate[dateStr]||[];
          const hasSession=sessions.length>0;
          const isToday=dateStr===todayStr;
          const isSelected=dateStr===selectedDate;
          const firstLabel=sessions[0]?.dayLabel||"";
          const isFuture=dateStr>todayStr;
          const extra=sessions.length>1?sessions.length-1:0;

          return (
            <div
              key={idx}
              onClick={()=>{ if(!isFuture) onDaySelect(dateStr,sessions[0]?.giornoKey); }}
              style={{
                position:"relative",
                minHeight:54,
                borderRadius:8,
                border:"1px solid var(--border)",
                background:isSelected?"var(--card2)":"var(--card)",
                outline:isToday?"2px solid var(--accent)":isSelected?"2px solid var(--accent2)":"2px solid transparent",
                outlineOffset:"-2px",
                cursor:isFuture?"default":"pointer",
                opacity:isFuture?.35:1,
                overflow:"hidden",
                display:"flex",
                flexDirection:"column",
                alignItems:"center",
                padding:"6px 3px 5px",
                gap:3,
                transition:"outline .1s",
              }}
            >
              {/* accent fill layer — opacity-based so it follows var(--accent) across themes */}
              {hasSession&&(
                <div style={{position:"absolute",inset:0,background:"var(--accent)",opacity:.13,borderRadius:7,pointerEvents:"none"}}/>
              )}

              {/* Day number */}
              <span style={{position:"relative",fontSize:12,fontWeight:hasSession?700:400,color:hasSession?"var(--text)":"var(--muted)",lineHeight:1}}>
                {day}
              </span>

              {/* Session label + overflow badge */}
              {hasSession&&(
                <div style={{position:"relative",width:"100%",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                  <span style={{fontSize:9,fontWeight:700,color:"var(--accent)",textAlign:"center",width:"100%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",letterSpacing:.2,padding:"0 2px",lineHeight:1.25}}>
                    {firstLabel.length>9?firstLabel.slice(0,9)+"…":firstLabel}
                  </span>
                  {extra>0&&(
                    <span style={{fontSize:8,fontWeight:700,color:"var(--muted)",background:"var(--card2)",borderRadius:3,padding:"1px 4px",lineHeight:1.4}}>+{extra}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
