const CACHE_NAME = "shapeforge-v2";
const APP_SHELL = ["/", "/index.html", "/icons/icon.png"];

function isCacheableResponse(response) {
  return response && response.ok && response.type !== "opaque";
}

function isApiRequest(request, url) {
  if (url.pathname.startsWith("/api/")) {
    return true;
  }

  if (request.destination !== "") {
    return false;
  }

  const accept = request.headers.get("accept") || "";
  return accept.includes("application/json");
}

async function networkFirst(request, fallbackRequest) {
  try {
    const response = await fetch(request);

    if (isCacheableResponse(response)) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }

    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    if (fallbackRequest) {
      const fallback = await caches.match(fallbackRequest);
      if (fallback) {
        return fallback;
      }
    }

    throw new Error("No cached response available");
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (isCacheableResponse(response)) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }

  return response;
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // Do not cache external requests (including Supabase) or API calls.
  if (url.origin !== self.location.origin || url.hostname.endsWith(".supabase.co") || isApiRequest(request, url)) {
    return;
  }

  // Keep app shell fresh after deployments: try network first for navigations.
  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(networkFirst(request, "/"));
    return;
  }

  // Manifest can be hashed in production (e.g. /assets/manifest-*.webmanifest).
  if (request.destination === "manifest" || url.pathname.endsWith(".webmanifest")) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Cache static same-origin assets for offline support.
  if (["script", "style", "image", "font"].includes(request.destination)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});
