const VERSION = "talco-news-v3";
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
// Données externes : réseau d'abord, cache en secours (lecture hors ligne)
const NETWORK_FIRST_HOSTS = [
  "api.rss2json.com", "api.allorigins.win", "corsproxy.io",
  "api.coingecko.com", "api.frankfurter.dev", "api.frankfurter.app",
  "api.open-meteo.com", "earthquake.usgs.gov", "api.wikimedia.org"
];

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

  if (NETWORK_FIRST_HOSTS.includes(url.hostname)) {
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
          return res;
        })
        .catch(() => caches.match(req).then(hit => hit || Response.error()))
    );
    return;
  }

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
