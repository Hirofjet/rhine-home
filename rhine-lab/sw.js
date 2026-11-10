const CACHE = "rhine-lab-3d-v2";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("rhine-lab-3d-") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "CLEAR_OFFLINE") return;
  event.waitUntil(
    caches.delete(CACHE).then(() => self.registration.unregister()),
  );
});

function isNavigation(request, url) {
  return request.mode === "navigate" || url.pathname.endsWith("/index.html");
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;
  if (!url.pathname.startsWith("/rhine-lab/")) return;
  if (url.pathname.endsWith("/sw.js")) return;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      if (isNavigation(request, url)) {
        try {
          const response = await fetch(request, { cache: "reload" });
          if (response.ok) cache.put(request, response.clone());
          return response;
        } catch {
          const fallback =
            (await cache.match(request, { ignoreSearch: true })) ??
            (await cache.match(new URL("/rhine-lab/index.html", location.origin), {
              ignoreSearch: true,
            }));
          if (fallback) return fallback;
          throw new Error("offline entry unavailable");
        }
      }
      const cached = await cache.match(request, { ignoreSearch: true });
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) cache.put(request, response.clone());
      return response;
    }),
  );
});
