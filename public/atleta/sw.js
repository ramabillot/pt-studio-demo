// ── Service worker dell'app atleta: SOLO notifiche push del cronometro ──
// Nessun gestore "fetch": niente cache, niente offline → non tocca gli aggiornamenti dell'app.
// Ogni push ricevuta mostra SEMPRE una notifica (su iPhone è obbligatorio, altrimenti Safari
// toglie il permesso). Le push partono solo quando l'app non è a schermo (vedi lib/notifiche.js).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { /* payload non JSON */ }
  e.waitUntil(self.registration.showNotification(d.titolo || "PT Studio", {
    body: d.corpo || "",
    tag: d.tag || "cronometro",          // stessa etichetta: "finito" sostituisce "finisce alle…"
    renotify: !d.silenziosa,
    silent: !!d.silenziosa,
    icon: "/icons/icon-192.png",
    data: { url: "/atleta/" },
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil((async () => {
    const finestre = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const app = finestre.find((w) => new URL(w.url).pathname.startsWith("/atleta/"));
    if (app) return app.focus();
    return self.clients.openWindow("/atleta/");
  })());
});
