// ── Multilingua IT / ES / EN ──────────────────────────────────────────────────
// Testi in it.json / es.json / en.json (stesse chiavi; controllo: npm run check-i18n).
// Lingua: scelta salvata per app (Home, atleta, PT) → altrimenti quella scelta nella Home
// → altrimenti quella del telefono/PC → altrimenti italiano.
// Non si traducono i contenuti scritti dalle persone (note, nomi schede, esercizi custom).
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import it from "./it.json";
import es from "./es.json";
import en from "./en.json";
import { EXERCISES, ytSearchUrl } from "../data.js";

export const LINGUE = [
  { code:"it", nome:"Italiano" },
  { code:"es", nome:"Español" },
  { code:"en", nome:"English" },
];
const CODICI = LINGUE.map(l=>l.code);
const LOCALE = { it:"it-IT", es:"es-AR", en:"en-GB" };

// Quale pagina è aperta: Home (/), app atleta (/atleta/), app PT (/pt/)
const PAGINA = typeof window==="undefined" ? "home"
  : window.location.pathname.startsWith("/atleta") ? "atleta"
  : window.location.pathname.startsWith("/pt") ? "pt" : "home";
const chiaveLingua = (p) => `ptstudio_lingua_${p}`;

function leggi(k){ try { return localStorage.getItem(k); } catch { return null; } }
function scrivi(k,v){ try { localStorage.setItem(k,v); } catch { /* navigazione privata */ } }

function linguaIniziale(){
  for(const k of [chiaveLingua(PAGINA), chiaveLingua("home")]){
    const v = leggi(k);
    if(CODICI.includes(v)) return v;
  }
  const preferite = typeof navigator!=="undefined" ? (navigator.languages?.length ? navigator.languages : [navigator.language]) : [];
  for(const l of preferite){
    const code = String(l||"").slice(0,2).toLowerCase();
    if(CODICI.includes(code)) return code;
  }
  return "it";
}

const iniziale = linguaIniziale();
i18n.use(initReactI18next).init({
  resources: { it:{translation:it}, es:{translation:es}, en:{translation:en} },
  lng: iniziale,
  fallbackLng: "it",
  interpolation: { escapeValue:false },   // React fa già l'escape
  returnNull: false,
});
if(typeof document!=="undefined") document.documentElement.lang = iniziale;

export function cambiaLingua(code){
  if(!CODICI.includes(code)) return;
  scrivi(chiaveLingua(PAGINA), code);
  i18n.changeLanguage(code);
  document.documentElement.lang = code;
}

export const lingua = () => i18n.language || "it";
// Prima lettera maiuscola (non ogni parola: "Viernes, 2 de octubre", non "De Octubre")
export const maiuscola = (s) => s ? s.charAt(0).toUpperCase()+s.slice(1) : s;
export const locale = () => LOCALE[lingua()] || "it-IT";
export const t = (...a) => i18n.t(...a);
// Decimali nella lingua scelta: 62,5 (it/es) · 62.5 (en). Nei campi si accettano entrambi (parseNum)
export const sepDecimale = () => lingua()==="en" ? "." : ",";
export const fmtNum = (n) => n==null || n==="" ? "—" : String(+n).replace(".", sepDecimale());
// Mese e iniziali dei giorni (lunedì primo) dal browser, nella lingua scelta
export const nomeMese = (m, stile="long") => { const s=new Date(2024,m,1).toLocaleDateString(locale(),{month:stile}); return s.charAt(0).toUpperCase()+s.slice(1); };
export const inizialiGiorni = (stile="narrow") => Array.from({length:7},(_,i)=>{ const s=new Date(2024,0,1+i).toLocaleDateString(locale(),{weekday:stile}).replace(".",""); return s.charAt(0).toUpperCase()+s.slice(1); });

// ── Valori salvati in italiano nel database → testo nella lingua scelta ────────
// Catalogo esercizi: nel DB resta il nome italiano (storico e grafici raggruppano per nome).
// Si traduce solo a schermo; esercizi custom e nomi sconosciuti restano come sono.
const ID_DA_NOME = new Map(EXERCISES.map(e=>[e.name, e.id]));
export function nomeEsercizio(nome, id){
  const exId = Number.isInteger(id) ? id : ID_DA_NOME.get(nome);
  if(!exId) return nome || "";
  return i18n.t(`esercizi.${exId}.nome`, { defaultValue: nome || "" });
}
export function muscoliEsercizio(ex){
  if(!ex?.id || typeof ex.id!=="number") return ex?.muscles || "";
  return i18n.t(`esercizi.${ex.id}.muscoli`, { defaultValue: ex.muscles || "" });
}
// Categoria, obiettivo, livello, tipo appuntamento, campo misure… (valore italiano → testo)
export function valore(gruppo, v){
  if(v===null || v===undefined || v==="") return v;
  return i18n.t(`valori.${gruppo}.${v}`, { defaultValue: String(v) });
}
// Nomi giorno standard ("Giorno A") tradotti a schermo; i nomi scelti dal PT restano
export function nomeGiorno(nome, key){
  if(!nome || /^Giorno [A-G]$/.test(nome.trim())) return i18n.t("comune.giornoN", { g: key || (nome||"").trim().slice(-1) });
  return nome;
}

// Ricerca video YouTube con il nome nella lingua scelta
export const ytCerca = (nome) => ytSearchUrl(nome, i18n.t("comune.ytParola"));

export default i18n;
