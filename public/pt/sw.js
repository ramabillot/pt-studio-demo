// ── Service worker dell'app PT (Coach): serve solo a farla installare come app vera ──
// Su Android, senza service worker Chrome a volte crea solo un collegamento che si apre
// con la barra del browser. Nessun gestore "fetch": niente cache, niente offline →
// non tocca gli aggiornamenti dell'app. Indirizzo e scope (/pt/) non vanno più cambiati.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
