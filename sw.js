// Service Worker: macht die App nach dem ersten Besuch auch ohne Netz benutzbar.
// Strategie: sofort aus dem Zwischenspeicher antworten und im Hintergrund auffrischen.
// Eine neue Version der App ist damit beim übernächsten Öffnen sichtbar.

const CACHE = 'manna-v3';
const CORE = [
  './',
  'index.html',
  'css/app.css',
  'js/app.js',
  'js/lib/bibleapp.js',
  'js/lib/dates.js',
  'js/lib/dom.js',
  'js/lib/icf.js',
  'js/lib/memory.js',
  'js/lib/plan.js',
  'js/lib/store.js',
  'js/views/today.js',
  'js/views/verse.js',
  'js/views/icf.js',
  'js/views/path.js',
  'data/plan.json',
  'data/text-luth1912.json',
  'data/text-elb1905.json',
  'data/icf.json',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function cacheable(url) {
  return url.origin === self.location.origin || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || !cacheable(url)) return;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request, { ignoreSearch: url.origin === self.location.origin });
      const refresh = fetch(request)
        .then((response) => {
          if (response.ok || response.type === 'opaque') cache.put(request, response.clone());
          return response;
        })
        .catch(() => null);
      if (cached) {
        event.waitUntil(refresh);
        return cached;
      }
      return (await refresh) || (request.mode === 'navigate' ? cache.match('index.html') : Response.error());
    }),
  );
});
