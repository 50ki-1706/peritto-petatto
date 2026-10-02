const CACHE_PREFIX = 'peritto-petatto-'
const STATIC_CACHE = `${CACHE_PREFIX}static-v2`
const STATIC_DESTINATIONS = new Set(['font', 'image', 'script', 'style'])

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== STATIC_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      // Cache storage is optional; failure must not block taking control.
      .catch(() => undefined)
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/') ||
    request.mode === 'navigate' ||
    !STATIC_DESTINATIONS.has(request.destination)
  ) {
    return
  }

  event.respondWith(loadStaticResource(request))
})

async function loadStaticResource(request) {
  try {
    // Revalidate fixed URLs (such as brand.png) as well as hashed assets.
    // Cached resources are a fallback, not an indefinitely stale first choice.
    const response = await fetch(request, { cache: 'no-cache' })
    if (response.ok) {
      try {
        const cache = await caches.open(STATIC_CACHE)
        await cache.put(request, response.clone())
      } catch {
        // Storage can be unavailable or full. Still return the fetched response.
      }
    }
    return response
  } catch (networkError) {
    try {
      const cache = await caches.open(STATIC_CACHE)
      const cached = await cache.match(request)
      if (cached) return cached
    } catch {
      // Preserve the original network failure if the cache is also unavailable.
    }
    throw networkError
  }
}
