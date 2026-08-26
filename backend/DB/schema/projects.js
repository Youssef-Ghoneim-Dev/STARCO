const mongoose = require("mongoose");

module.exports = new mongoose.Schema({
    projectCode: { type: String, required: true, unique: true, index: true },
    marketingId: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null, index: true },
    client: {
        id: { type: mongoose.Schema.Types.ObjectId, ref: "clients", default: null },
        name: { type: String, default: "" },
        type: { type: String, enum: ["person", "company", ""], default: "" },
        profitPercentage: { type: Number, default: null }
    },
    clientNameReview: { type: mongoose.Schema.Types.Mixed, default: {} },
    prices: { sheetPrice: { type: Number, default: null }, paintPrice: { type: Number, default: null } },
    panelIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "panels" }],
    status: { type: String, enum: ["draft", "created", "inProgress", "completed"], default: "draft", index: true },
    source: { type: String, enum: ["marketing", "whatsapp", "manual"], default: "marketing" },
    setupLock: { userId: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null }, acquiredAt: { type: Date, default: null }, expiresAt: { type: Date, default: null } },
    marketingEditSession: { active: { type: Boolean, default: false }, openedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null }, openedAt: { type: Date, default: null } },
    clientPreviewToken: { type: String, default: null, select: false }, previewVersion: { type: Number, default: 0 }, previewGeneratedAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false, index: true }, deletedAt: { type: Date, default: null }, deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null }
}, { timestamps: true });
