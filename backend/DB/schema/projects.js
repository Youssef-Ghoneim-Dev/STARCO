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

    parts: [panelPartSchema],

    prices: {
        manufacturing: Number,

        locks: Number,

        hinges: Number,

        transport: Number,

        screws: Number,

        stretch: Number,

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
            "completed"
        ],
        default: "pending"
    },
    source: {
        type: String,
        enum: ["manual", "whatsapp"],
        default: "manual"
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
