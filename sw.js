// NovoControle Service Worker - PWA & Cross-Platform Offline Support
// Compatível com Safari/WebKit iOS 12+, Chrome, Firefox, Edge
const CACHE_NAME = 'novocontrole-v6';
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

// Evento de Instalação: pre-cache de assets estáticos
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(function() {
        // skipWaiting DENTRO do waitUntil — comportamento correto no WebKit
        return self.skipWaiting();
      })
      .catch(function(err) {
        console.warn('⚠️ Service Worker: falha parcial no pre-cache:', err);
        // Garante skipWaiting mesmo em caso de erro parcial
        return self.skipWaiting();
      })
  );
});

// Evento de Ativação: limpa caches antigos
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys()
      .then(function(cacheNames) {
        return Promise.all(
          cacheNames
            .filter(function(cacheName) {
              return cacheName !== CACHE_NAME;
            })
            .map(function(cacheName) {
              return caches.delete(cacheName);
            })
        );
      })
      .then(function() {
        return self.clients.claim();
      })
  );
});

// Evento de Fetch: estratégia Network-First com fallback para cache
// Compatível com Safari iOS (não usa respondWith em requisições não-GET)
self.addEventListener('fetch', function(event) {
  // Apenas intercepta requisições HTTP/HTTPS com método GET
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  // Não intercepta requisições de extensões ou chrome-extension://
  var url = event.request.url;
  if (url.indexOf('chrome-extension') !== -1) return;
  if (url.indexOf('moz-extension') !== -1) return;

  // Estratégia: Network First, fallback para cache (ideal para Supabase + assets)
  event.respondWith(
    fetch(event.request)
      .then(function(networkResponse) {
        // Cache apenas respostas válidas de nossa origem ou CDNs (cors)
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (networkResponse.type === 'basic' || networkResponse.type === 'cors')
        ) {
          var responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(function() {
        // Sem rede: tenta servir do cache
        return caches.match(event.request).then(function(cachedResponse) {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Se for navegação e não houver cache, serve o index.html
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          // Retorna resposta vazia para outros recursos não cacheados
          return new Response('', {
            status: 408,
            statusText: 'Offline - recurso não disponível no cache'
          });
        });
      })
  );
});
