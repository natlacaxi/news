const VERSION = "talco-news-v1";
const SHELL = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "icons/favicon.svg",
  "icons/favicon-32.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-512.png",
  "icons/apple-touch-icon.png"
];
const NETWORK_FIRST_HOSTS = ["api.rss2json.com", "api.allorigins.win"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Flux d'actualités : réseau d'abord, cache en secours (lecture hors ligne)
  if (NETWORK_FIRST_HOSTS.includes(url.hostname)) {
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Fichiers de l'application : réseau d'abord pour la page, cache d'abord pour le reste
  if (url.origin === location.origin) {
    if (req.mode === "navigate") {
      e.respondWith(
        fetch(req)
          .then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put("index.html", copy)); return res; })
          .catch(() => caches.match("index.html"))
      );
      return;
    }
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
        return res;
      }))
    );
  }
});
