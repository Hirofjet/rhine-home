/* HIROFJET ADMIN service worker：安装、离线壳与 Web Push。 */
const CACHE = 'hirofjet-admin-v1'
const SHELL = ['./app/', './app-manifest.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match('./app/').then((cached) => cached || Response.error()),
      ),
    )
  }
})

function targetUrl(raw) {
  const path = String(raw || './').replace(/^\/+/, '') || './'
  try {
    return new URL(path, self.registration.scope).href
  } catch {
    return self.registration.scope
  }
}

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }
  const title = data.title || 'HIROFJET ADMIN'
  const options = {
    body: data.body || '有新的管理消息',
    icon: new URL('../icons/icon-192.png', self.registration.scope).href,
    badge: new URL('../icons/icon-48.png', self.registration.scope).href,
    tag: data.tag || 'admin',
    renotify: true,
    requireInteraction: true,
    data: { url: targetUrl(data.url) },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || self.registration.scope
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.startsWith(self.registration.scope)) {
            client.focus()
            client.navigate(url)
            return undefined
          }
        }
        return self.clients.openWindow(url)
      }),
  )
})
