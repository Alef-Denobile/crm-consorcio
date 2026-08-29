const CACHE_NAME = 'painel-crm-v1';
const ASSETS_ESSENCIAIS = ['/index.html', '/css/style.css', '/js/script.js'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_ESSENCIAIS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // chamadas de API nunca vêm do cache — precisam sempre do dado mais atual do servidor
  if (url.pathname.startsWith('/api/')) return;
  event.respondWith(caches.match(event.request).then((resposta) => resposta || fetch(event.request)));
});
