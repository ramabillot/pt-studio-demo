import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n/index.js'   // lingua scelta prima del primo render
import App from './App.jsx'
import { installaRaccoltaErrori } from './lib/erroriRecenti.js'
import { preparaInstallazione } from './lib/installa.js'
import { APP } from './lib/app.js'
import { registraServiceWorker } from './lib/notifiche.js'

installaRaccoltaErrori()
preparaInstallazione()   // prima possibile: il browser manda l'evento una volta sola
if (APP === 'atleta') registraServiceWorker()   // solo notifiche del cronometro, nessuna cache

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
