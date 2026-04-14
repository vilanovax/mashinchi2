// Mashinchi PWA Service Worker v2
const VERSION = "v2";
const STATIC_CACHE = `mashinchi-static-${VERSION}`;
const RUNTIME_CACHE = `mashinchi-runtime-${VERSION}`;
const IMAGE_CACHE = `mashinchi-images-${VERSION}`;
const OFFLINE_PAGE = "/offline";

const STATIC_ASSETS = [
  "/",
  "/catalog",
  "/market",
  "/profile",
  "/offline",
  "/manifest.json",
  "/icon-192.svg",
];

// ── Install: pre-cache shell ──
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      Promise.all(STATIC_ASSETS.map((url) => cache.add(url).catch(() => null)))
    )
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ──
self.addEventListener("activate", (event) => {
  const validCaches = [STATIC_CACHE, RUNTIME_CACHE, IMAGE_CACHE];
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !validCaches.includes(k)).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: smart strategies by resource type ──
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== location.origin) return;

  // API: network-first with cache fallback (skip admin)
  if (url.pathname.startsWith("/api/")) {
    if (url.pathname.startsWith("/api/admin/")) return;
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || new Response(
          JSON.stringify({ error: "offline" }),
          { status: 503, headers: { "Content-Type": "application/json" } }
        )))
    );
    return;
  }

  // Images: cache-first
  if (request.destination === "image" || /\.(png|jpg|jpeg|webp|svg|gif|avif)$/.test(url.pathname)) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.ok) cache.put(request, response.clone());
          return response;
        } catch {
          return cached || new Response("", { status: 404 });
        }
      })
    );
    return;
  }

  // HTML/navigation: network-first with offline fallback
  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const offline = await caches.match(OFFLINE_PAGE);
          return offline || new Response("آفلاین", { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });
        })
    );
    return;
  }

  // JS/CSS/Fonts: stale-while-revalidate
  event.respondWith(
    caches.open(RUNTIME_CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
