const mongoose = require("mongoose")
module.exports = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phoneNumber: {
        type: String,
        unique: true,
        sparse: true,
        default: null
    },
    password: { type: String, required: true },
    role: {
        type: String, enum: [
            "OwnerManager",
            "Engineer",
            "Marketer",
            "MarketingManager",
            "ProductionManager"
        ], required: true
    },
    approved: { type: Boolean, default: false, required: true },
    isDeleted: { type: Boolean, default: false, required: true }
})
