const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
    recipientId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    panelId: { type: mongoose.Schema.Types.ObjectId, default: null },
    type: { type: String, required: true, default: "projectUpdated" },
    title: { type: String, required: true },
    body: { type: String, default: "" },
    link: { type: String, default: "" },
    actorId: { type: mongoose.Schema.Types.ObjectId, default: null },
    actorName: { type: String, default: "" },
    readAt: { type: Date, default: null, index: true },
}, { timestamps: true });

notificationSchema.index({ recipientId: 1, readAt: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, projectId: 1, readAt: 1 });

module.exports = notificationSchema;
