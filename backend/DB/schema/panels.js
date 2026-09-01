const mongoose = require("mongoose");

const storedFileSchema = new mongoose.Schema({
    storageFileId: { type: String, required: true }, fileName: { type: String, required: true },
    mimeType: { type: String, required: true }, fileSize: { type: Number, default: 0 },
    purpose: { type: String, default: "" },
    uploadedAt: { type: Date, default: Date.now }, uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null }
});
const stageSchema = new mongoose.Schema({
    key: { type: String, enum: ["pendingLaserDownload", "laser", "manufacturing", "painting", "assembly"], required: true },
    status: { type: String, enum: ["pending", "active", "completed"], default: "pending" },
    startedAt: { type: Date, default: null }, completedAt: { type: Date, default: null },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null },
    delayReason: { type: String, default: "" }, delayDetails: { type: String, default: "" },
    delayedAt: { type: Date, default: null }, delayedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null }
}, { _id: false });
const historySchema = new mongoose.Schema({
    from: { type: String, default: "" }, to: { type: String, default: "" }, action: { type: String, required: true }, note: { type: String, default: "" },
    stageKey: { type: String, default: "" }, reason: { type: String, default: "" }, details: { type: String, default: "" },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null }, actorName: { type: String, default: "" }, actorRole: { type: String, default: "" }, createdAt: { type: Date, default: Date.now }
}, { _id: false });
const panelStatuses = ["draft", "pendingPricing", "pricing", "quoteCompleted", "editing", "executionPdfRequested", "executionPdfReady", "executionConfirmed", "manufacturingFilesPending", "manufacturingFilesReady", "pendingLaserDownload", "laser", "manufacturing", "painting", "assembly", "completed"];

module.exports = new mongoose.Schema({
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "projects", required: true, index: true },
    panelCode: { type: String, required: true, unique: true, index: true }, sequence: { type: Number, required: true, min: 1 },
    source: { type: String, enum: ["marketing", "whatsapp", "manual"], default: "marketing" },
    status: { type: String, enum: panelStatuses, default: "draft", index: true }, panelName: { type: String, default: "" },
    marketerSaved: { type: Boolean, default: false },
    marketingDraft: { type: mongoose.Schema.Types.Mixed, default: null },
    marketingDraftDeleted: { type: Boolean, default: false },
    marketingEditSession: {
        active: { type: Boolean, default: false },
        openedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null },
        openedAt: { type: Date, default: null },
        previousStatus: { type: String, default: "" }
    },
    lastMarketingEdit: { type: mongoose.Schema.Types.Mixed, default: null },
    marketingId: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null, index: true }, engineerId: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null, index: true }, assignedAt: { type: Date, default: null },
    lock: { userId: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null }, role: { type: String, default: "" }, acquiredAt: { type: Date, default: null }, expiresAt: { type: Date, default: null } },
    marketerData: { panelType: { type: String, default: "" }, panelTypeKey: { type: String, default: "" }, thickness: [{ type: Number }], hasCopper: { type: Boolean, default: null }, controlInstallation: { type: String, default: "" }, additionalDetails: { type: String, default: "" }, copperDetails: { type: mongoose.Schema.Types.Mixed, default: {} } },
    pricing: { dimensions: { type: mongoose.Schema.Types.Mixed, default: {} }, parts: { type: [mongoose.Schema.Types.Mixed], default: [] }, prices: { type: mongoose.Schema.Types.Mixed, default: {} }, copper: { type: mongoose.Schema.Types.Mixed, default: {} }, thickness: [{ type: Number }] },
    attachments: { type: [storedFileSchema], default: [] },
    executionPdf: {
        files: { type: [storedFileSchema], default: [] }, steelThickness: { type: Number, default: null },
        design: { type: mongoose.Schema.Types.Mixed, default: {} },
        requestedAt: { type: Date, default: null }, requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null },
        readyAt: { type: Date, default: null }, readyBy: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null },
        confirmedAt: { type: Date, default: null }, confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null }, skipped: { type: Boolean, default: false }
    },
    manufacturing: { files: { type: [storedFileSchema], default: [] }, notes: { type: String, default: "" }, engineerNotes: { type: String, default: "" }, productionNotes: { type: String, default: "" }, stages: { type: [stageSchema], default: [] }, lastReminderAt: { type: Date, default: null }, engineerReminderAt: { type: Date, default: null } },
    deliverySchedule: {
        requestedDate: { type: Date, default: null },
        approvedDate: { type: Date, default: null },
        wasAdjusted: { type: Boolean, default: false },
        deadlines: { type: mongoose.Schema.Types.Mixed, default: {} },
        status: { type: String, enum: ["none", "pending", "accepted", "rejected"], default: "none" },
        requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null },
        requestedAt: { type: Date, default: null },
        respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null },
        respondedAt: { type: Date, default: null },
        responseNote: { type: String, default: "" }
    },
    statusHistory: { type: [historySchema], default: [] }, quoteCompletedAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false, index: true }, deletedAt: { type: Date, default: null }, deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null }
}, { timestamps: true });
