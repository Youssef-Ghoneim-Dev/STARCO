const mongoose = require("mongoose");
module.exports = new mongoose.Schema({
    _id: { type: String, required: true },
    value: { type: Number, default: 0 }
}, { versionKey: false });
