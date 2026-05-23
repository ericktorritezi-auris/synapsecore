// SYNAPSE CORE — Service Worker v3.2.10
var CACHE_NAME = 'synapse-core-v4';

// Install
self.addEventListener('install', function(e) {
  self.skipWaiting();
});

// Activate
self.addEventListener('activate', function(e) {
  e.waitUntil(self.clients.claim());
});

// Push received
self.addEventListener('push', function(e) {
  var data = {};
  try { data = e.data ? e.data.json() : {}; } catch(err) {}

  var title = data.title || 'Synapse Core';
  var body  = data.body  || 'Nova notificação';
  var icon  = data.icon  || '/icons/apple-touch-icon.png';
  var badge = data.badge || '/icons/icon-96x96.png';
  var url   = data.url   || '/pacientes';

  var options = {
    body:               body,
    icon:               icon,
    badge:              badge,
    vibrate:            [200, 100, 200],
    data:               { url: url },
    actions:            [{ action: 'open', title: 'Abrir' }],
    tag:                'synapse-push',
    renotify:           true,
    requireInteraction: false,
    silent:             false
  };

  e.waitUntil(
    self.registration.showNotification(title, options).then(function() {
      return self.clients.matchAll({ includeUncontrolled: true });
    })
  );
});

// Notification click
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  var url = e.notification.data && e.notification.data.url ? e.notification.data.url : '/pacientes';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.indexOf(self.location.origin) === 0 && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
