// ── Manifest dell'app atleta, con l'indirizzo di avvio personalizzato ──
// Servito su /atleta/manifest.webmanifest (rewrite in vercel.json).
// start_url porta lo username (?u=) e, su iPhone, il codice monouso di installazione (?c=):
// l'icona sulla Home non condivide i dati con Safari, così al primo avvio l'atleta entra
// senza rifare il login (atleta_login_codice) o almeno trova lo username già scritto.
// "id" resta fisso: è sempre la stessa app, qualunque sia l'indirizzo di avvio.
const BASE = {
  name: "PT Studio",
  short_name: "PT Studio",
  description: "La tua scheda, i tuoi allenamenti e i tuoi progressi",
  lang: "it",
  id: "/atleta/",
  scope: "/atleta/",
  display: "standalone",
  orientation: "portrait",
  background_color: "#07070d",
  theme_color: "#07070d",
  icons: [
    { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
};

export function manifestAtleta(query = {}) {
  const u = String(query.u || "").toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 40);
  const c = String(query.c || "").toLowerCase().replace(/[^a-f0-9]/g, "").slice(0, 64);
  const p = new URLSearchParams();
  if (u) p.set("u", u);
  if (c) p.set("c", c);
  const qs = p.toString();
  return { ...BASE, start_url: `/atleta/${qs ? `?${qs}` : ""}` };
}

export default function handler(req, res) {
  res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).send(JSON.stringify(manifestAtleta(req.query || {})));
}
