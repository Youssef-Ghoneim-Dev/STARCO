const mongoose = require("mongoose");

const panelPartSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },

    width: {
        type: Number,
        required: true
    },

    height: {
        type: Number,
        required: true
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
        id: mongoose.Schema.Types.ObjectId,
        name: String,
        type: {
            type: String,
            enum: ["person", "company"]
        },
        profitPercentage: Number
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