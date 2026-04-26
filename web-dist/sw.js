const CACHE_NAME = 'mycompi-v2'
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET') return
  if (url.origin !== location.origin) return

  // API calls: network only
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/functions')) return

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
        }
        return response
      })
      .catch(() => {
        const cached = caches.match(request)
        if (cached) return cached
        // No cache and no network → return a minimal offline page
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
      })
  )
})