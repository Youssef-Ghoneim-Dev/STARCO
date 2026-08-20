const mongoose = require("mongoose");
const { defaults } = require("../../utils/whatsappTemplates");

module.exports = new mongoose.Schema({
    sheetPrice: {
        type: Number,
        required: true
    },

    paintPrice: {
        type: Number,
        required: true
    },

    prices: {
        manufacturing: {
            type: Number,
            required: true
        },

        locks: {
            type: Number,
            required: true
        },

        hinges: {
            type: Number,
            required: true
        },

        transport: {
            type: Number,
            required: true
        },

        screws: {
            type: Number,
            required: true
        },

        stretch: {
            type: Number,
            required: true
        }
    },

    whatsappTemplates: {
        startProject: { type: String, default: defaults.startProject },
        panel: { type: String, default: defaults.panel }
    }
});
