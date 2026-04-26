// Service Worker — hace que la app funcione offline una vez instalada.
// Cada vez que cambies el código del juego, sube el número de CACHE_VERSION
// para que los usuarios reciban la actualización.

const CACHE_VERSION = 'salon-des-des-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './Midnight_Dice_Room.mp3',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  // Fuentes de Google
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Bodoni+Moda:ital,wght@0,400;0,700;0,900;1,400&family=Cinzel:wght@500;700;900&display=swap'
];

// 1. INSTALACIÓN: cuando el navegador instala el SW por primera vez,
//    descargamos todos los archivos al caché para uso offline.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      // addAll() falla si algún recurso no carga; mejor uno a uno con catch
      return Promise.all(
        ASSETS.map((url) =>
          cache.add(url).catch((err) =>
            console.warn('No se pudo cachear', url, err)
          )
        )
      );
    })
  );
  // Activar inmediatamente sin esperar a que se cierren las pestañas viejas
  self.skipWaiting();
});

// 2. ACTIVACIÓN: borra cachés antiguas (de versiones previas)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_VERSION)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// 3. FETCH: cada vez que la app pide un archivo, primero miramos el caché.
//    Si está, lo servimos rápido. Si no, lo descargamos de internet y
//    lo guardamos en caché para la próxima.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          // Solo cachear respuestas válidas
          if (!response || response.status !== 200) return response;

          const cloned = response.clone();
          caches.open(CACHE_VERSION).then((cache) => {
            cache.put(event.request, cloned).catch(() => {});
          });
          return response;
        })
        .catch(() => {
          // Sin red y sin caché: devolvemos al menos el index si está
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
    })
  );
});
