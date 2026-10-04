// ── Installazione dell'app sul telefono ──
// Android/Chrome: il browser manda "beforeinstallprompt" → lo teniamo per un bottone "Installa" nostro.
// iPhone: nessun prompt possibile → istruzioni (solo da Safari).
let promptEvento = null;
const ascoltatori = new Set();
const avvisa = () => ascoltatori.forEach(fn => fn());

export function preparaInstallazione() {
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); promptEvento = e; avvisa(); });
  window.addEventListener("appinstalled", () => { promptEvento = null; avvisa(); });
}

export const ascoltaInstallazione = fn => { ascoltatori.add(fn); return () => ascoltatori.delete(fn); };
export const puoInstallareAndroid = () => !!promptEvento;

export async function installaAndroid() {
  if (!promptEvento) return false;
  promptEvento.prompt();
  const { outcome } = await promptEvento.userChoice;
  promptEvento = null; avvisa();
  return outcome === "accepted";
}

const ua = () => navigator.userAgent || "";
export const isStandalone = () => window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;
export const isIOS = () => /iPhone|iPad|iPod/.test(ua()) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export const isIOSSafari = () => isIOS() && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua());
export const isMobile = () => isIOS() || /Android/.test(ua());
