/** @jsxImportSource hono/jsx */
import { Hono } from 'hono'
import { createAuth } from './auth'
import { checkLoginRateLimit } from './loginRateLimit'
import { notesApi } from './notesApi'
import { renderer } from './renderer'

const app = new Hono<{ Bindings: Env }>()

app.use('/api/auth/sign-in/social', async (c, next) => {
  if (c.req.method !== 'POST') return next()

  const rateLimitResponse = await checkLoginRateLimit(c.req.raw, c.env.AUTH_RATE_LIMITER)
  if (rateLimitResponse) return rateLimitResponse

  return next()
})

app.all('/api/auth/*', (c) => {
  return createAuth(c.env).handler(c.req.raw)
})

app.route('/api/notes', notesApi)

app.use(renderer)

app.get('/', (c) => {
  return c.render(<></>)
})

export default app
