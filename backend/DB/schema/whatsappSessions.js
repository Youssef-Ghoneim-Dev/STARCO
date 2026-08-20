const mongoose = require("mongoose");

const panelSchema = new mongoose.Schema({
    localPanelKey: { type: String, required: true },
    panelName: { type: String, required: true },
    requestedThicknesses: [{ type: Number }],
    panelType: { type: String, default: "" },
    hasCopper: { type: Boolean, default: null },
    details: { type: String, default: "" }
}, { _id: false });

const schema = new mongoose.Schema({
    senderPhone: { type: String, required: true },
    marketingRepId: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
    mode: { type: String, enum: ["create", "edit"], default: "create" },
    targetProjectId: { type: mongoose.Schema.Types.ObjectId, ref: "projects", default: null },
    status: { type: String, enum: ["collecting", "finished", "cancelled", "expired"], default: "collecting" },
    templateVersion: { type: String, default: "v1" },
    client: {
        name: { type: String, default: "" },
        type: { type: String, enum: ["person", "company"], default: "person" }
    },
    panels: [panelSchema],
    activePanelKey: { type: String, default: null },
    startedByMessageId: { type: String, required: true },
    finishedByMessageId: { type: String, default: null },
    createdProjectId: { type: mongoose.Schema.Types.ObjectId, ref: "projects", default: null },
    expiresAt: { type: Date, required: true }
}, { timestamps: true });

schema.index(
    { senderPhone: 1, status: 1 },
    { unique: true, partialFilterExpression: { status: "collecting" } }
);
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = schema;
