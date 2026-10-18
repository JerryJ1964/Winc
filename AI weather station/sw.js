/* AI Weather Station — service worker
   - handles push notifications (rain / hail / snow / wind above Beaufort 4)
   - notification click opens the app
   - precaches the app shell for offline use
*/
const CACHE_NAME = 'ai-weather-station-v36'; // v36: 📦 index.html split into index.html (markup) + app.js + style.css so the 783 KB no-cache HTML is gone — repeat loads are cache-first and fast; the 🌤️ emoji weather icons are back (the SVG conversion hid most of them); v35: 🌌 auroras stand at real altitude — the flat ground tint is gone; each view ray is marched through a 90–500 km shell (green 557.7 nm floor, violet/red 630.0 nm tops) so curtains rise above the oval, parallax with the globe and peek over the limb; v34: 👆 map tap actually changes the weather — tap keeps its pin (numeric compare + keepMapPin), cancels stale search debounce, outranks late GPS fixes (gpsIntent guard), GPS abandoned on tap; v33: 📍 iOS location fix — fast low-power fix first (1-2 s not 18 s), safety timers so Safari can never hang, iOS-safe fetch timeouts, instant first weather paint, input stays usable while locating; v32: 🚫 the weather panel is never wiped by a red "Error loading weather data." line again — a failed (auto-)refresh keeps the last good data on screen, manual update failures report under the search box instead; v31: 🌋 lava + ash always visible on volcano cones — floor the report-age intensity (ember) so an EONET event last updated months ago still shows a glowing crater, lava streams/fountain and a smoke plume instead of a bare cone; v30: 🗺️ country borders on the globe — Natural Earth coastlines + shared land borders drawn over the imagery (1:110m always, lazily upgraded to 1:50m past 3× zoom), with a legend chip to switch them off; the coarse outlines are precached for offline
const APP_SHELL = [
  '/',
  '/index.html',
  '/app.js',
  '/style.css',
  '/main.js',
  '/manifest.json',
  '/data/countries-110m.json',
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