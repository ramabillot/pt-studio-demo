import process from 'node:process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('.', import.meta.url))
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Versione dell'app = commit del deploy Vercel (o "dev" in locale).
// Allegata alle segnalazioni e usata per l'aggiornamento automatico.
const VERSION = (process.env.VERCEL_GIT_COMMIT_SHA || 'dev').slice(0, 7)

// Scrive /version.json nella build: l'app lo confronta con la propria versione
// per capire se online c'è un deploy più nuovo (src/components/AggiornamentoApp.jsx)
const versionFile = () => ({
  name: 'version-file',
  apply: 'build',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ v: VERSION }) })
  },
})

// https://vite.dev/config/
// Tre pagine: / = Home (non installabile), /atleta/ e /pt/ = due app installabili separate
export default defineConfig({
  plugins: [react(), versionFile()],
  build: {
    rollupOptions: {
      input: {
        home:   resolve(ROOT, 'index.html'),
        atleta: resolve(ROOT, 'atleta/index.html'),
        pt:     resolve(ROOT, 'pt/index.html'),
      },
    },
  },
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(VERSION),
  },
})
