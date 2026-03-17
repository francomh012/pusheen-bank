// ================================
// SERVICE WORKER — Pusheen Bank 🐾
// ================================

const CACHE_NAME = 'pusheen-bank-v1';

// Archivos que se guardan para funcionar sin internet
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/assets/css/main.css',
  '/assets/js/main.js',
  '/assets/img/pusheen.gif',
  '/assets/img/amigos.png',
  '/assets/img/corona1.png',
  '/assets/img/corona2.png',
  '/assets/img/juez.png',
  '/assets/img/icon.png',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap',
];

// Instalar — guarda archivos en caché
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('🐾 Pusheen Bank: cacheando archivos...');
      // Cachear uno por uno para no fallar si alguno no existe
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url =>
          cache.add(url).catch(err => console.warn('No se pudo cachear:', url, err))
        )
      );
    })
  );
  self.skipWaiting();
});

// Activar — limpia cachés viejas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('🐾 Borrando caché vieja:', key);
            return caches.delete(key);
          })
      )
    )
  );
  self.clients.claim();
});

// Fetch — estrategia: Network first, cache como fallback
// Para Supabase siempre va a la red (datos en tiempo real)
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Supabase y YouTube siempre van a la red
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('youtube') ||
    url.hostname.includes('giphy.com')
  ) {
    return; // fetch normal sin interceptar
  }

  // Para todo lo demás: red primero, caché como respaldo
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Si la respuesta es válida, la guarda en caché
        if (response && response.status === 200 && response.type !== 'opaque') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Sin internet, busca en caché
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // Si es una navegación y no hay caché, muestra index
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
  );
});

// Notificación de nueva versión disponible
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});