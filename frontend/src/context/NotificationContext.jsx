import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import {
  getNotifications,
  getPushConfig,
  markAllNotificationsRead,
  markNotificationRead,
  markProjectNotificationsRead,
  savePushSubscription,
} from "../services/notificationsAPI";

const NotificationContext = createContext(null);

const urlBase64ToUint8Array = (value) => {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
};

export function NotificationProvider({ children }) {
  const { user, pending } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pushState, setPushState] = useState(() => typeof Notification === "undefined" ? "unsupported" : Notification.permission);

  const refresh = useCallback(async ({ quiet = false } = {}) => {
    if (!user || pending) return;
    if (!quiet) setLoading(true);
    try {
      const { data } = await getNotifications(40);
      setNotifications(data.notifications || []);
      setUnreadCount(Number(data.unreadCount) || 0);
    } catch {
      // A notification refresh must never interrupt the main workflow.
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [pending, user]);

  useEffect(() => {
    if (!user || pending) {
      setNotifications([]);
      setUnreadCount(0);
      return undefined;
    }
    refresh();
    const interval = window.setInterval(() => refresh({ quiet: true }), 10000);
    const onRefresh = () => refresh({ quiet: true });
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refresh({ quiet: true });
    };
    const onServiceWorkerMessage = (event) => {
      if (event.data?.type === "STARCO_NOTIFICATION_RECEIVED") refresh({ quiet: true });
    };
    window.addEventListener("notifications:refresh", onRefresh);
    window.addEventListener("focus", onRefresh);
    document.addEventListener("visibilitychange", onVisibilityChange);
    navigator.serviceWorker?.addEventListener("message", onServiceWorkerMessage);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("notifications:refresh", onRefresh);
      window.removeEventListener("focus", onRefresh);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      navigator.serviceWorker?.removeEventListener("message", onServiceWorkerMessage);
    };
  }, [pending, refresh, user]);

  useEffect(() => {
    if (!user || pending || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    navigator.serviceWorker?.ready
      .then(async (registration) => {
        const existing = await registration.pushManager.getSubscription();
        if (existing) await savePushSubscription(existing.toJSON());
      })
      .catch(() => {});
  }, [pending, user]);

  const enablePush = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setPushState("unsupported");
      return { success: false, message: "هذا المتصفح لا يدعم إشعارات الجهاز." };
    }
    const permission = await Notification.requestPermission();
    setPushState(permission);
    if (permission !== "granted") return { success: false, message: "لم يتم السماح بإشعارات الجهاز." };
    const { data } = await getPushConfig();
    if (!data.enabled || !data.publicKey) return { success: false, message: "مفاتيح إشعارات الجهاز لم تُضبط في السيرفر بعد." };
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
      });
    }
    await savePushSubscription(subscription.toJSON());
    setPushState("granted");
    return { success: true };
  }, []);

  const readOne = useCallback(async (id) => {
    setNotifications((current) => current.map((item) => item._id === id ? { ...item, readAt: item.readAt || new Date().toISOString() } : item));
    setUnreadCount((current) => Math.max(0, current - 1));
    await markNotificationRead(id);
  }, []);

  const readProject = useCallback(async (projectId) => {
    if (!projectId) return;
    setNotifications((current) => {
      const unreadForProject = current.filter((item) => String(item.projectId) === String(projectId) && !item.readAt).length;
      if (unreadForProject) setUnreadCount((count) => Math.max(0, count - unreadForProject));
      return current.map((item) => String(item.projectId) === String(projectId) ? { ...item, readAt: item.readAt || new Date().toISOString() } : item);
    });
    try { await markProjectNotificationsRead(projectId); } catch { /* Retry on the next project visit. */ }
  }, []);

  const readAll = useCallback(async () => {
    setNotifications((current) => current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
    setUnreadCount(0);
    await markAllNotificationsRead();
  }, []);

  const value = useMemo(() => ({ notifications, unreadCount, loading, pushState, refresh, enablePush, readOne, readProject, readAll }), [enablePush, loading, notifications, pushState, readAll, readOne, readProject, refresh, unreadCount]);
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useNotifications = () => useContext(NotificationContext);
