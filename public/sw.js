// ============================================================
// sw.js — BizStructure Service Worker
// Cache-first for static assets; network-only for API calls.
// Bump CACHE_NAME whenever you deploy a new version so users
// always get fresh files.
// ============================================================

const CACHE_NAME = 'bizstructure-v2';

// Pages and assets to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/analyse.html',
  '/auth.html',
  '/dashboard.html',
  '/css/style.css',
  '/js/config.js',
  '/js/auth-state.js',
  '/js/analyse.js',
  '/js/dashboard.js',
  '/manifest.json'
];

// ── Install: pre-cache core shell ────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: remove any old caches ─────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: network-first for API, cache-first for everything else ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always go to network for API calls and external CDN scripts
  if (url.pathname.startsWith('/api/') || url.origin !== self.location.origin) {
    return; // let the browser handle it normally
  }

  // Cache-first strategy for all local static assets
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      // Not in cache — fetch from network and cache for next time
      return fetch(event.request).then(response => {
        // Only cache valid 200 responses
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        return response;
      }).catch(() => {
        // Offline fallback — serve index.html for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
