// VoiceMind Service Worker — Offline-first with Network-first fallback
const CACHE_NAME = 'voicemind-v3';
const STATIC_ASSETS = [
  '/',
  '/library',
  '/calendar',
  '/inspiration',
  '/settings',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// Install: Pre-cache static shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Non-critical: some pages may need auth
        console.log('[SW] Some static assets skipped (auth required)');
      });
    })
  );
  self.skipWaiting();
});

// Activate: Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: Network-first for API, Cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (POST for transcription, etc.)
  if (request.method !== 'GET') return;

  // Skip API routes — always go to network
  if (url.pathname.startsWith('/api/')) return;

  // Skip auth-related routes
  if (url.pathname === '/login') return;

  // For page navigations: Network-first, fallback to cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful page responses
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // Offline: serve from cache
          return caches.match(request).then((cached) => {
            return cached || caches.match('/');
          });
        })
    );
    return;
  }

  // For static assets (JS, CSS, images, fonts): Cache-first
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff2?|ttf)$/) ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }
});

// Background sync: queue offline recordings for later upload
self.addEventListener('message', (event) => {
  if (event.data?.type === 'CACHE_VERSION') {
    event.ports[0]?.postMessage({ version: CACHE_NAME });
  }
});
