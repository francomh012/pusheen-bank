// ================================
// SERVICE WORKER — Pusheen Bank 🐾
// ================================

const CACHE_NAME = 'pusheen-bank-v2';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/assets/css/main.css',
  '/assets/css/games.css',
  '/assets/js/main.js',
  '/assets/js/games.js',
  '/assets/img/pusheen.gif',
  '/assets/img/amigos.png',
  '/assets/img/corona1.png',
  '/assets/img/corona2.png',
  '/assets/img/juez.png',
  '/assets/img/icon.png',
  '/manifest.json',
];

// ✅ Solo cachear URLs http/https
function isCacheable(url) {
  return url.startsWith('http://') || url.startsWith('https://');
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url =>
          cache.add(url).catch(err => console.warn('No se pudo cachear:', url, err))
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = event.request.url;

  // ✅ Ignorar chrome-extension y cualquier cosa no http/https
  if (!isCacheable(url)) return;

  // Supabase, YouTube y Giphy siempre van a la red
  if (
    url.includes('supabase.co') ||
    url.includes('youtube') ||
    url.includes('giphy.com') ||
    url.includes('/api/')
  ) return;

  // Red primero, caché como respaldo
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // ✅ Solo cachear respuestas válidas de URLs http/https
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
      .catch(() => {
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
  );
});

self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});