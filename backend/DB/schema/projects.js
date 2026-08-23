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
        branches: { type: String, default: "" }
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
            optionKey: { type: String, default: "" },
            direction: { type: String, enum: ["one", "two"], default: "one" },
            length: { type: Number, default: null },
            barCount: { type: Number, default: 1 }
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
    }]

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

    status: {
        type: String,
        enum: [
            "pending",
            "inProgress",
            "editing",
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
