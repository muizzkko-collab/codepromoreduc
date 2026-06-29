/**
 * Push notification handler — merged into the next-pwa service worker
 * via importScripts (see public/worker.js).
 *
 * This file handles:
 *   - push events (show notification)
 *   - notificationclick (open URL or dismiss)
 *   - offline fallback page
 */

self.addEventListener('push', event => {
  if (!event.data) return
  let data
  try { data = event.data.json() }
  catch { data = { title: 'CodePromoReduc', body: event.data.text(), url: '/' } }

  const options = {
    body:    data.body  ?? '',
    icon:    '/icons/icon-192.png',
    badge:   '/icons/badge-72.png',
    image:   data.image ?? undefined,
    data:    { url: data.url ?? '/' },
    tag:     data.tag   ?? 'codepromo-notification',
    renotify: true,
    requireInteraction: false,
    actions: [
      { action: 'view',    title: 'Voir le code' },
      { action: 'dismiss', title: 'Ignorer'      },
    ],
  }

  event.waitUntil(
    self.registration.showNotification(data.title ?? 'CodePromoReduc', options)
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  if (event.action === 'dismiss') return

  const url = event.notification.data?.url ?? '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus()
      }
      return clients.openWindow(url)
    })
  )
})
