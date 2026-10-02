const retryAfterSeconds = 60
const unknownClientKey = 'unknown-client'

type LoginRateLimiter = Pick<RateLimit, 'limit'>

export async function checkLoginRateLimit(
  request: Request,
  rateLimiter: LoginRateLimiter,
): Promise<Response | null> {
  const clientKey = request.headers.get('cf-connecting-ip') ?? unknownClientKey
  const { success } = await rateLimiter.limit({ key: clientKey })

  if (success) return null

  return Response.json(
    {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many login attempts. Please try again later.',
    },
    {
      status: 429,
      headers: { 'Retry-After': String(retryAfterSeconds) },
    },
  )
}
