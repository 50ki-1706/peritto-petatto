import { expect, it, vi } from 'vite-plus/test'
import { checkLoginRateLimit } from './loginRateLimit'

function createRateLimiter(success: boolean) {
  return {
    limit: vi.fn(async () => ({ success })),
  }
}

it('allows login when the client is within the limit', async () => {
  const rateLimiter = createRateLimiter(true)
  const request = new Request('https://example.com/api/auth/sign-in/social', {
    headers: { 'cf-connecting-ip': '192.0.2.1' },
  })

  await expect(checkLoginRateLimit(request, rateLimiter)).resolves.toBeNull()
  expect(rateLimiter.limit).toHaveBeenCalledWith({ key: '192.0.2.1' })
})

it('returns 429 with retry information when the limit is exceeded', async () => {
  const rateLimiter = createRateLimiter(false)
  const response = await checkLoginRateLimit(
    new Request('https://example.com/api/auth/sign-in/social'),
    rateLimiter,
  )

  expect(response?.status).toBe(429)
  expect(response?.headers.get('Retry-After')).toBe('60')
  await expect(response?.json()).resolves.toEqual({
    code: 'TOO_MANY_REQUESTS',
    message: 'Too many login attempts. Please try again later.',
  })
  expect(rateLimiter.limit).toHaveBeenCalledWith({ key: 'unknown-client' })
})
