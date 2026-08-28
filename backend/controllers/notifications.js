const notifications = require("../models/notifications");
const pushSubscriptions = require("../models/pushSubscriptions");
const { publicKey, pushEnabled } = require("../services/internalNotifications");

const list = async (req, res, next) => { try {
    const rows = await notifications.findForUser(req.user._id, {
        limit: req.query.limit,
        unreadOnly: req.query.unreadOnly === "true",
    });
    const unreadCount = await notifications.unreadCount(req.user._id);
    res.json({ notifications: rows, unreadCount });
} catch (error) { next(error); } };

const count = async (req, res, next) => { try {
    res.json({ unreadCount: await notifications.unreadCount(req.user._id) });
} catch (error) { next(error); } };

const readOne = async (req, res, next) => { try {
    await notifications.markOneRead(req.user._id, req.params.id);
    res.json({ status: "ok" });
} catch (error) { next(error); } };

const readProject = async (req, res, next) => { try {
    await notifications.markProjectRead(req.user._id, req.params.projectId);
    res.json({ status: "ok" });
} catch (error) { next(error); } };

const readAll = async (req, res, next) => { try {
    await notifications.markAllRead(req.user._id);
    res.json({ status: "ok" });
} catch (error) { next(error); } };

const config = (req, res) => res.json({ enabled: pushEnabled, publicKey });

const subscribe = async (req, res, next) => { try {
    const subscription = req.body;
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
        return res.status(400).json({ status: "error", message: "بيانات اشتراك الإشعارات غير صحيحة." });
    }
    await pushSubscriptions.upsert(req.user._id, subscription, req.headers["user-agent"] || "");
    res.status(201).json({ status: "ok" });
} catch (error) { next(error); } };

const unsubscribe = async (req, res, next) => { try {
    if (req.body?.endpoint) await pushSubscriptions.removeEndpoint(req.body.endpoint, req.user._id);
    res.json({ status: "ok" });
} catch (error) { next(error); } };

module.exports = { list, count, readOne, readProject, readAll, config, subscribe, unsubscribe };
