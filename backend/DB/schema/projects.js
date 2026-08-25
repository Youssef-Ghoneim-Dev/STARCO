const mongoose = require("mongoose");

const panelPartSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },

    width: {
        type: Number,
    },

    height: {
        type: Number,
    },

    quantity: {
        type: Number,
        default: 1
    }
}, { _id: false });

const storedProjectFileSchema = new mongoose.Schema({
    storageFileId: { type: String, required: true },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    fileSize: { type: Number, default: 0 },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null }
}, { _id: true });

const panelSchema = new mongoose.Schema({

    panelId: {
        type: String,
        default: () => new mongoose.Types.ObjectId().toString()
    },

    panelName: {
        type: String,
        required: true
    },

    panelType: {
        type: String,
        default: ""
    },

    panelTypeKey: {
        type: String,
        default: ""
    },

    dimensions: {
        length: { type: Number, default: null },
        width: { type: Number, default: null },
        depth: { type: Number, default: null }
    },

    hasCopper: {
        type: Boolean,
        default: null
    },

    additionalDetails: {
        type: String,
        default: ""
    },

    controlInstallation: {
        type: String,
        default: ""
    },

    copperDetails: {
        switches: { type: String, default: "" },
        main: { type: String, default: "" },
        mainKey: { type: String, default: "" },
        branches: { type: String, default: "" },
        notes: { type: String, default: "" },
        branchGroups: [{
            id: { type: String, default: "" },
            optionKey: { type: String, default: "" },
            count: { type: Number, default: 1 }
        }]
    },

    copper: {
        enabled: { type: Boolean, default: false },
        pricePerKg: { type: Number, default: null },
        earthPrice: { type: Number, default: null },
        groundPrice: { type: Number, default: null },
        main: {
            optionKey: { type: String, default: "" },
            length: { type: Number, default: null },
            barCount: { type: Number, default: 1 }
        },
        branches: [{
            branchId: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
            branchGroupId: { type: String, default: "" },
            optionKey: { type: String, default: "" },
            direction: { type: String, enum: ["one", "two"], default: "one" },
            length: { type: Number, default: null },
            barCount: { type: Number, default: 1 },
            quantity: { type: Number, default: 1, min: 1 }
        }]
    },

    parts: [panelPartSchema],

    prices: {
        manufacturing: Number,

        locks: Number,

        hinges: Number,

        transport: Number,

        screws: Number,

        stretch: Number,

        carton: Number,

        copper: Number,

        fiber: Number,

        rakam: Number,

        fuse: Number,

        additionalPrice: {
            type: Number,
        }
    },

    thickness: [{
        type: Number
    }],

    executionPdf: {
        status: {
            type: String,
            enum: ["notRequested", "requested", "ready", "changesRequested", "confirmed", "skipped"],
            default: "notRequested"
        },
        requestedAt: { type: Date, default: null },
        requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null },
        completedAt: { type: Date, default: null },
        completedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null },
        skippedAt: { type: Date, default: null },
        skippedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null },
        confirmedAt: { type: Date, default: null },
        confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null },
        changesRequestedAt: { type: Date, default: null },
        changesRequestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null },
        files: [storedProjectFileSchema]
    },

    manufacturing: {
        status: {
            type: String,
            enum: ["notStarted", "awaitingFiles", "filesReady", "downloadedToLaser"],
            default: "notStarted"
        },
        notes: { type: String, default: "" },
        files: [storedProjectFileSchema],
        startedAt: { type: Date, default: null },
        startedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null },
        filesReadyAt: { type: Date, default: null },
        filesReadyBy: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null },
        downloadedToLaserAt: { type: Date, default: null },
        downloadedToLaserBy: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null },
        laserStageDueAt: { type: Date, default: null },
        currentStage: {
            type: String,
            enum: ["awaitingLaserDownload", "laser", "manufacturing", "painting", "assembly", "completed", ""],
            default: ""
        },
        currentStageStartedAt: { type: Date, default: null },
        lastReminderAt: { type: Date, default: null },
        delayReason: { type: String, default: "" },
        delayRecordedAt: { type: Date, default: null }
    }

}, { _id: false });

module.exports = new mongoose.Schema({
    // The marketer who opened the request on WhatsApp.  This is deliberately
    // separate from the engineer who later owns the technical work.
    marketingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        default: null
    },

    // Filled atomically when an engineer starts working on a pending project.
    engineerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        default: null
    },

    client: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },

        name: {
            type: String,
            default: ""
        },

        type: {
            type: String,
            enum: ["person", "company"],
            default: "person"
        },

        profitPercentage: {
            type: Number,
            default: 0
        }
    },
    clientNameReview: {
        enteredName: { type: String, default: "" },
        resolved: { type: Boolean, default: false },
        resolution: { type: String, enum: ["", "existing", "new"], default: "" },
        candidates: [{
            clientId: { type: mongoose.Schema.Types.ObjectId, default: null },
            name: { type: String, default: "" },
            type: { type: String, enum: ["person", "company"], default: "person" },
            profitPercentage: { type: Number, default: 0 },
            similarity: { type: Number, default: 0 }
        }]
    },

    status: {
        type: String,
        enum: [
            "marketingDraft",
            "editingByMarketing",
            "editingByEngineer",
            "editingByOwner",
            "pending",
            "inProgress",
            "editing",
            "quoteCompleted",
            "executionPdfRequested",
            "executionPdfReady",
            "executionOrdered",
            "manufacturingFilesPending",
            "manufacturingFilesReady",
            "laserFilesDownloaded",
            "completed"
        ],
        default: "pending"
    },
    source: {
        type: String,
        enum: ["manual", "whatsapp", "marketing"],
        default: "manual"
    },
    // This is a separate, unguessable key for the client-facing preview link.
    // It is never used to grant dashboard access.
    clientPreviewToken: {
        type: String,
        default: null,
        select: false
    },
    whatsappSessionId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    marketingCompletionNotifiedAt: {
        type: Date,
        default: null
    },
    marketingCompletionNotificationError: {
        type: String,
        default: null
    },
    prices: {
        sheetPrice: Number,

        paintPrice: Number,
    },

    panels: [panelSchema],

    isDeleted: {
        type: Boolean,
        default: false
    }

}, {
    timestamps: {
        createdAt: true,
        updatedAt: true
    }
});
