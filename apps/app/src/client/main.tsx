/** @jsxImportSource react */
import '@vitejs/plugin-react/preamble'
import './client.css'
import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { DesktopSetup } from './DesktopSetup'
import { isPackagedDesktop } from './desktopRuntime'

// Do not initialize the web auth client on Tauri's bundled local origin.
// Lazy loading keeps App and its authentication imports out of this startup path.
const App = lazy(async () => {
  const module = await import('./App')
  return { default: module.App }
})
const packagedDesktop = isPackagedDesktop(import.meta.env.PROD, window)

// The unplugin's dev HTML injection does not apply to this hono/jsx shell, so
// the runtime is loaded from the entry instead: it fetches
// `/virtual:stylex.css` immediately after connect and on every HMR update.
if (import.meta.env.DEV) void import('virtual:stylex:runtime')

// Tauri uses a custom protocol and does not need the web app's service worker.
// Register only on HTTP(S), where browsers support PWA installation.
if (
  import.meta.env.PROD &&
  !packagedDesktop &&
  'serviceWorker' in navigator &&
  (location.protocol === 'http:' || location.protocol === 'https:')
) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js')
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {packagedDesktop ? (
      <DesktopSetup />
    ) : (
      <Suspense fallback={<p role="status">画面を読み込んでいます…</p>}>
        <App />
      </Suspense>
    )}
  </StrictMode>,
)
