// ============================================================
// SERVICE WORKER — Mini Caisse PWA (v4 - full features)
// ============================================================

const CACHE_NAME = 'mini-caisse-v4';

const ASSETS_TO_PRECACHE = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// ============================================================
// INSTALL
// ============================================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// ============================================================
// ACTIVATE
// ============================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ============================================================
// FETCH — Network First pour navigation, Cache First pour assets
// ============================================================
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cached = await caches.match('./index.html');
        return cached || Response.error();
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(async cached => {
      if (cached) return cached;
      const response = await fetch(event.request);
      if (response && response.status === 200) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, response.clone());
      }
      return response;
    }).catch(() => {})
  );
});

// ============================================================
// PUSH — Notification push depuis serveur (FCM / VAPID)
// ============================================================
self.addEventListener('push', (event) => {
  let title = 'Mini Caisse';
  let body = 'Nouvelle notification';
  let url = 'https://pwa-test-fcb50.web.app/#operations';

  if (event.data) {
    try {
      const d = event.data.json();
      title = d.notification?.title || d.title || title;
      body  = d.notification?.body  || d.body  || body;
      url   = d.data?.url || d.url || url;
    } catch { body = event.data.text() || body; }
  }

  if ('setAppBadge' in self.navigator) self.navigator.setAppBadge(1).catch(() => {});

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
      vibrate: [200, 100, 200],
      tag: 'mini-caisse-notif',
      renotify: true,
      data: { url },
      actions: [
        { action: 'open', title: '📂 Ouvrir' },
        { action: 'dismiss', title: '✕ Ignorer' }
      ]
    })
  );
});

// ============================================================
// NOTIFICATION CLICK
// ============================================================
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || './';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'NOTIF_CLICKED', url });
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

// ============================================================
// BACKGROUND SYNC — Envoi différé quand connexion revenue
// ============================================================
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-operations') {
    event.waitUntil(syncOperations());
  }
});

async function syncOperations() {
  console.log('[SW] 🔄 Background sync déclenché');
  const allClients = await clients.matchAll();
  allClients.forEach(client => client.postMessage({ type: 'SYNC_DONE' }));
}

// ============================================================
// PERIODIC BACKGROUND SYNC — Tâche périodique (ex: rappel journalier)
// ============================================================
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'daily-reminder') {
    event.waitUntil(sendDailyReminder());
  }
});

async function sendDailyReminder() {
  await self.registration.showNotification('📊 Mini Caisse — Rappel', {
    body: 'N\'oubliez pas de saisir vos opérations du jour !',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    tag: 'daily-reminder',
    vibrate: [100, 50, 100],
    data: { url: './' }
  });
}

// ============================================================
// MESSAGE — Communication SW ↔ Page
// ============================================================
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();

  if (event.data?.type === 'GET_CACHE_SIZE') {
    getCacheSize().then(size => {
      event.source.postMessage({ type: 'CACHE_SIZE', size });
    });
  }

  if (event.data?.type === 'CLEAR_BADGE') {
    if ('clearAppBadge' in navigator) navigator.clearAppBadge().catch(() => {});
  }
});

async function getCacheSize() {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  return keys.length;
}
