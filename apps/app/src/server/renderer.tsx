/** @jsxImportSource hono/jsx */
import { jsxRenderer } from 'hono/jsx-renderer'
import { Link, Script, ViteClient } from 'vite-ssr-components/hono'

export const renderer = jsxRenderer(({ children }) => {
  return (
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <ViteClient />
        <Link href="/src/server/style.css" rel="stylesheet" />
        {/*
          Expression href on purpose: vite-ssr-components' auto-entry scan
          collects literal `Link href` values as client build inputs and would
          try to resolve this dev-only virtual module during the build.
        */}
        {import.meta.env.DEV ? <Link href={'/virtual:stylex.css'} rel="stylesheet" /> : null}
        <Script src="/src/client/main.tsx" />
      </head>
      <body>
        <div id="root"></div>
        {children}
      </body>
    </html>
  )
})
