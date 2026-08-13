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
        required: true,
        unique: true
    },

    editing: {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },

        lastSeen: {
            type: Date,
            default: Date.now
        }

    },

    project: {
        type: panelSchema,
        required: true
    }

}, {
    timestamps: true
});