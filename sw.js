// Service worker: shows reminder notifications and opens the app when one is tapped.
self.addEventListener('install', () => self.skipWaiting());
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
