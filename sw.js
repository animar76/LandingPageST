const CACHE_NAME = "st-cache-v1";
const URLS = [
  "/",
  "/index.html",
  "/login.html",
  "/admin.html",
  "/styles.css",
  "/script.js",
  "/logo-st.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS))
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then(resp => resp || fetch(e.request))
  );
});
