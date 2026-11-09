// Service worker: guarda la app en caché para que funcione sin conexión.
const VERSION = "v1";
const CACHE = "mi-consola-" + VERSION;
const BASICOS = [
  "./", "index.html", "play.html", "app.css", "app.js", "db.js", "gratis.js", "manifest.webmanifest",
  "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png",
  "data/loader.js", "data/emulator.css", "data/localization/es-ES.json",
  "data/src/emulator.js", "data/src/nipplejs.js", "data/src/shaders.js", "data/src/storage.js",
  "data/src/gamepad.js", "data/src/GameManager.js", "data/src/socket.io.min.js", "data/src/compression.js"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASICOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith("mi-consola-") && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  // Páginas: primero la red (para recibir actualizaciones), si no hay conexión, la caché.
  if (e.request.mode === "navigate" || url.pathname.endsWith(".json")) {
    e.respondWith(
      fetch(e.request).then(r => {
        const copia = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, copia));
        return r;
      }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match("index.html")))
    );
    return;
  }
  // Resto (scripts, núcleos de emulación): primero la caché.
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      if (res.ok) {
        const copia = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copia));
      }
      return res;
    }))
  );
});
