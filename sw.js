// Service worker — cache app shell for offline use
const CACHE = 'kegi-v3';
const SHELL = [
  '/',
  '/index.html',
  '/habbit.html',
  '/gym.html',
  '/nutrient.html',
  '/topbar.js',
  '/sync.js',
  '/manifest.json',
  '/icon.svg',
];

// Install: pre-cache app shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

// Activate: delete old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch: serve from cache instantly, refresh in background (stale-while-revalidate)
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Skip cross-origin requests (Supabase, USDA API, CDNs)
  if (!e.request.url.startsWith(self.location.origin)) return;

  e.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(e.request).then(cached => {
        const network = fetch(e.request).then(resp => {
          if (resp && resp.ok) cache.put(e.request, resp.clone());
          return resp;
        }).catch(() => null);
        return cached || network;
      })
    )
  );
});

// Show a local notification on behalf of the page
self.addEventListener('message', e => {
  if (!e.data || e.data.type !== 'SHOW_NOTIFICATION') return;
  self.registration.showNotification(e.data.title, {
    body:    e.data.body    || '',
    icon:    e.data.icon    || '/icon.svg',
    badge:   '/icon.svg',
    vibrate: [200, 100, 200],
  });
});

// Handle notification tap — bring the app to the foreground
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if ('focus' in c) return c.focus();
      }
      return clients.openWindow('/');
    })
  );
});
