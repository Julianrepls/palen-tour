import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

// Registra el Service Worker. Con registerType:'autoUpdate' el SW nuevo se activa
// automáticamente; recargamos para servir la versión actualizada en la próxima visita.
registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
