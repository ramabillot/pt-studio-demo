// ── Quale app è aperta: /atleta/ (app atleta) o /pt/ (app Personal Trainer / admin) ──
// Stesso codice, due app installabili separate (manifest, id e scope propri).
// Sessioni indipendenti: l'app atleta usa solo il token atleta, l'app PT solo Supabase Auth.
export const APP = typeof window !== "undefined" && window.location.pathname.startsWith("/atleta") ? "atleta" : "pt";
export const URL_ATLETA = "/atleta/";
export const URL_PT = "/pt/";

// Link di accesso da mandare all'atleta: username già compilato
export const linkAtleta = (username) => `${window.location.origin}${URL_ATLETA}?u=${encodeURIComponent(username)}`;
