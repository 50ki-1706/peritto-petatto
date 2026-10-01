/** @jsxImportSource hono/jsx */
import { Hono } from 'hono'
import { createAuth } from './auth'
import { renderer } from './renderer'

const app = new Hono<{ Bindings: CloudflareBindings }>()

app.all('/api/auth/*', (c) => {
  return createAuth(c.env).handler(c.req.raw)
})

app.use(renderer)

app.get('/', (c) => {
  return c.render(<></>)
})

export default app
