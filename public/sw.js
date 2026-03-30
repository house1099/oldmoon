/* global self, clients, navigator */
self.addEventListener("push", (event) => {
  let data = { title: "傳奇公會", body: "", url: "/" };
  /** @type {number | undefined} */
  let unreadCount;
  try {
    if (event.data) {
      const parsed = event.data.json();
      if (parsed && typeof parsed === "object") {
        data = {
          title: typeof parsed.title === "string" ? parsed.title : data.title,
          body: typeof parsed.body === "string" ? parsed.body : "",
          url: typeof parsed.url === "string" ? parsed.url : "/",
        };
        if (typeof parsed.unreadCount === "number" && !Number.isNaN(parsed.unreadCount)) {
          unreadCount = parsed.unreadCount;
        }
      }
    }
  } catch {
    // ignore
  }

  const show = self.registration.showNotification(data.title, {
    body: data.body,
    icon: "/icons/192.png",
    data: { url: data.url },
  });

  const badge =
    unreadCount === undefined
      ? Promise.resolve()
      : syncAppBadgeFromUnreadCount(unreadCount);

  event.waitUntil(Promise.all([show, badge]));
});

/**
 * @param {number} raw
 * @returns {Promise<void>}
 */
function syncAppBadgeFromUnreadCount(raw) {
  if (typeof navigator.setAppBadge !== "function") {
    return Promise.resolve();
  }
  const nav = navigator;
  const capped = Math.min(Math.max(0, Math.floor(raw)), 99);
  return Promise.resolve().then(async () => {
    try {
      if (capped <= 0) {
        if (typeof nav.clearAppBadge === "function") {
          await nav.clearAppBadge();
        }
      } else {
        await nav.setAppBadge(capped);
      }
    } catch {
      // ignore
    }
  });
}

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
