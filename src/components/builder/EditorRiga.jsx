// ── Builder: editor di una riga (si apre sotto la riga, su telefono a tutto schermo dal basso) ──
// Tutti i campi della riga si modificano senza perdere gli altri (prima: cancella e rimetti = nota persa).
import { useTranslation } from "react-i18next";
import { nomeEsercizio, nomeGiorno } from "../../i18n/index.js";
import { fmtDateShort } from "../../utils.js";

const soloNum = v => v.replace(/[^0-9.,]/g, "");

export default function EditorRiga({ riga, giorni, giornoKey, indice, totale, oggi, onCambia, onSposta, onSu, onGiu, onDuplica, onElimina, onSostituisci, onChiudi }) {
  const { t } = useTranslation();
  const r = riga;
  const set = patch => onCambia({ ...r, ...patch });
  const cardio = r.tipo === "cardio";
  const nSerie = Math.max(1, parseInt(r.sets, 10) || 1);
  const altri = giorni.filter(g => g.key !== giornoKey && !g.nascosto);
  const nomeTec = r.id ? nomeEsercizio(r.nome, r.id) : r.nome;
  const id = s => `ed-${r.uid}-${s}`;

  const setSerie = v => {
    const n = v.replace(/\D/g, "").slice(0, 2);
    const patch = { sets: n };
    if (r.carichi) { const k = Math.max(1, parseInt(n, 10) || 1); patch.carichi = Array.from({ length: k }, (_, i) => r.carichi[i] ?? r.carichi[r.carichi.length - 1] ?? ""); }
    set(patch);
  };
  const toggleCarichi = per => set(per
    ? { carichi: Array.from({ length: nSerie }, () => r.pesoIniziale || "") }
    : { carichi: null, pesoIniziale: r.carichi?.[0] ?? r.pesoIniziale });

  return (
    <div className="b2-editor" role="group" aria-label={t("builder2.modificaRiga")}>
      <div className="b2-ed-esercizio">
        <span><small>{t("builder2.esercizio")}</small>{nomeTec}</span>
        <button type="button" className="btn-ghost" onClick={onSostituisci}>{t("builder2.cambia")}</button>
      </div>

      <label className="b2-ed-campo b2-full" htmlFor={id("alias")}>{t("builder2.nomeAtleta")}
        <input id={id("alias")} className="field-input" value={r.alias} placeholder={t("builder2.nomeAtletaPh")} onChange={e => set({ alias: e.target.value })}/>
        <small className="b2-aiuto">{t("builder2.nomeAtletaAiuto")}</small>
      </label>

      <div className="b2-ed-campo b2-full">{t("builder2.tipo")}
        <span className="b2-tipo">
          <button type="button" aria-pressed={!cardio} onClick={() => set({ tipo: "forza" })}>{t("builder2.forza")}</button>
          <button type="button" aria-pressed={cardio} onClick={() => set({ tipo: "cardio", durata: r.durata || "15" })}>{t("builder2.cardio")}</button>
        </span>
      </div>

      {!cardio ? <>
        <label className="b2-ed-campo" htmlFor={id("sets")}>{t("builder2.serie")}
          <input id={id("sets")} className="field-input" inputMode="numeric" value={r.sets} onChange={e => setSerie(e.target.value)}/>
        </label>
        <label className="b2-ed-campo" htmlFor={id("reps")}>{t("builder2.ripetizioni")}
          <input id={id("reps")} className="field-input" value={r.reps} placeholder="10 · 8-10 · 30s" onChange={e => set({ reps: e.target.value.replace(/[^0-9sS-]/g, "").toLowerCase() })}/>
        </label>
        <label className="b2-ed-campo" htmlFor={id("rest")}>{t("builder2.recupero")}
          <input id={id("rest")} className="field-input" inputMode="numeric" value={r.rest} onChange={e => set({ rest: e.target.value.replace(/\D/g, "").slice(0, 3) })}/>
          <small className="b2-aiuto">{String(r.rest) === "0" ? t("card.senzaPausa") : t("builder2.secondi")}</small>
        </label>
        {!r.carichi ? (
          <label className="b2-ed-campo" htmlFor={id("peso")}>{t("builder2.caricoIniziale")}
            <input id={id("peso")} className="field-input" inputMode="decimal" value={r.pesoIniziale} placeholder="—" onChange={e => set({ pesoIniziale: soloNum(e.target.value) })}/>
          </label>
        ) : (
          <div className="b2-ed-campo">{t("builder2.carichiPerSerie")}
            <div className="b2-carichi">
              {Array.from({ length: nSerie }, (_, i) => (
                <input key={i} className="field-input" inputMode="decimal" aria-label={t("builder2.caricoSerie", { n: i + 1 })} placeholder={`S${i + 1}`}
                  value={r.carichi[i] ?? ""} onChange={e => set({ carichi: Array.from({ length: nSerie }, (_, j) => j === i ? soloNum(e.target.value) : (r.carichi[j] ?? "")) })}/>
              ))}
            </div>
          </div>
        )}
        <label className="b2-check b2-full">
          <input type="checkbox" checked={!!r.carichi} onChange={e => toggleCarichi(e.target.checked)}/> {t("builder2.carichiDiversi")}
        </label>
        <label className="b2-check b2-full">
          <input type="checkbox" checked={!!r.propostiIl} onChange={e => set({ propostiIl: e.target.checked ? oggi : null })}/>
          <span>{t("builder2.consigliaPesi")}<small className="b2-aiuto">{r.propostiIl ? t("builder2.consigliatiDal", { data: fmtDateShort(r.propostiIl) }) : t("builder2.consigliaAiuto")}</small></span>
        </label>
      </> : <>
        <label className="b2-ed-campo" htmlFor={id("durata")}>{t("builder2.durata")}
          <input id={id("durata")} className="field-input" inputMode="decimal" value={r.durata} onChange={e => set({ durata: soloNum(e.target.value) })}/>
        </label>
        <label className="b2-ed-campo" htmlFor={id("vel")}>{t("builder2.velocita")}
          <input id={id("vel")} className="field-input" inputMode="decimal" value={r.velocita} placeholder="—" onChange={e => set({ velocita: soloNum(e.target.value) })}/>
        </label>
        <label className="b2-ed-campo" htmlFor={id("incl")}>{t("builder2.inclinazione")}
          <input id={id("incl")} className="field-input" inputMode="decimal" value={r.inclinazione} placeholder="—" onChange={e => set({ inclinazione: soloNum(e.target.value) })}/>
        </label>
        <label className="b2-ed-campo" htmlFor={id("liv")}>{t("builder2.livello")}
          <input id={id("liv")} className="field-input" inputMode="numeric" value={r.livello} placeholder="—" onChange={e => set({ livello: e.target.value.replace(/\D/g, "").slice(0, 2) })}/>
        </label>
        <small className="b2-aiuto b2-full">{t("builder2.cardioAiuto")}</small>
        <label className="b2-ed-campo" htmlFor={id("rest")}>{t("builder2.recupero")}
          <input id={id("rest")} className="field-input" inputMode="numeric" value={r.rest} onChange={e => set({ rest: e.target.value.replace(/\D/g, "").slice(0, 3) })}/>
        </label>
      </>}

      <label className="b2-ed-campo b2-full" htmlFor={id("nota")}>{t("builder2.notaAtleta")}
        <textarea id={id("nota")} className="field-input" rows={2} value={r.nota} placeholder={t("builder2.notaPh")} onChange={e => set({ nota: e.target.value })}/>
      </label>

      <div className="b2-ed-azioni b2-full">
        <button type="button" className="btn-ghost" onClick={onSu} disabled={indice === 0} aria-label={t("builder2.su")}>↑</button>
        <button type="button" className="btn-ghost" onClick={onGiu} disabled={indice === totale - 1} aria-label={t("builder2.giu")}>↓</button>
        {altri.length > 0 && (
          <select className="field-select b2-sposta" value="" onChange={e => e.target.value && onSposta(e.target.value)} aria-label={t("builder2.spostaIn")}>
            <option value="">{t("builder2.spostaIn")}…</option>
            {altri.map(g => <option key={g.key} value={g.key}>{nomeGiorno(g.nome, g.key)}</option>)}
          </select>
        )}
        <button type="button" className="btn-ghost" onClick={onDuplica}>{t("builder2.duplica")}</button>
        <button type="button" className="btn-ghost b2-elimina" onClick={onElimina}>{t("comune.elimina")}</button>
        <button type="button" className="btn-primary b2-fatto" onClick={onChiudi}>{t("builder2.chiudi")}</button>
      </div>
    </div>
  );
}
