/* AI Weather Station — service worker
   - handles push notifications (rain / hail / snow / wind above Beaufort 4)
   - notification click opens the app
   - precaches the app shell for offline use
*/
const CACHE_NAME = 'ai-weather-station-v15'; // bumped 20260914: temperature-honest icons — 🔥/❄️ extreme badges only at ≥30 °C / ≤0 °C (▲/▼ arrows otherwise) and snowy codes at >2 °C shown as rain, on the 🌡️ bar graph + every 5×5 map cell (front end + api/weather.js) — fresh shell so the fix ships to installed users
const APP_SHELL = [
  '/',
  '/index.html',
  '/main.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// App-shell-first fetch strategy for static assets, **network-first for the
// page itself** (HTML navigations): when you're online you always get the
// latest index.html — the cached copy is only a fallback for offline use.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Never cache API calls or third-party requests.
  if (url.pathname.startsWith('/api/') || url.origin !== self.location.origin) return;

  // Is this a page navigation (HTML document)?
  if (request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/index.html')))
    );
    return;
  }

  // Static assets: cache-first with a background refresh.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

// ----- Push notifications -----
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { title: 'Weather alert', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'AI Weather Station';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icons/icon-192.png',
    badge: payload.badge || '/icons/icon-192.png',
    data: payload.data || { url: '/' },
    tag: payload.tag || 'weather-alert',
    renotify: true,
    vibrate: [200, 100, 200]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if ('focus' in client) return client.focus();
        }
        return self.clients.openWindow(targetUrl);
      })
  );
});