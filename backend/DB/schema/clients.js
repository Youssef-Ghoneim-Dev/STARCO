const { string } = require("joi")
const mongoose = require("mongoose")
module.exports = new mongoose.Schema({
    name: { type: String, required: true },
    type: {
        type: String, enum: [
            "person",
            "company"
        ], required: true
    },
    profitPercentage: { type: Number, default: 20, min: 10, max: 70, required: true },
})
