const mongoose = require("mongoose")

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phoneNumber: {
        type: String,
        unique: true,
        sparse: true,
        default: null
    },
    password: { type: String, required: false, default: null },
    // Password accounts do not have a Google id. The partial index below keeps
    // real Google ids unique without treating multiple missing values as duplicates.
    googleId: { type: String },
    authProvider: { type: String, enum: ["password", "google"], default: "password" },
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
    // This gate is enabled explicitly for accounts created after the WhatsApp
    // opt-in flow was introduced. Keeping the default false avoids locking
    // existing accounts that predate the flow.
    whatsappOptInRequired: { type: Boolean, default: false },
    whatsappOptInVerifiedAt: { type: Date, default: null },
    whatsappOptInMessageId: { type: String, default: null },
    isDeleted: { type: Boolean, default: false, required: true }
})

userSchema.index(
    { googleId: 1 },
    {
        name: "googleId_1",
        unique: true,
        partialFilterExpression: { googleId: { $type: "string" } }
    }
)

module.exports = userSchema
