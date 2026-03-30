/* global self, clients */
self.addEventListener("push", (event) => {
  let data = { title: "傳奇公會", body: "", url: "/" };
  try {
    if (event.data) {
      const parsed = event.data.json();
      if (parsed && typeof parsed === "object") {
        data = {
          title: typeof parsed.title === "string" ? parsed.title : data.title,
          body: typeof parsed.body === "string" ? parsed.body : "",
          url: typeof parsed.url === "string" ? parsed.url : "/",
        };
      }
    }
  } catch {
    // ignore
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/192.png",
      data: { url: data.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const raw = event.notification.data && event.notification.data.url;
  const path = typeof raw === "string" && raw.startsWith("/") ? raw : "/";
  const targetUrl = new URL(path, self.location.origin).href;
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        try {
          if (client.url === targetUrl && "focus" in client) {
            return client.focus();
          }
        } catch {
          // ignore
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
      return undefined;
    }),
  );
});
