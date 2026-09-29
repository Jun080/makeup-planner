// Service worker minimal : met en cache l'appli pour qu'elle s'ouvre vite.
// Les données (Supabase) passent toujours par le réseau.
const CACHE = 'makeup-planner-v2'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return
  // Réseau d'abord, cache en secours (hors-ligne)
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put(e.request, copy))
        return res
      })
      .catch(() => caches.match(e.request)),
  )
})

// Notification envoyée par le serveur (résumé du matin / rappel du soir)
self.addEventListener('push', (e) => {
  const data = e.data ? e.data.json() : {}
  e.waitUntil(
    self.registration.showNotification(data.title || '💄 Makeup Planner', {
      body: data.body || '',
      icon: 'icon-192.png',
      tag: data.tag,
      data: { url: data.url || './' },
    }),
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = e.notification.data?.url || './'
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((cs) => (cs[0] ? cs[0].focus() : self.clients.openWindow(url))),
  )
})
