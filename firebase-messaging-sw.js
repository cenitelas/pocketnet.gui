importScripts('./js/vendor/firebase-app.js');
importScripts('./js/vendor/firebase-messaging.js');

firebase.initializeApp({
  messagingSenderId: "1020521924918",
  projectId: 'pocketnet',
  apiKey: 'AIzaSyC_Jeet2gpKRZp44iATwlFFA7iGNYsabkk',
  appId: '1:1020521924918:ios:ab35cc84f0d10d86aacb97',
});

const messaging = firebase.messaging();
const url = new URL(self.serviceWorker?.scriptURL || "");

messaging.onBackgroundMessage(function(payload) {
  const notificationTitle = payload?.data?.title;
  const notificationOptions = {
    body: payload?.data?.body,
    icon: payload?.data?.image || `${url.origin}/img/logo_color/blue_250.png`,
  };

  return self.registration.showNotification(
      notificationTitle,
      notificationOptions,
  );
});

self.addEventListener('notificationclick', function(event) {
  const notificationUrl = `${url.origin}/userpage?id=notifications&report=notifications`
  event.notification.close();
  event.waitUntil(clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then(function(clientList) {
    for (var i = 0; i < clientList.length; i++) {
      var client = clientList[i];
      if (client.url === notificationUrl && 'focus' in client) {
        return client.focus();
      }
    }
    return clients.openWindow(notificationUrl);
  }));
});