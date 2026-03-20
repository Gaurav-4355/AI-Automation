// Service Worker for background notifications and interactive actions
const API_BASE_URL = 'http://localhost:8000/api';

self.addEventListener('push', (event) => {
  // Logic for push notifications (if we use a push service later)
});

self.addEventListener('notificationclick', (event) => {
  const action = event.action;
  const notification = event.notification;
  const taskId = notification.data?.taskId;

  console.log('DEBUG: Notification click received', { action, taskId });

  if (action === 'mark_done') {
    // Perform background update
    if (taskId) {
      event.waitUntil(
        fetch(`${API_BASE_URL}/tasks/${taskId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'completed' })
        })
        .then(response => {
          if (!response.ok) throw new Error('Failed to update task');
          console.log(`DEBUG: Task ${taskId} marked as done from notification`);
          
          // Notify all open tabs to refresh their data
          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({ type: 'TASK_UPDATED', taskId: taskId });
            });
          });

          // Optionally notify the user it was successful
          return self.registration.showNotification("NovaMind", {
            body: "Task marked as done successfully!",
            icon: "/favicon.svg",
            tag: "task-update-success",
            renotify: true
          });
        })
        .catch(err => {
          console.error('ERROR: Could not mark task as done from notification', err);
        })
      );
    }
  } else {
    // Normal click - open the app
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(windowClients => {
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
  notification.close();
});
