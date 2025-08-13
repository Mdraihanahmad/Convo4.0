self.addEventListener('push', (event) => {
  try {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'New Notification';
    const options = {
      body: data.body || '',
      icon: data.icon || '/logo192.png',
      data: data.url || '/',
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch {}
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data || '/';
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientsArr => {
    const hadWindow = clientsArr.some(win => win.url.includes(url) ? (win.focus(), true) : false);
    if (!hadWindow) clients.openWindow(url);
  }));
});


