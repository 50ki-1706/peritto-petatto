import { bindings, defineConfig } from 'cf/config'

export default defineConfig({
  accountId: '9135d42f432d487a4755560f331db1ae',
  worker: {
    name: 'peritto-petatto',
    compatibilityDate: '2025-08-03',
    compatibilityFlags: ['nodejs_compat'],
    entrypoint: './src/server/index.tsx',
    env: {
      BETTER_AUTH_SECRET: bindings.secret(),
      BETTER_AUTH_URL: bindings.secret(),
      GOOGLE_CLIENT_ID: bindings.secret(),
      GOOGLE_CLIENT_SECRET: bindings.secret(),
      peritto_petatto: bindings.d1({
        name: 'peritto-petatto',
        id: '9a925e04-8b23-4012-bd99-c73190548545',
      }),
      AUTH_RATE_LIMITER: bindings.rateLimit({
        namespace: '10001',
        simple: {
          limit: 20,
          period: 60,
        },
      }),
    },
  },
})
