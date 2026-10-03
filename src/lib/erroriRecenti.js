// Ultimi errori JavaScript della pagina: vengono allegati in automatico a ogni
// segnalazione di bug (così Claude vede cosa è andato storto senza chiedere).
const MAX = 5;
const errori = [];

function aggiungi(msg) {
  errori.push({ t: new Date().toISOString(), msg: String(msg).slice(0, 500) });
  if (errori.length > MAX) errori.shift();
}

export function installaRaccoltaErrori() {
  window.addEventListener("error", (e) => aggiungi(e.message || e.error || "errore"));
  window.addEventListener("unhandledrejection", (e) => aggiungi(e.reason?.message || e.reason || "promise rifiutata"));
}

export const erroriRecenti = () => [...errori];
