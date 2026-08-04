const mongoose = require("mongoose");

const projectSchema = require("./projects");

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
        type: projectSchema,
        required: true
    }

}, {
    timestamps: true
});