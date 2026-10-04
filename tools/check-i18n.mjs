// ── Controllo traduzioni (gira prima di ogni build: "prebuild" in package.json) ──
// 1. it.json, es.json, en.json devono avere esattamente le stesse chiavi, senza testi vuoti
// 2. ogni chiave usata nel codice (t("…"), i18nKey="…", label:"nav.…") deve esistere in it.json
// Se qualcosa manca la build si ferma: niente deploy con testi mancanti.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const DIR = "src/i18n";
const LINGUE = ["it", "es", "en"];
const piatte = {};
const appiattisci = (o, p = "", out = {}) => {
  for (const [k, v] of Object.entries(o)) {
    const key = p ? `${p}.${k}` : k;
    if (v && typeof v === "object") appiattisci(v, key, out); else out[key] = v;
  }
  return out;
};
for (const l of LINGUE) piatte[l] = appiattisci(JSON.parse(readFileSync(join(DIR, `${l}.json`), "utf8")));

const errori = [];
const base = Object.keys(piatte.it);
for (const l of LINGUE) {
  const chiavi = new Set(Object.keys(piatte[l]));
  for (const k of base) if (!chiavi.has(k)) errori.push(`${l}.json: manca "${k}"`);
  for (const k of chiavi) if (!piatte.it[k] && piatte.it[k] !== "") errori.push(`${l}.json: chiave in più "${k}" (non c'è in it.json)`);
  for (const [k, v] of Object.entries(piatte[l])) if (typeof v !== "string" || !v.trim()) errori.push(`${l}.json: testo vuoto "${k}"`);
}

// Chiavi usate nel codice (solo quelle scritte per intero; le chiavi composte a runtime
// — valori del DB, esercizi per id — hanno il loro fallback e non si controllano qui)
const file = [];
const giro = (d) => readdirSync(d).forEach(n => { const p = join(d, n); statSync(p).isDirectory() ? giro(p) : /\.(jsx?|mjs)$/.test(n) && file.push(p); });
giro("src");
const RE = [/\bt\(\s*"([a-zA-Z][\w]*\.[\w.]+)"/g, /\btr\(\s*"([a-zA-Z][\w]*\.[\w.]+)"/g, /i18nKey="([\w.]+)"/g, /label:\s*"((?:nav)\.[\w.]+)"/g, /\bt\(\s*([a-z]+\?\s*)?"([\w]+\.[\w.]+)"\s*:\s*"([\w]+\.[\w.]+)"/g];
const esiste = (k) => k in piatte.it || `${k}_one` in piatte.it || `${k}_other` in piatte.it;
for (const f of file) {
  const s = readFileSync(f, "utf8");
  for (const re of RE) for (const m of s.matchAll(re)) for (const k of m.slice(1).filter(x => x && x.includes("."))) {
    if (!esiste(k)) errori.push(`${f}: chiave "${k}" non trovata in it.json`);
  }
}

if (errori.length) {
  console.error(`\n✗ Traduzioni: ${errori.length} problemi\n  ` + [...new Set(errori)].join("\n  ") + "\n");
  process.exit(1);
}
console.log(`✓ Traduzioni ok: ${base.length} testi × ${LINGUE.length} lingue`);
