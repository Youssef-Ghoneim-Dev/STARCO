const mongoose = require("mongoose");

const statusCountsSchema = new mongoose.Schema({
    pricing: { type: Number, default: 0 },
    approval: { type: Number, default: 0 },
    production: { type: Number, default: 0 },
    editing: { type: Number, default: 0 },
    completed: { type: Number, default: 0 }
}, { _id: false });

const metricsSchema = new mongoose.Schema({
    totalProjects: { type: Number, default: 0 },
    newProjects: { type: Number, default: 0 },
    marketerRequests: { type: Number, default: 0 },
    inProgress: { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
    totalClients: { type: Number, default: 0 },
    activeEngineers: { type: Number, default: 0 },
    activeMarketers: { type: Number, default: 0 }
}, { _id: false });

const dashboardStatisticsSchema = new mongoose.Schema({
    dateKey: { type: String, required: true, unique: true, index: true },
    date: { type: Date, required: true, index: true },
    metrics: { type: metricsSchema, default: () => ({}) },
    statusCounts: { type: statusCountsSchema, default: () => ({}) },
    expiresAt: { type: Date, required: true, expires: 0 }
}, { timestamps: true });

module.exports = dashboardStatisticsSchema;
