import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { betterAuth } from 'better-auth/minimal'
import * as schema from 'db'
import { drizzle } from 'drizzle-orm/d1'

type AuthBindings = Pick<
  Env,
  | 'BETTER_AUTH_SECRET'
  | 'BETTER_AUTH_URL'
  | 'GOOGLE_CLIENT_ID'
  | 'GOOGLE_CLIENT_SECRET'
  | 'peritto_petatto'
>

export function createAuth(env: AuthBindings) {
  const database = drizzle(env.peritto_petatto, { schema })

  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(database, {
      provider: 'sqlite',
      schema,
    }),
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    },
  })
}
