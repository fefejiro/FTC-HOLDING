const CACHE_NAME = "garden-portal-shell-v1";
const SHELL_PATHS = [
  "/portal",
  "/garden-cleaners/portal",
  "/manifest.webmanifest",
  "/brand/garden-cleaners-mark.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_PATHS)).catch(() => Promise.resolve())
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

function isPrivateApiRequest(request) {
  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/")) return true;
  if (request.headers.get("Authorization")) return true;
  return false;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isPrivateApiRequest(request)) return;

  const isPortalShell = url.pathname === "/portal" || url.pathname === "/garden-cleaners/portal";
  const isStaticAsset = url.pathname.startsWith("/_next/") || url.pathname.startsWith("/brand/") || /\.(?:css|js|svg|png|webp|ico)$/i.test(url.pathname);

  if (!isPortalShell && !isStaticAsset) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
          }
          return response;
        })
        .catch(() => {
          if (cached) return cached;
          if (isPortalShell) {
            return caches.match("/portal").then((portalCache) => {
              if (portalCache) return portalCache;
              return new Response("Garden Cleaners portal is temporarily offline.", {
                status: 503,
                headers: { "Content-Type": "text/plain; charset=utf-8" }
              });
            });
          }
          return new Response("Offline", { status: 503 });
        });

      return cached || networkFetch;
    })
  );
});
