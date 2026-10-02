// Colori per tipo di appuntamento (calendario PT e vista atleta)

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
