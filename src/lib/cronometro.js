// ── Cronometro recupero / esercizi a tempo (lato atleta) ──
// Si salva l'ORA DI FINE (non i secondi rimasti): a schermo bloccato o dopo un ricaricamento
// il tempo resta giusto. Un solo cronometro alla volta; stato in localStorage + evento "pt-cronometro".
import { store } from "../utils.js";
import { attivaNotifiche, cronometroFermato } from "./notifiche.js";

const KEY = "ptstudio_cronometro";
const EVENTO = "pt-cronometro";
export const PREPARAZIONE_MS = 3000;   // 3-2-1 prima di un esercizio a tempo

let ctx = null;
// L'audio va "sbloccato" dentro un tocco dell'utente (regola dei browser, soprattutto iPhone)
export function sbloccaAudio() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!ctx) ctx = new AC();
    if (ctx.state === "suspended") ctx.resume();
  } catch { /* niente audio: resta solo la parte visiva */ }
}

export function bip(freq = 880, durata = 0.15, volte = 1) {
  if (!ctx) return;
  try {
    for (let i = 0; i < volte; i++) {
      const t = ctx.currentTime + i * (durata + 0.12);
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.35, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + durata);
      o.connect(g).connect(ctx.destination);
      o.start(t); o.stop(t + durata + 0.02);
    }
  } catch { /* ignora */ }
}

// Android vibra; iPhone ignora (Safari non supporta la vibrazione)
export function vibra(schema) { try { navigator.vibrate?.(schema); } catch { /* ignora */ } }

// "30s", "45 sec", "60''" → secondi; ripetizioni normali → null
export function secondiATempo(reps) {
  const m = String(reps ?? "").trim().match(/^(\d+)\s*(s|sec|"|'')$/i);
  return m ? +m[1] : null;
}

export function fmtMMSS(sec) {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function leggi() {
  try { return JSON.parse(store.get(KEY) || "null"); } catch { return null; }
}

export function scrivi(t) {
  if (t) store.set(KEY, JSON.stringify(t)); else { store.del(KEY); cronometroFermato(); }
  window.dispatchEvent(new Event(EVENTO));
}

export function ascolta(fn) {
  window.addEventListener(EVENTO, fn);
  return () => window.removeEventListener(EVENTO, fn);
}

// Recupero: parte subito. A tempo: 3 s di preparazione, poi il tempo; alla fine parte il recupero.
export function avviaRecupero(nome, secondi) {
  attivaNotifiche();   // prima volta: chiede il permesso (serve il tocco dell'utente)
  sbloccaAudio();
  const ora = Date.now();
  scrivi({ tipo: "recupero", nome, inizio: ora, fine: ora + secondi * 1000 });
}

export function avviaTempo(nome, secondi, recupero) {
  attivaNotifiche();
  sbloccaAudio();
  const inizio = Date.now() + PREPARAZIONE_MS;
  scrivi({ tipo: "tempo", nome, inizio, fine: inizio + secondi * 1000, recupero: recupero || 0 });
}
