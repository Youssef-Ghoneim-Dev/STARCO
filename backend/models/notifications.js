const dbconfig = require("../DB/config");
const schema = require("../DB/schema/notifications");

const model = () => dbconfig.openconnection("notifications", schema);

const createMany = (rows) => model().insertMany(rows, { ordered: false });
const findForUser = (userId, { limit = 30, unreadOnly = false } = {}) => model()
    .find({ recipientId: userId, ...(unreadOnly ? { readAt: null } : {}) })
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(Number(limit) || 30, 1), 100));
const unreadCount = (userId) => model().countDocuments({ recipientId: userId, readAt: null });
const markOneRead = (userId, id) => model().findOneAndUpdate(
    { _id: id, recipientId: userId, readAt: null },
    { readAt: new Date() },
    { returnDocument: "after" },
);
const markProjectRead = (userId, projectId) => model().updateMany(
    { recipientId: userId, projectId, readAt: null },
    { $set: { readAt: new Date() } },
);
const markAllRead = (userId) => model().updateMany(
    { recipientId: userId, readAt: null },
    { $set: { readAt: new Date() } },
);

module.exports = { model, createMany, findForUser, unreadCount, markOneRead, markProjectRead, markAllRead };
