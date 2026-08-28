const mongoose = require("mongoose");

const pushSubscriptionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    endpoint: { type: String, required: true, unique: true },
    expirationTime: { type: Number, default: null },
    keys: {
        p256dh: { type: String, required: true },
        auth: { type: String, required: true },
    },
    userAgent: { type: String, default: "" },
}, { timestamps: true });

module.exports = pushSubscriptionSchema;
