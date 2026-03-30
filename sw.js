// ================================
// SERVICE WORKER — Pusheen Bank 🐾
// ================================

const CACHE_NAME = 'pusheen-bank-v5';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/assets/css/main.css',
  '/assets/css/games.css',
  '/assets/css/journey.css',
  '/assets/css/flappy.css',
  '/assets/js/main.js',
  '/assets/js/games.js',
  '/assets/js/config.js',
  '/assets/js/rewards.js',
  '/assets/js/journey.js',
  '/assets/js/supabase-client.js',
  '/assets/img/pusheen.gif',
  '/assets/img/amigos.png',
  '/assets/img/corona1.png',
  '/assets/img/corona2.png',
  '/assets/img/juez.png',
  '/assets/img/icon.png',
  '/assets/img/patita.png',
  '/assets/img/globo1.gif',
  '/assets/img/globo2.gif',
  '/assets/img/avion1.gif',
  '/manifest.json',
];

function isCacheable(url) {
  return url.startsWith('http://') || url.startsWith('https://');
}

// ==========================
// INSTALL
// ==========================
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(
        ASSETS_TO_CACHE.map(url =>
          cache.add(url).catch(err => console.warn('No se pudo cachear:', url, err))
        )
      )
    )
  );
  self.skipWaiting();
});

// ==========================
// ACTIVATE
// ==========================
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ==========================
// FETCH
// ==========================
self.addEventListener('fetch', event => {
  const url = event.request.url;
  if (!isCacheable(url)) return;
  if (
    url.includes('supabase.co') ||
    url.includes('youtube') ||
    url.includes('giphy.com') ||
    url.includes('/api/')
  ) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (
          response &&
          response.status === 200 &&
          response.type !== 'opaque' &&
          isCacheable(event.request.url)
        ) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone).catch(() => {});
          });
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then(cached => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') return caches.match('/index.html');
        })
      )
  );
});

// ==========================
// PUSH
// ==========================
self.addEventListener('push', event => {
  if (!event.data) return;

  let data;
  try { data = event.data.json(); }
  catch { data = { title: 'Pusheen Bank 🐾', body: event.data.text() }; }

  const options = {
    body:    data.body || '¡Hay novedades!',
    icon:    data.icon || '/assets/img/icon.png',
    badge:   '/assets/img/icon.png',
    data:    { url: data.url || '/' },
    vibrate: [200, 100, 200],
    actions: [
      { action: 'open',  title: 'Ver ahora 🐾' },
      { action: 'close', title: 'Cerrar' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Pusheen Bank 🐾', options)
  );
});

// ==========================
// CLICK en notificación
// ==========================
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'close') return;

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes('pusheen-bank') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// ==========================
// MENSAJE (actualización PWA)
// ==========================
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});