/* global clients */
self.addEventListener("push", (event) => {
  let payload;
  try { payload = event.data?.json?.() || {}; } catch { payload = { body: event.data?.text?.() || "" }; }
  event.waitUntil(Promise.all([self.registration.showNotification(payload.title || "STARCO Panels", {
    body: payload.body || "لديك تحديث جديد في المشروع.",
    icon: "/logo.jpg",
    badge: "/logo.jpg",
    dir: "rtl",
    lang: "ar",
    tag: payload.projectId ? `starco-project-${payload.projectId}-${payload.type || "update"}` : undefined,
    renotify: true,
    data: { url: payload.url || "/dashboard" },
  }), clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
    windows.forEach((client) => client.postMessage({ type: "STARCO_NOTIFICATION_RECEIVED" }));
  })]));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destination = new URL(event.notification.data?.url || "/dashboard", self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((client) => client.url.startsWith(self.location.origin));
    if (existing) return existing.navigate(destination).then(() => existing.focus());
    return clients.openWindow(destination);
  }));
});
