// ── Edge Function "invia-push": manda le notifiche del cronometro dovute ──────
// Chiamata ogni 5 s da pg_cron (private.push_dovute, migration 019) SOLO quando c'è
// qualcosa da inviare. Protetta dal segreto x-cron-secret (verify_jwt disattivato).
// Chiavi VAPID e segreto in private.push_config (inseriti a mano, non nel repo).
// Legge/scrive il DB direttamente (SUPABASE_DB_URL): lo schema private non è esposto via API.
import postgres from "npm:postgres@3.4.5";
import webpush from "npm:web-push@3.6.7";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false, max: 1 });

Deno.serve(async (req) => {
  const [cfg] = await sql`select * from private.push_config where id`;
  if (!cfg || req.headers.get("x-cron-secret") !== cfg.cron_secret) {
    return new Response("forbidden", { status: 403 });
  }
  webpush.setVapidDetails(cfg.subject, cfg.vapid_public, cfg.vapid_private);

  // Avvisi troppo vecchi (cron fermo, ecc.): non servono più
  await sql`update public.push_programmate set annullata_at = now(), esito = 'scaduta'
            where inviata_at is null and annullata_at is null and invia_at < now() - interval '10 minutes'`;

  // Prende in carico quelli dovuti (skip locked: due chiamate insieme non inviano due volte)
  const dovute = await sql`
    update public.push_programmate set inviata_at = now()
    where id in (select id from public.push_programmate
                 where inviata_at is null and annullata_at is null and invia_at <= now()
                 order by invia_at limit 50 for update skip locked)
    returning id, atleta_id, titolo, corpo, tag, silenziosa`;

  let inviate = 0;
  for (const p of dovute) {
    const iscrizioni = await sql`select endpoint, p256dh, auth from public.push_iscrizioni where atleta_id = ${p.atleta_id}`;
    const esiti: string[] = [];
    for (const s of iscrizioni) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ titolo: p.titolo, corpo: p.corpo, tag: p.tag, silenziosa: p.silenziosa }),
          { TTL: 120, urgency: "high", topic: p.tag },   // topic: un avviso nuovo sostituisce quello vecchio non ancora consegnato
        );
        esiti.push("ok"); inviate++;
      } catch (e) {
        const st = (e as { statusCode?: number }).statusCode;
        esiti.push(String(st ?? (e as Error).message).slice(0, 60));
        // iscrizione non più valida (app disinstallata, permesso tolto): si toglie
        if (st === 404 || st === 410) await sql`delete from public.push_iscrizioni where endpoint = ${s.endpoint}`;
      }
    }
    await sql`update public.push_programmate set esito = ${esiti.join(",") || "nessuna_iscrizione"} where id = ${p.id}`;
  }
  return Response.json({ dovute: dovute.length, inviate });
});
