/** @jsxImportSource hono/jsx */
import { jsxRenderer } from 'hono/jsx-renderer'
import { Link, Script, ViteClient } from 'vite-ssr-components/hono'

export const renderer = jsxRenderer(({ children }) => {
  return (
    <html>
      <head>
        <ViteClient />
        <Link href="/src/server/style.css" rel="stylesheet" />
        <Script src="/src/client/main.tsx" />
      </head>
      <body>
        <div id="root"></div>
        {children}
      </body>
    </html>
  )
})
