import api from "./api";

export const getNotifications = (limit = 30) => api.get("/notifications", { params: { limit } });
export const getUnreadNotificationCount = () => api.get("/notifications/unread-count");
export const markNotificationRead = (id) => api.patch(`/notifications/${id}/read`);
export const markProjectNotificationsRead = (projectId) => api.patch(`/notifications/project/${projectId}/read`);
export const markAllNotificationsRead = () => api.patch("/notifications/read-all");
export const getPushConfig = () => api.get("/notifications/push/config");
export const savePushSubscription = (subscription) => api.post("/notifications/push/subscribe", subscription);
export const deletePushSubscription = (endpoint) => api.delete("/notifications/push/subscribe", { data: { endpoint } });
