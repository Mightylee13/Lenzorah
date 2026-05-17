// Basic service worker for PWA install support
const CACHE_NAME = 'runflix-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
});

self.addEventListener('fetch', (event) => {
  // Let all requests pass through to network (no offline caching for now)
  // This SW exists primarily to enable PWA install
});
