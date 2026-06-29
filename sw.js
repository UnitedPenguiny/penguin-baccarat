const CACHE_NAME = 'penguin-baccarat-v2';
const ASSETS = [
  './',
  './penguin-baccarat.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700;900&display=swap',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      // Cache each asset independently so one slow/failed request (e.g. the
      // Google Fonts CSS) can't abort the whole install and leave us with no
      // offline copy. Runtime caching self-heals anything missed.
      Promise.all(ASSETS.map(u =>
        cache.add(new Request(u, { cache: 'reload' })).catch(() => {})
      ))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(Promise.all([
    self.clients.claim(),
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  ]));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      // Stale-while-revalidate: serve cache instantly, refresh in background.
      const fetched = fetch(e.request).then(res => {
        if (res && (res.ok || res.type === 'opaque')) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || fetched;
    }).catch(() =>
      // Navigation offline with no exact match → fall back to the app shell.
      caches.match('./penguin-baccarat.html').then(r => r || new Response('Offline', { status: 503 }))
    )
  );
});
