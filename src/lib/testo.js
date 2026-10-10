// ── Dimensione del testo ──────────────────────────────────────────────────────
// Tutte le misure dei caratteri sono in rem: qui si decide quanto vale 1rem (font-size di <html>).
//   1rem = base dell'app × dimensione del testo del telefono × scelta dell'utente (A / A+ / A++)
// - Base: app atleta 18px (testo più grande per l'uso in palestra), app PT e Home 16px.
// - Telefono: su iPhone si legge la "Dimensione testo" di iOS (font -apple-system-body, 17px = normale).
//   Su Android ci pensa Chrome da solo (applica la scala del sistema alla pagina).
// - Scelta dell'utente: salvata su questo dispositivo, separata per app (ptstudio_testo_atleta|pt).
import { store } from "../utils.js";
import { APP } from "./app.js";

export const SCALE = [
  { id: "a",   etichetta: "A",   valore: 1 },
  { id: "a+",  etichetta: "A+",  valore: 1.2 },
  { id: "a++", etichetta: "A++", valore: 1.4 },
];
const BASE = APP === "atleta" ? 18 : 16;
const chiave = () => `ptstudio_testo_${APP}`;
const EVENTO = "pt-testo";

export function sceltaTesto() {
  const v = store.get(chiave());
  return SCALE.some(s => s.id === v) ? v : "a";
}

function isIOS() {
  const ua = navigator.userAgent || "";
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

// Scala della "Dimensione testo" di iOS (1 = impostazione normale)
function scalaTelefono() {
  try {
    if (!isIOS() || !window.CSS?.supports?.("font", "-apple-system-body")) return 1;
    const el = document.createElement("span");
    el.style.cssText = "font:-apple-system-body;position:absolute;visibility:hidden;pointer-events:none";
    el.textContent = "x";
    document.body.appendChild(el);
    const px = parseFloat(getComputedStyle(el).fontSize);
    el.remove();
    return px > 0 ? Math.min(Math.max(px / 17, 0.85), 2.2) : 1;
  } catch { return 1; }
}

export function applicaTesto() {
  try {
    const utente = SCALE.find(s => s.id === sceltaTesto())?.valore || 1;
    const px = Math.round(BASE * scalaTelefono() * utente * 10) / 10;
    document.documentElement.style.fontSize = `${px}px`;
  } catch { /* resta la misura del CSS */ }
}

export function cambiaTesto(id) {
  store.set(chiave(), id);
  applicaTesto();
  window.dispatchEvent(new Event(EVENTO));
}

export function ascoltaTesto(fn) {
  window.addEventListener(EVENTO, fn);
  return () => window.removeEventListener(EVENTO, fn);
}

// Da chiamare una volta all'avvio (dopo che <body> esiste). Se l'utente cambia la dimensione
// del testo nelle impostazioni dell'iPhone e torna nell'app, si ricalcola.
export function avviaTesto() {
  document.documentElement.dataset.app = APP;
  applicaTesto();
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") applicaTesto(); });
}
