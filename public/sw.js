// public/sw.js
// Runflix Service Worker — Offline-first PWA
// Caches the app shell so the site loads without internet
// and redirects to /downloads when a page can't be fetched

const CACHE_NAME = "runflix-shell-v1";

// Core app shell files to cache on install
const SHELL_URLS = ["/", "/downloads", "/index.html"];

// ── Install: cache the app shell ─────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)),
  );
  self.skipWaiting();
});

// ── Activate: clean up old caches ────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

// ── Fetch: network first, fall back to cache, then offline page ───────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin navigation requests (page loads)
  // Let API calls, video streams, and third-party requests pass through normally
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          // Network worked — clone and cache the response
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return res;
        })
        .catch(() => {
          // No internet — try cache first
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            // Not in cache either — redirect to /downloads (offline hub)
            return caches.match("/downloads") || caches.match("/index.html");
          });
        }),
    );
    return;
  }

  // For static assets (JS, CSS, images) — cache first, then network
  if (
    url.origin === self.location.origin &&
    (url.pathname.endsWith(".js") ||
      url.pathname.endsWith(".css") ||
      url.pathname.endsWith(".png") ||
      url.pathname.endsWith(".jpg") ||
      url.pathname.endsWith(".webp") ||
      url.pathname.endsWith(".svg") ||
      url.pathname.endsWith(".ico") ||
      url.pathname.endsWith(".woff2"))
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return res;
        });
      }),
    );
  }

  // Everything else (API calls, video streams) — network only, no interference
});
