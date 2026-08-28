const webpush = require("web-push");
const users = require("../models/users");
const notifications = require("../models/notifications");
const pushSubscriptions = require("../models/pushSubscriptions");

const publicKey = String(process.env.VAPID_PUBLIC_KEY || "").trim();
const privateKey = String(process.env.VAPID_PRIVATE_KEY || "").trim();
const pushEnabled = Boolean(publicKey && privateKey);

if (pushEnabled) {
    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || "mailto:admin@starco.local",
        publicKey,
        privateKey,
    );
}

const uniqueUsers = (rows) => [...new Map(rows.map((row) => [String(row._id), row])).values()];

const resolveRecipients = async ({ userIds = [], roles = [], excludeUserId = null }) => {
    const conditions = [];
    if (userIds.filter(Boolean).length) conditions.push({ _id: { $in: userIds.filter(Boolean) } });
    if (roles.length) conditions.push({ role: { $in: roles } });
    if (!conditions.length) return [];
    const rows = await users.selectall({ $or: conditions, approved: true, isDeleted: false });
    return uniqueUsers(rows).filter((row) => !excludeUserId || String(row._id) !== String(excludeUserId));
};

const sendPush = async (recipientIds, payload) => {
    if (!pushEnabled || !recipientIds.length) return;
    const subscriptions = await pushSubscriptions.findByUsers(recipientIds);
    await Promise.allSettled(subscriptions.map(async (subscription) => {
        try {
            await webpush.sendNotification({
                endpoint: subscription.endpoint,
                expirationTime: subscription.expirationTime,
                keys: subscription.keys,
            }, JSON.stringify(payload), { TTL: 60 * 60 * 24 });
        } catch (error) {
            if ([404, 410].includes(error.statusCode)) {
                await pushSubscriptions.removeEndpoint(subscription.endpoint);
                return;
            }
            throw error;
        }
    }));
};

const createInternalNotifications = async ({
    userIds = [], roles = [], excludeUserId = null, project = null, panel = null,
    type = "projectUpdated", title, body = "", link = "", actor = null,
}) => {
    const recipients = await resolveRecipients({ userIds, roles, excludeUserId });
    if (!recipients.length) return [];
    const projectId = project?._id || project || null;
    const panelId = panel?._id || panel || null;
    const targetLink = link || (projectId ? `/projects/${projectId}${panelId ? `/panels/${panelId}` : ""}` : "/dashboard");
    const rows = recipients.map((recipient) => ({
        recipientId: recipient._id, projectId, panelId, type, title, body, link: targetLink,
        actorId: actor?._id || null, actorName: actor?.name || "",
    }));
    const created = await notifications.createMany(rows);
    await sendPush(recipients.map((recipient) => recipient._id), {
        title,
        body,
        url: targetLink,
        projectId: projectId ? String(projectId) : "",
        panelId: panelId ? String(panelId) : "",
        type,
    });
    return created;
};

module.exports = { createInternalNotifications, publicKey, pushEnabled };
