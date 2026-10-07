/* ProMan shell SW — never cache HTML; only fingerprinted static assets. */
const CACHE = "proman-shell-v3";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function isNavigation(req) {
  return req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html");
}

function isHashedAsset(url) {
  return url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/fonts/");
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // HTML / navigations: network only — never cache index (avoids stale Vite hashes on iOS)
  if (isNavigation(req) || url.pathname === "/" || url.pathname.endsWith(".html")) {
    event.respondWith(fetch(req));
    return;
  }

  // Fingerprinted static assets: cache-first is safe
  if (isHashedAsset(url)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, clone));
          }
          return res;
        });
      })
    );
  }
});
