// ── Cronometro recupero / esercizi a tempo (lato atleta) ──
// Si salva l'ORA DI FINE (non i secondi rimasti): a schermo bloccato o dopo un ricaricamento
// il tempo resta giusto. Un solo cronometro alla volta; stato in localStorage + evento "pt-cronometro".
import { store } from "../utils.js";
import { attivaNotifiche, cronometroFermato } from "./notifiche.js";

const KEY = "ptstudio_cronometro";
const EVENTO = "pt-cronometro";
export const PREPARAZIONE_MS = 3000;   // 3-2-1 prima di un esercizio a tempo

// ── Audio ──
// Telefoni: altoparlante piccolo → onda quadra (più "presente" della sinusoide) intorno a 1–2 kHz,
// dove l'altoparlante rende di più, poi compressore per arrivare al massimo senza distorcere.
// Il volume è quello dei MEDIA del telefono (non della suoneria).
// iPhone: con la musica di un'altra app l'audio della pagina viene messo in pausa o coperto →
// prima di suonare chiediamo una sessione "transient" (abbassa la musica un attimo, come un
// navigatore), poi la rimettiamo com'era. Tra un suono e l'altro il contesto resta sospeso,
// così la musica non viene toccata durante il recupero.
let ctx = null, ingresso = null, timerSospendi = null;

function contesto() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10; comp.knee.value = 0; comp.ratio.value = 20;
    comp.attack.value = 0.002; comp.release.value = 0.1;
    const filtro = ctx.createBiquadFilter();          // smussa gli acuti della quadra
    filtro.type = "lowpass"; filtro.frequency.value = 5000;
    const uscita = ctx.createGain(); uscita.gain.value = 1;   // il compressore ha già il suo guadagno automatico
    filtro.connect(comp).connect(uscita).connect(ctx.destination);
    ingresso = filtro;
  }
  return ctx;
}

function sessioneAudio(tipo) {
  try { if ("audioSession" in navigator) navigator.audioSession.type = tipo; } catch { /* non supportato */ }
}

function sospendiPiuTardi(ms) {
  clearTimeout(timerSospendi);
  timerSospendi = setTimeout(() => {
    try { ctx?.suspend(); } catch { /* ignora */ }
    sessioneAudio("auto");
  }, ms);
}

// L'audio va "sbloccato" dentro un tocco dell'utente (regola dei browser, soprattutto iPhone):
// un suono muto lo avvia, poi si sospende fino al prossimo bip.
export function sbloccaAudio() {
  try {
    const c = contesto();
    if (!c) return;
    c.resume();
    const o = c.createOscillator(), g = c.createGain();
    g.gain.value = 0.0001;
    o.connect(g).connect(c.destination);
    o.start(); o.stop(c.currentTime + 0.05);
    sospendiPiuTardi(300);
  } catch { /* niente audio: resta solo la parte visiva */ }
}

export async function bip(freq = 1400, durata = 0.15, volte = 1) {
  const c = ctx;
  if (!c) return;
  try {
    clearTimeout(timerSospendi);
    sessioneAudio("transient");
    if (c.state !== "running") await c.resume();
    const t0 = c.currentTime + 0.03;
    let fine = t0;
    for (let i = 0; i < volte; i++) {
      const t = t0 + i * (durata + 0.1);
      const o = c.createOscillator(), g = c.createGain();
      o.type = "square"; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.9, t + 0.008);
      g.gain.setValueAtTime(0.9, t + durata - 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + durata);
      o.connect(g).connect(ingresso);
      o.start(t); o.stop(t + durata + 0.02);
      fine = t + durata;
    }
    sospendiPiuTardi((fine - c.currentTime) * 1000 + 400);
  } catch { /* ignora */ }
}

// Fine recupero / fine esercizio a tempo: tre bip + uno lungo più acuto
export function suonoFine() {
  bip(1400, 0.2, 3);
  setTimeout(() => bip(1900, 0.45), 3 * 300 + 50);
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
