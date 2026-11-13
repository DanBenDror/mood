// Service worker: shows reminder notifications and opens the app when one is tapped.
const CACHE = 'mood-v3';
const SHELL = ['./', 'index.html', 'styles.css', 'manifest.webmanifest', 'icon-180.png', 'fonts/sacramento.woff2', 'fonts/la-belle-aurore.woff2',
  'js/app.js', 'js/config.js', 'js/crypto.js', 'js/faces.js', 'js/questions.js',
  'js/reminders.js', 'js/remote.js', 'js/store.js', 'js/weather.js'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
});

// App files: use the network when it answers quickly (so updates arrive), and
// fall back to the saved copy when offline or the connection is too slow.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  const ours = url.origin === self.location.origin || url.hostname === 'cdn.jsdelivr.net';
  if (e.request.method !== 'GET' || !ours) return; // database and weather calls are never cached
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const live = fetch(e.request).then((res) => { if (res.ok) cache.put(e.request, res.clone()); return res; });
    try {
      return await Promise.race([live, new Promise((_, no) => setTimeout(() => no(new Error('slow')), 4000))]);
    } catch {
      live.catch(() => {});
      return (await cache.match(e.request, { ignoreSearch: e.request.mode === 'navigate' })) || live;
    }
  })());
});
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data.json(); } catch { /* empty push */ }
  e.waitUntil(self.registration.showNotification(d.title || 'Mood', {
    body: d.body || '', icon: 'icon-180.png', tag: d.tag || 'mood',
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
    for (const w of wins) if ('focus' in w) return w.focus();
    return self.clients.openWindow('./');
  }));
});
