// Custom service worker — extended with push notification support.
// next-pwa is configured with swSrc pointing here.

// Push event: show notification
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

// Notification click: navigate to deal URL
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
