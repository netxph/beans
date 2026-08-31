const CACHE_NAME = 'beans-kids-arcade-v13';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './images/jungle.png',
  './images/icon.svg',
  './king-of-the-jungle/index.html',
  './king-of-the-jungle/game.mjs',
  './king-of-the-jungle/logic.mjs',
  './king-of-the-jungle/questions.yaml',
  './jungle-rush/index.html',
  './mully/index.html',
  './mully/mully.jsx',
  './flies-invasion/index.html',
  './flies-invasion/flies-invasion.jsx'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  const freshContent = req.destination === 'document'
    || req.destination === 'script'
    || req.destination === 'style';

  event.respondWith(
    (freshContent
      ? fetch(req, { cache: 'no-store' })
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
            return res;
          })
          .catch(() => caches.match(req))
      : caches.match(req).then((cached) => cached || fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        }))
    ).catch(() => caches.match('./index.html'))
  );
});
