import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n/index.js'   // lingua scelta prima del primo render
import App from './App.jsx'
import { installaRaccoltaErrori } from './lib/erroriRecenti.js'
import { preparaInstallazione } from './lib/installa.js'
import { APP } from './lib/app.js'
import { registraServiceWorker } from './lib/notifiche.js'
import { avviaTesto } from './lib/testo.js'

installaRaccoltaErrori()
avviaTesto()   // dimensione del testo (rem) prima del primo render
preparaInstallazione()   // prima possibile: il browser manda l'evento una volta sola
if (APP === 'atleta') registraServiceWorker()   // solo notifiche del cronometro, nessuna cache
// App PT: service worker vuoto, solo perché Android la installi come app (senza barra di Chrome)
else if ('serviceWorker' in navigator) navigator.serviceWorker.register('/pt/sw.js', { scope: '/pt/' }).catch(() => {})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
