// ── Lato PT: carica atleti, schede attive e sessioni recenti in 3 query (RLS: solo i dati del PT) ──
import { statoAtleta, obiettivoScheda, eserciziPerGiorno } from "./settimana.js";
import { lunediDi } from "./allenamento.js";

const meno = (oggi, giorni) => { const d = new Date(oggi + "T12:00"); d.setDate(d.getDate() - giorni); return d.toISOString().slice(0, 10); };

export async function caricaPanoramica(supabase, ptId, oggi, { settimane = 8, conArchiviati = false } = {}) {
  let qa = supabase.from("atleti").select("*").eq("pt_id", ptId).order("created_at", { ascending: true });
  if (!conArchiviati) qa = qa.is("archived_at", null);
  const [a, s, x] = await Promise.all([
    qa,
    supabase.from("schede")
      .select("id, atleta_id, nome, created_at, scheda_giorni(id, nome, giorno_key, ordine, nascosto_at, scheda_esercizi(id, nome, serie, reps, tipo, nome_atleta, ordine))")
      .eq("pt_id", ptId).eq("attiva", true).order("created_at", { ascending: false }),
    supabase.from("sessioni")
      .select("id, atleta_id, data, giorno_id, note, sessione_serie(esercizio_id, nome_esercizio, serie_numero, reps, peso, nota, durata_sec)")
      .eq("pt_id", ptId).gte("data", meno(oggi, settimane * 7 + 7)).order("data", { ascending: false }),
  ]);
  for (const r of [a, s, x]) if (r.error) throw r.error;
  const schede = s.data || [], sessioni = x.data || [];
  const atleti = (a.data || []).map(at => {
    const scheda = schede.find(sc => sc.atleta_id === at.id) || null;
    const mie = sessioni.filter(ss => ss.atleta_id === at.id);
    const giorno = id => scheda?.scheda_giorni?.find(g => g.id === id);
    const st = statoAtleta(mie, obiettivoScheda(scheda), oggi);
    // settimane prima che l'atleta esistesse: non contano (niente "0/3" finti)
    const inizio = at.created_at ? lunediDi(String(at.created_at).slice(0, 10)) : null;
    if (inizio) st.settimane = st.settimane.map(w => (w.lunedi < inizio ? { ...w, prima: true } : w));
    return { ...at, scheda, sessioni: mie, ...st, ultimoGiorno: st.ultimo ? (giorno(st.ultimo.giornoId)?.nome || "") : "", ultimoKey: st.ultimo ? (giorno(st.ultimo.giornoId)?.giorno_key || "") : "" };
  });
  return { atleti, schede, sessioni, esPerGiorno: eserciziPerGiorno(schede) };
}
