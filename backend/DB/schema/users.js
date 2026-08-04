const mongoose = require("mongoose")
module.exports = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
        type: String, enum: [
            "OwnerManager",
            "Employee",
            "Marketer",
            "MarketingManager"
        ], required: true
    },
    approved: { type: Boolean, default: false, required: true },
    isDeleted: { type: Boolean, default: false, required: true }
})