const { runProductionWorkflowReminders } = require("../services/productionWorkflowReminders");

const runReminders = async (req, res, next) => {
    try {
        const received = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
        if (!process.env.CRON_SECRET || received !== process.env.CRON_SECRET) {
            return res.status(401).json({ status: "error", message: "غير مصرح بتشغيل تذكيرات الإنتاج." });
        }
        return res.status(200).json({ status: "ok", ...(await runProductionWorkflowReminders()) });
    } catch (error) { next(error); }
};

module.exports = { runReminders };
