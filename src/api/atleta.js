// ── Accesso atleta con token di sessione (migration 014) ──────────────────────
// L'atleta non è un utente Supabase Auth: al login riceve un token casuale che
// resta salvato sul telefono. Tutte le funzioni atleta lo usano al posto dell'ID.
import { supabase } from "../supabase.js";
import { store, LS_ATLETA_TOKEN } from "../utils.js";

export class SessioneScaduta extends Error {
  constructor(){ super("Sessione scaduta"); this.name = "SessioneScaduta"; }
}

async function rpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    if (error.code === "28000" || /sessione_non_valida/.test(error.message || "")) throw new SessioneScaduta();
    throw error;
  }
  return data;
}

export const getToken = () => store.get(LS_ATLETA_TOKEN);
const tok = () => ({ p_token: getToken() });

export function buildAtletaObj(a) {
  return {
    id: a.id,
    supabaseId: a.id,
    pt_id: a.pt_id,
    name: (`${a.nome || ""} ${a.cognome || ""}`).trim() || a.username,
    nome: a.nome || "",
    cognome: a.cognome || "",
    username: a.username,
    ptNome: a.pt_nome || "",
    role: "atleta",
    isSupabase: true,
    is_approved: true,
    color: a.color || "#e8ff47",
  };
}

// → { ok:true, atleta } | { ok:false, errore:"credenziali"|"bloccato", fino? }
export async function loginAtleta(username, pin) {
  const r = await rpc("atleta_login", { p_username: username, p_pin: pin });
  if (r?.ok && r.token) {
    store.set(LS_ATLETA_TOKEN, r.token);
    return { ok: true, atleta: buildAtletaObj(r.atleta) };
  }
  return { ok: false, errore: r?.errore || "credenziali", fino: r?.fino };
}

// Ripristino all'apertura dell'app: null se non c'è un token valido
export async function riprendiSessioneAtleta() {
  if (!getToken()) return null;
  try {
    const a = await rpc("atleta_me", tok());
    return a ? buildAtletaObj(a) : null;
  } catch (e) {
    if (e instanceof SessioneScaduta) store.del(LS_ATLETA_TOKEN);
    return null;
  }
}

export async function logoutAtleta() {
  const t = getToken();
  store.del(LS_ATLETA_TOKEN);
  if (t) { try { await rpc("atleta_logout", { p_token: t }); } catch { /* già scaduto */ } }
}

export const getScheda       = () => rpc("atleta_get_scheda", tok());
export const getSessioni     = () => rpc("atleta_get_sessioni", tok());
export const getMisurazioni  = () => rpc("atleta_get_misurazioni", tok());
export const getAppuntamenti = () => rpc("atleta_get_appuntamenti", tok());

// serie: [{ scheda_esercizio_id, nome_esercizio, serie_numero, reps, peso }]
export const saveSessione = (giornoId, data, serie, note = null) =>
  rpc("atleta_save_sessione", { ...tok(), p_giorno_id: giornoId, p_data: data, p_serie: serie, p_note: note });
