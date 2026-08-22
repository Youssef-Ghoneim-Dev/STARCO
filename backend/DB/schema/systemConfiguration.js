const mongoose = require("mongoose");
const { defaults } = require("../../utils/whatsappTemplates");
const { panelTypeDefaults } = require("../../utils/panelTypeDefaults");
const { cloneCopperConfigurationDefaults } = require("../../utils/copperDefaults");

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

    parts: {
        chair: {
            defaultWidth: { type: Number, default: 40 },
            defaultHeight: { type: Number, default: 100 },
            defaultQuantity: { type: Number, default: 2 },
            quantityStep: { type: Number, default: 2 }
        },
        omega: {
            defaultWidth: { type: Number, default: 45.5 },
            defaultHeight: { type: Number, default: null },
            defaultQuantity: { type: Number, default: 1 },
            quantityStep: { type: Number, default: 1 }
        }
    },

    panelTypes: {
        type: [new mongoose.Schema({
            key: { type: String, required: true },
            name: { type: String, required: true },
            whatsappType: { type: String, default: "" },
            additionalParts: [{ type: String }],
            prices: {
                manufacturing: { type: Number, default: 0 }, locks: { type: Number, default: 0 },
                hinges: { type: Number, default: 0 }, transport: { type: Number, default: 0 },
                screws: { type: Number, default: 0 }, stretch: { type: Number, default: 0 }, carton: { type: Number, default: 0 }
            },
            parts: [{
                key: { type: String, required: true }, name: { type: String, required: true },
                lengthFormula: { type: String, default: "" }, widthFormula: { type: String, default: "" },
                quantity: { type: Number, default: 1 }, manualDimensions: { type: Boolean, default: false }
            }]
        }, { _id: false })],
        default: () => panelTypeDefaults
    },

    copperConfiguration: {
        type: new mongoose.Schema({
            pricePerKg: { type: Number, default: 0 },
            catalog: [{
                key: { type: String, required: true },
                name: { type: String, required: true },
                amperage: { type: Number, required: true },
                width: { type: Number, required: true },
                thickness: { type: Number, required: true }
            }],
            barCounts: [{ type: Number }],
            branchLengths: {
                oneDirection: { type: Number, default: 150 },
                twoDirections: { type: Number, default: 300 }
            },
            weightFormula: { type: String, default: "Length * BarCount * Width * Thickness / 1000000" }
        }, { _id: false }),
        default: () => cloneCopperConfigurationDefaults()
    },

    whatsappTemplates: {
        startProject: { type: String, default: defaults.startProject },
        panel: { type: String, default: defaults.panel }
    },

    googleDrive: {
        oauthRefreshToken: { type: String, default: null, select: false },
        folderId: { type: String, default: null },
        connectedEmail: { type: String, default: null },
        connectedAt: { type: Date, default: null }
    }
});
