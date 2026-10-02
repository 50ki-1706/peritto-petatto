import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { expect, it, vi } from 'vite-plus/test'

const source = readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8')

type TestRequest = {
  url: string
  method: string
  mode: string
  destination: string
}

type FetchListener = (event: {
  request: TestRequest
  respondWith: (response: Promise<Response>) => void
}) => void

function worker(cached?: Response) {
  const listeners = new Map<string, FetchListener>()
  const cache = {
    match: vi.fn(async () => cached),
    put: vi.fn(async (_request: TestRequest, _response: Response) => undefined),
  }
  const caches = {
    open: vi.fn(async () => cache),
    keys: vi.fn(async () => []),
    delete: vi.fn(async () => true),
  }
  const fetch = vi.fn(async () => new Response('fresh'))
  runInNewContext(source, {
    URL,
    caches,
    fetch,
    self: {
      location: { origin: 'https://example.com' },
      addEventListener: (name: string, listener: FetchListener) => {
        listeners.set(name, listener)
      },
      skipWaiting: async () => undefined,
      clients: { claim: async () => undefined },
    },
  })

  function request(overrides: Partial<TestRequest> = {}) {
    const request = {
      url: 'https://example.com/brand.png',
      method: 'GET',
      mode: 'cors',
      destination: 'image',
      ...overrides,
    }
    const respondWith = vi.fn<(response: Promise<Response>) => void>()
    listeners.get('fetch')!({ request, respondWith })
    return { request, respondWith, response: respondWith.mock.calls[0]?.[0] }
  }

  return { cache, caches, fetch, request }
}

it('revalidates a fixed URL and returns fresh content instead of a stale cache hit', async () => {
  const runtime = worker(new Response('old logo'))
  const result = runtime.request()
  expect(await (await result.response)!.text()).toBe('fresh')
  expect(runtime.fetch).toHaveBeenCalledWith(result.request, { cache: 'no-cache' })
  expect(runtime.cache.match).not.toHaveBeenCalled()
  expect(runtime.cache.put).toHaveBeenCalledOnce()
  expect(await runtime.cache.put.mock.calls[0]![1].text()).toBe('fresh')
})

it('returns the fetched response when cache storage cannot be opened', async () => {
  const runtime = worker()
  runtime.caches.open.mockRejectedValue(new Error('storage unavailable'))
  expect(await (await runtime.request().response)!.text()).toBe('fresh')
})

it('returns the fetched response when storing it exceeds the quota', async () => {
  const runtime = worker()
  runtime.cache.put.mockRejectedValue(new Error('QuotaExceededError'))
  expect(await (await runtime.request().response)!.text()).toBe('fresh')
})

it('uses the cached response when the network fails', async () => {
  const runtime = worker(new Response('cached logo'))
  runtime.fetch.mockRejectedValue(new Error('offline'))
  expect(await (await runtime.request().response)!.text()).toBe('cached logo')
})

it('preserves the network error when reading the cache also fails', async () => {
  const runtime = worker()
  const networkError = new Error('offline')
  runtime.fetch.mockRejectedValue(networkError)
  runtime.cache.match.mockRejectedValue(new Error('cache read failed'))
  await expect(runtime.request().response).rejects.toBe(networkError)
})

it('preserves the network error when opening the fallback cache fails', async () => {
  const runtime = worker()
  const networkError = new Error('offline')
  runtime.fetch.mockRejectedValue(networkError)
  runtime.caches.open.mockRejectedValue(new Error('cache open failed'))
  await expect(runtime.request().response).rejects.toBe(networkError)
})

it('does not store an unsuccessful HTTP response', async () => {
  const runtime = worker()
  runtime.fetch.mockResolvedValue(new Response('not found', { status: 404 }))
  expect((await runtime.request().response)!.status).toBe(404)
  expect(runtime.caches.open).not.toHaveBeenCalled()
})

it.each([
  { url: 'https://example.com/api/notes', destination: 'script' },
  { url: 'https://other.example/brand.png' },
  { method: 'POST' },
  { mode: 'navigate' },
  { destination: '' },
])('does not intercept requests outside the static-resource scope: %j', (overrides) => {
  const runtime = worker()
  const result = runtime.request(overrides)
  expect(result.respondWith).not.toHaveBeenCalled()
  expect(runtime.fetch).not.toHaveBeenCalled()
  expect(runtime.caches.open).not.toHaveBeenCalled()
})
