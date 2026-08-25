const projectModels = require("../models/projects");
const clientModels = require("../models/clients");
const userModels = require("../models/users");
const dashboardStatistics = require("../models/dashboardStatistics");

const RETENTION_DAYS = 30;
const PRODUCTION_STATUSES = ["executionPdfRequested", "executionPdfReady", "executionOrdered", "production", "executing"];
const APPROVAL_STATUSES = ["awaitingExecution", "approved", "readyForExecution"];

const startOfDay = (value = new Date()) => {
    const date = new Date(value);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const endOfDay = (value = new Date()) => {
    const date = startOfDay(value);
    date.setHours(23, 59, 59, 999);
    return date;
};

const toDateKey = (value = new Date()) => {
    const date = startOfDay(value);
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
};

const sameDay = (value, date) => value && startOfDay(value).getTime() === startOfDay(date).getTime();

const statusBucket = (statusValue) => {
    const status = String(statusValue || "");
    if (status === "completed") return "completed";
    if (status.startsWith("editing")) return "editing";
    if (PRODUCTION_STATUSES.includes(status)) return "production";
    if (APPROVAL_STATUSES.includes(status)) return "approval";
    return "pricing";
};

const captureDashboardSnapshot = async (value = new Date()) => {
    const date = startOfDay(value);
    const dateKey = toDateKey(date);
    const [projects, clients, activeEngineers, activeMarketers] = await Promise.all([
        projectModels.selectall({ isDeleted: false }),
        clientModels.select_all(),
        userModels.selectall({ role: "Engineer", approved: true, isDeleted: false }),
        userModels.selectall({ role: "Marketer", approved: true, isDeleted: false })
    ]);
    const statusCounts = { pricing: 0, approval: 0, production: 0, editing: 0, completed: 0 };
    projects.forEach((project) => { statusCounts[statusBucket(project.status)] += 1; });
    const newProjects = projects.filter((project) => sameDay(project.createdAt, date)).length;
    const completed = projects.filter((project) => project.status === "completed" && sameDay(project.updatedAt, date)).length;
    const inProgress = projects.filter((project) => PRODUCTION_STATUSES.includes(project.status)).length;
    const expiresAt = startOfDay(date);
    expiresAt.setDate(expiresAt.getDate() + RETENTION_DAYS);

    return dashboardStatistics.upsert(dateKey, {
        date,
        metrics: {
            totalProjects: projects.length,
            newProjects,
            marketerRequests: newProjects,
            inProgress,
            completed,
            totalClients: clients.length,
            activeEngineers: activeEngineers.length,
            activeMarketers: activeMarketers.length
        },
        statusCounts,
        expiresAt
    });
};

const getDashboardStatistics = async (selectedDate) => {
    const date = startOfDay(selectedDate);
    const today = startOfDay();
    const earliest = startOfDay(today);
    earliest.setDate(earliest.getDate() - (RETENTION_DAYS - 1));
    if (date < earliest || date > today) {
        const error = new Error("التاريخ يجب أن يكون ضمن آخر 30 يومًا.");
        error.statusCode = 400;
        throw error;
    }

    if (date.getTime() === today.getTime()) await captureDashboardSnapshot(today);
    const previousDate = startOfDay(date);
    previousDate.setDate(previousDate.getDate() - 1);
    const historyStart = startOfDay(date);
    historyStart.setDate(historyStart.getDate() - 6);
    const [selected, previous, history] = await Promise.all([
        dashboardStatistics.selectOne(toDateKey(date)),
        dashboardStatistics.selectOne(toDateKey(previousDate)),
        dashboardStatistics.selectRange(historyStart, endOfDay(date))
    ]);
    return { selected, previous, history, retentionDays: RETENTION_DAYS };
};

const captureAfterSuccessfulMutation = (req, res, next) => {
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
    res.once("finish", () => {
        if (res.statusCode < 400) captureDashboardSnapshot().catch((error) => console.error("Dashboard statistics capture failed:", error));
    });
    next();
};

const roleActivityField = {
    OwnerManager: "activity.ownerManagerRequests",
    Engineer: "activity.engineerRequests",
    Marketer: "activity.marketerRequests",
    MarketingManager: "activity.marketingManagerRequests",
    ProductionManager: "activity.productionManagerRequests"
};

const trackDashboardRequest = (req, res, next) => {
    res.once("finish", () => {
        if (res.statusCode >= 400) return;
        const date = startOfDay();
        const dateKey = toDateKey(date);
        const expiresAt = startOfDay(date);
        expiresAt.setDate(expiresAt.getDate() + RETENTION_DAYS);
        const increments = { "activity.totalRequests": 1 };
        const roleField = roleActivityField[req.user?.role];
        if (roleField) increments[roleField] = 1;
        if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
            increments["activity.successfulMutations"] = 1;
            if (req.path.startsWith("/projects")) increments["activity.projectMutations"] = 1;
            if (req.path.startsWith("/clients")) increments["activity.clientMutations"] = 1;
        }
        dashboardStatistics.incrementActivity(dateKey, date, expiresAt, increments)
            .catch((error) => console.error("Dashboard activity tracking failed:", error));
    });
    next();
};

module.exports = {
    RETENTION_DAYS,
    captureDashboardSnapshot,
    captureAfterSuccessfulMutation,
    trackDashboardRequest,
    getDashboardStatistics,
    startOfDay,
    toDateKey
};
