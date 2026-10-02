/** @jsxImportSource react */
import '@vitejs/plugin-react/preamble'
import './client.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { LoginPage } from './LoginPage'

// The unplugin's dev HTML injection does not apply to this hono/jsx shell, so
// the runtime is loaded from the entry instead: it fetches
// `/virtual:stylex.css` immediately after connect and on every HMR update.
if (import.meta.env.DEV) void import('virtual:stylex:runtime')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LoginPage />
  </StrictMode>,
)
