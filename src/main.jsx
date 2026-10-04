import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { installaRaccoltaErrori } from './lib/erroriRecenti.js'
import { preparaInstallazione } from './lib/installa.js'

installaRaccoltaErrori()
preparaInstallazione()   // prima possibile: il browser manda l'evento una volta sola

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
