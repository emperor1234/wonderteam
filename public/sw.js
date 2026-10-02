// Bump when the shell or precache list changes so existing installs pick up the
// new worker instead of staying on the old cached app shell.
const CACHE_NAME = 'wonderteam-cache-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest'
];

// A notification click re-focuses an existing tab and asks it to switch views,
// falling back to opening the app with the target view in the query string.
function focusOrOpenApp(link) {
  const target = typeof link === 'string' && link ? link : 'home';
  return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
    for (const client of clientList) {
      if ('focus' in client) {
        client.postMessage({ type: 'NOTIFICATION_CLICK', link: target });
        return client.focus();
      }
    }
    return self.clients.openWindow(`/?view=${encodeURIComponent(target)}`);
  });
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Never cache API routes: chat sync and auth must always hit the network, and a
  // cached reply could resurrect a session the server has already ended.
  if (event.request.url.includes('/api/')) {
    return;
  }

  // Navigations are network-first. The app shell is not content-hashed, so a
  // cached copy would keep referencing asset filenames from the previous deploy
  // (including the SQLite worker and wasm), which no longer exist after a build.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
          }
          return networkResponse;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Hashed assets are immutable, so cache-first with a background refresh is safe.
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});

// -------------------------------------------------------------
// WEB PUSH
// -------------------------------------------------------------

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (err) {
    payload = { title: 'WonderTeam', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'WonderTeam';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/icon-192.png',
    tag: payload.tag || 'wonderteam',
    renotify: payload.renotify !== false,
    requireInteraction: payload.requireInteraction === true,
    data: {
      link: (payload.data && payload.data.link) || payload.link || 'home',
      notificationId: payload.data && payload.data.notificationId,
      type: (payload.data && payload.data.type) || 'system',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || 'home';
  event.waitUntil(focusOrOpenApp(link));
});

// Lets an open tab raise a notification through the service worker, which is
// how reminders reach members who granted permission but keep the app open.
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SHOW_NOTIFICATION') {
    event.waitUntil(
      self.registration.showNotification(data.title || 'WonderTeam', {
        body: data.body || '',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: data.tag || `wonderteam-${data.id || Date.now()}`,
        data: { link: data.link || 'home', notificationId: data.id },
      })
    );
  }
});
