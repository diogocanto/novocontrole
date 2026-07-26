// NovoControle Service Worker - PWA & Cross-Platform Offline Support
const CACHE_NAME = 'novocontrole-v3';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './icon.png',
  './manifest.json',
  './js/app.js',
  './js/supabaseClient.js',
  './js/charts.js',
  './js/pdfGenerator.js',
  './js/bankService.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('⚠️ Service Worker: falha parcial no pre-cache inicial:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Apenas intercepta requisições HTTP/HTTPS com método GET
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http://') && !event.request.url.startsWith('https://')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Aceita respostas 200 do tipo 'basic' e 'cors' (para CDNs externos)
        if (response && response.status === 200 && (response.type === 'basic' || response.type === 'cors')) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache).catch(() => {});
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
