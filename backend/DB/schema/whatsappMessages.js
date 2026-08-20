const mongoose = require("mongoose");

module.exports = new mongoose.Schema({
    providerMessageId: { type: String, unique: true, sparse: true },
    direction: { type: String, enum: ["inbound", "outbound"], required: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "whatsappSessions", default: null },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "projects", default: null },
    panelLocalKey: { type: String, default: null },
    panelId: { type: String, default: null },
    senderPhone: { type: String, default: null },
    recipientPhone: { type: String, default: null },
    type: { type: String, default: "text" },
    text: { type: String, default: null },
    media: {
        providerMediaId: { type: String, default: null },
        mimeType: { type: String, default: null },
        fileName: { type: String, default: null },
        fileSize: { type: Number, default: null },
        storageProvider: { type: String, enum: ["google-drive", null], default: null },
        storageFileId: { type: String, default: null },
        uploadedAt: { type: Date, default: null },
        uploadError: { type: String, default: null }
    },
    status: { type: String, default: "received" },
    rawPayload: { type: mongoose.Schema.Types.Mixed, default: null }
}, { timestamps: true });
