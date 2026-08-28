const dbconfig = require("../DB/config");
const schema = require("../DB/schema/pushSubscriptions");

const model = () => dbconfig.openconnection("pushSubscriptions", schema);
const upsert = (userId, subscription, userAgent = "") => model().findOneAndUpdate(
    { endpoint: subscription.endpoint },
    {
        userId,
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime ?? null,
        keys: subscription.keys,
        userAgent,
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
);
const findByUsers = (userIds) => model().find({ userId: { $in: userIds } });
const removeEndpoint = (endpoint, userId = null) => model().deleteOne({ endpoint, ...(userId ? { userId } : {}) });

module.exports = { model, upsert, findByUsers, removeEndpoint };
