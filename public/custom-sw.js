// Custom service worker — extended by next-pwa (InjectManifest mode).
// Workbox is injected automatically by next-pwa at build time.

// ── Precache manifest (injected by next-pwa at build) ──────────────────────
self.__WB_MANIFEST

// ── Runtime caching ────────────────────────────────────────────────────────

// Static Next.js chunks — cache-first, long TTL
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)

  // Skip non-GET and chrome-extension
  if (event.request.method !== 'GET') return
  if (url.protocol === 'chrome-extension:') return

  // Next.js static assets — cache-first
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open('next-static-v1').then(async cache => {
        const cached = await cache.match(event.request)
        if (cached) return cached
        const res = await fetch(event.request)
        if (res.ok) cache.put(event.request, res.clone())
        return res
      })
    )
    return
  }

  // Images — cache-first with 7-day expiry
  if (/\.(png|jpg|jpeg|svg|gif|webp|ico)(\?.*)?$/.test(url.pathname)) {
    event.respondWith(
      caches.open('images-v1').then(async cache => {
        const cached = await cache.match(event.request)
        if (cached) return cached
        try {
          const res = await fetch(event.request)
          if (res.ok) cache.put(event.request, res.clone())
          return res
        } catch {
          return new Response('', { status: 408 })
        }
      })
    )
    return
  }

  // API routes — network-first, no cache fallback
  if (url.pathname.startsWith('/api/')) return

  // HTML pages — stale-while-revalidate
  if (event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      caches.open('pages-v1').then(async cache => {
        const cached = await cache.match(event.request)
        const fetchPromise = fetch(event.request).then(res => {
          if (res.ok) cache.put(event.request, res.clone())
          return res
        }).catch(() => cached ?? new Response('Hors connexion', { status: 503 }))
        return cached ?? fetchPromise
      })
    )
  }
})

// ── Push notifications ──────────────────────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return
  let data
  try { data = event.data.json() }
  catch { data = { title: 'CodePromoReduc', body: event.data.text(), url: '/' } }

  event.waitUntil(
    self.registration.showNotification(data.title ?? 'CodePromoReduc', {
      body:    data.body  ?? '',
      icon:    '/icons/icon-192.png',
      badge:   '/icons/badge-72.png',
      image:   data.image  ?? undefined,
      data:    { url: data.url ?? '/' },
      tag:     data.tag    ?? 'codepromo',
      renotify: true,
      actions: [
        { action: 'view',    title: 'Voir le code' },
        { action: 'dismiss', title: 'Ignorer'      },
      ],
    })
  )
})

// Notification click → open/focus the deal URL
self.addEventListener('notificationclick', event => {
  event.notification.close()
  if (event.action === 'dismiss') return
  const url = event.notification.data?.url ?? '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url === url && 'focus' in c) return c.focus()
      }
      return clients.openWindow(url)
    })
  )
})
