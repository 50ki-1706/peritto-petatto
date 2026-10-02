import { createAuthClient } from 'better-auth/react'

// The frontend and auth API are served from the same origin, so Better Auth
// can use the current origin and the default /api/auth base path.
export const authClient = createAuthClient()
