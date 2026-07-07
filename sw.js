/* Aprendalia · Service Worker
   Precachea el núcleo de la app y cachea las fuentes en tiempo real,
   para que la app funcione sin conexión tras la primera visita. */

const CACHE = 'aprendalia-v2';
const NUCLEO = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(NUCLEO)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Fuentes de Google: caché en tiempo real (stale-while-revalidate)
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(CACHE).then(async (c) => {
        const cacheado = await c.match(e.request);
        const red = fetch(e.request).then((resp) => {
          if (resp && resp.ok) c.put(e.request, resp.clone());
          return resp;
        }).catch(() => cacheado);
        return cacheado || red;
      })
    );
    return;
  }

  // Mismo origen: caché primero, red de respaldo (y refresco del index)
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(e.request).then((cacheado) => {
        const red = fetch(e.request).then((resp) => {
          if (resp && resp.ok) {
            caches.open(CACHE).then((c) => c.put(e.request, resp.clone()));
          }
          return resp;
        }).catch(() => cacheado);
        return cacheado || red;
      })
    );
  }
});
