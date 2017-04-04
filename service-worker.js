// when the user clicks the notif
self.addEventListener('notificationclick', function(event) {
  if (event.action) {
    event.notification.close();

    fetch('./action', {
      method: 'post',
      headers: {
        'Content-type': 'application/json'
      },
      body: JSON.stringify({
        endpoint: event.notification.tag,
        action: event.action
      })
    })
    .catch(error => console.error);
  }
});

// send through a push notif from the server
self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  const data = event.data.json();

  self.clients.matchAll().then(clients => {
    if (clients) {
      clients[0].postMessage(data);
    }
  });

  self.registration.showNotification(data.title, data);
});
