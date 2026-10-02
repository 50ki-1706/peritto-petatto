/** @jsxImportSource react */
import '@vitejs/plugin-react/preamble'
import './client.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'

// The unplugin's dev HTML injection does not apply to this hono/jsx shell, so
// the runtime is loaded from the entry instead: it fetches
// `/virtual:stylex.css` immediately after connect and on every HMR update.
if (import.meta.env.DEV) void import('virtual:stylex:runtime')

// Tauri uses a custom protocol and does not need the web app's service worker.
// Register only on HTTP(S), where browsers support PWA installation.
if (
  import.meta.env.PROD &&
  'serviceWorker' in navigator &&
  (location.protocol === 'http:' || location.protocol === 'https:')
) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js')
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
