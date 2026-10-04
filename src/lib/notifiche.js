// ── Notifiche push del cronometro (solo app atleta) ──
// Regola (decisione 2026-10-04): la notifica compare SOLO quando l'app non è a schermo.
//  · app in secondo piano / schermo bloccato con cronometro attivo → si programmano sul server
//    "Recupero · finisce alle HH:MM:SS" (subito, silenziosa) e "Recupero finito" (all'ora di fine)
//  · app di nuovo a schermo → si annulla tutto e si tolgono le notifiche già comparse
// L'invio lo fa il server (migration 019/020 + Edge Function invia-push): a schermo bloccato
// l'app è ferma e non può avvisare da sola.
import { store } from "../utils.js";
import { getToken } from "../api/atleta.js";
import { isIOS, isStandalone } from "./installa.js";
import { t as tr, locale } from "../i18n/index.js";

const VAPID_PUBLIC = "BFI972uXOycwek6RYUc457YMkwLPccodxkuYmGT7taYR_enIA6va2Mwjx3b3lH6vRyPejICCmdw-qUutnq78oEo";
const KEY_ISCRITTO = "ptstudio_push_endpoint";
const SW_URL = "/atleta/sw.js";

let programmate = false;   // abbiamo avvisi in attesa sul server?

export const notificheSupportate = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
  && (!isIOS() || isStandalone());   // iPhone: solo dall'app installata sulla Home

export function registraServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register(SW_URL, { scope: "/atleta/" }).catch(() => { /* nessuna notifica, il resto funziona */ });
}

// RPC con keepalive: deve partire anche mentre la pagina va in secondo piano
function rpc(fn, args) {
  return fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST", keepalive: true,
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(args),
  }).catch(() => null);
}

const chiave = (b64) => {
  const s = (b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
};

// Da chiamare DENTRO un tocco dell'utente (il browser chiede il permesso solo così).
// Prima volta: chiede il permesso; poi registra il telefono sul server.
export async function attivaNotifiche() {
  if (!notificheSupportate() || !getToken()) return;
  try {
    let perm = Notification.permission;
    if (perm === "default") perm = await Notification.requestPermission();
    if (perm !== "granted") return;
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription())
      || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chiave(VAPID_PUBLIC) }));
    const j = sub.toJSON();
    if (store.get(KEY_ISCRITTO) === `${j.endpoint}|${getToken().slice(0, 8)}`) return;
    await rpc("atleta_salva_push", {
      p_token: getToken(), p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth,
      p_user_agent: navigator.userAgent,
    });
    store.set(KEY_ISCRITTO, `${j.endpoint}|${getToken().slice(0, 8)}`);
  } catch { /* niente notifiche: il cronometro funziona lo stesso */ }
}

const pronte = () => notificheSupportate() && Notification.permission === "granted" && !!store.get(KEY_ISCRITTO) && !!getToken();
const ora = (ms) => new Date(ms).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit", second: "2-digit" });

// Avvisi da programmare per il cronometro attivo (t = stato salvato da lib/cronometro.js)
export function avvisiPer(t, adesso = Date.now()) {
  if (!t || adesso >= t.fine + (t.tipo === "tempo" && t.recupero ? t.recupero * 1000 : 0)) return [];
  const tra = (ms) => Math.max(0, Math.round((ms - adesso) / 1000));
  if (t.tipo === "recupero") {
    return [
      { tra_sec: 0, titolo: tr("push.recuperoFinisce", { ora: ora(t.fine) }), corpo: t.nome, silenziosa: true },
      { tra_sec: tra(t.fine), titolo: tr("push.recuperoFinito"), corpo: tr("push.siRiparte", { nome: t.nome }) },
    ];
  }
  const fineRec = t.fine + (t.recupero || 0) * 1000;
  const lista = [];
  if (adesso < t.fine) {
    lista.push({ tra_sec: 0, titolo: tr("push.nomeFinisce", { nome: t.nome, ora: ora(t.fine) }), corpo: tr("push.esercizioATempo"), silenziosa: true });
    lista.push({ tra_sec: tra(t.fine), titolo: tr("push.tempoFinito"), corpo: t.recupero ? tr("push.recuperoFinoAlle", { ora: ora(fineRec) }) : t.nome });
  } else {
    lista.push({ tra_sec: 0, titolo: tr("push.recuperoFinisce", { ora: ora(fineRec) }), corpo: t.nome, silenziosa: true });
  }
  if (t.recupero) lista.push({ tra_sec: tra(fineRec), titolo: tr("push.recuperoFinito"), corpo: tr("push.siRiparte", { nome: t.nome }) });
  return lista;
}

export function appInSecondoPiano(t) {
  if (!pronte()) return;
  const avvisi = avvisiPer(t);
  if (!avvisi.length) return;
  programmate = true;
  rpc("atleta_programma_push", { p_token: getToken(), p_avvisi: avvisi });
}

export async function appASchermo() {
  if (!pronte()) return;
  if (programmate) { programmate = false; rpc("atleta_annulla_push", { p_token: getToken() }); }
  try {   // via le notifiche del cronometro già comparse: c'è la pillola
    const reg = await navigator.serviceWorker.getRegistration("/atleta/");
    (await reg?.getNotifications({ tag: "cronometro" }))?.forEach((n) => n.close());
  } catch { /* ignora */ }
}

// Cronometro chiuso o cambiato mentre l'app è a schermo: niente da annullare sul server
// (si programma solo in secondo piano), ma se qualcosa era rimasto in attesa lo togliamo.
export function cronometroFermato() {
  if (programmate && pronte()) { programmate = false; rpc("atleta_annulla_push", { p_token: getToken() }); }
}
