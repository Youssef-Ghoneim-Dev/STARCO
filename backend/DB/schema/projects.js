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

    panelName: {
        type: String,
        required: true
    },

    parts: [panelPartSchema],

    prices: {

        sheetPrice: Number,

        paintPrice: Number,

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
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
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