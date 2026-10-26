// ── Scheda lato PT: caricamento dal DB e preparazione per il Builder ──────────
// Usato da "Modifica nel Builder" (Atleti.jsx) e dal Builder stesso quando si sceglie
// un atleta (B24): così il Builder ha sempre la scheda completa con gli id del DB
// (dbId) e il salvataggio aggiorna sul posto invece di cancellare e ricreare.
import { EXERCISES, ALL_DAYS } from "../data.js";

export const SELECT_SCHEDA = "*, scheda_giorni(*, scheda_esercizi(*))";

// Scheda attiva più recente dell'atleta (o null). Lancia l'errore di Supabase se c'è.
export async function caricaSchedaAttiva(supabase, atletaId) {
  const { data, error } = await supabase.from("schede")
    .select(SELECT_SCHEDA)
    .eq("atleta_id", atletaId)
    .eq("attiva", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

const giorniVuoti = () => Object.fromEntries(ALL_DAYS.map(d => [d, []]));
const nomiVuoti = () => Object.fromEntries(ALL_DAYS.map(d => [d, ""]));

// Scheda dal DB → struttura del Builder (giorni A…G con gli esercizi, nomi dei giorni, id)
export function schedaToPreload(scheda, atleta) {
  const giorni = giorniVuoti();
  const dayNames = nomiVuoti();
  const giornoIds = {};
  [...(scheda.scheda_giorni || [])]
    .sort((a, b) => a.ordine - b.ordine)
    .forEach(g => {
      const key = g.giorno_key || String.fromCharCode(65 + g.ordine);
      dayNames[key] = g.nome || "";
      giornoIds[key] = g.id;
      giorni[key] = [...(g.scheda_esercizi || [])]
        .sort((a, b) => a.ordine - b.ordine)
        .map((ex, i) => {
          const exFull = EXERCISES.find(e => e.id === ex.esercizio_id_int) || {};
          return {
            ...exFull,
            id: ex.esercizio_id_int || null,
            dbId: ex.id,                       // id scheda_esercizi → aggiornamento sul posto
            name: ex.nome || exFull.name || "",
            muscles: exFull.muscles || "",
            sets: ex.serie || 3,
            reps: ex.reps || "10",               // testo: conserva intervalli tipo "8-10"
            rest: ex.rest_sec ?? 90,              // 0 = senza pausa (B5): prima diventava 90 e si risalvava così
            uid: `${g.id}-${i}`,
          };
        });
    });
  return {
    schedaId: scheda.id,
    atleta,
    atletaId: atleta?.id,
    nome: atleta?.nome || "",
    cognome: atleta?.cognome || "",
    obiettivo: scheda.obiettivo || "",
    livello: scheda.livello || "",
    giorni,
    dayNames,
    giornoIds,
    schedaNome: scheda.nome || "",
  };
}

// Numero di esercizi di una scheda dal DB (per gli avvisi)
export const contaEsercizi = scheda =>
  (scheda?.scheda_giorni || []).reduce((s, g) => s + (g.scheda_esercizi || []).length, 0);
