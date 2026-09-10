const { runProductionWorkflowReminders } = require("../services/productionWorkflowReminders");

const runReminders = async (req, res, next) => {
    try {
        const received = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
        if (!process.env.CRON_SECRET || received !== process.env.CRON_SECRET) {
            return res.status(401).json({ status: "error", message: "غير مصرح بتشغيل تذكيرات الإنتاج." });
        }
        const cairoHour = Number(new Intl.DateTimeFormat("en-US", {
            timeZone: "Africa/Cairo",
            hour: "2-digit",
            hourCycle: "h23",
        }).format(new Date()));
        if (cairoHour !== 10) {
            return res.status(200).json({ status: "skipped", message: "لم تحن الساعة العاشرة صباحًا بتوقيت القاهرة." });
        }
        return res.status(200).json({ status: "ok", ...(await runProductionWorkflowReminders()) });
    } catch (error) { next(error); }
};

module.exports = { runReminders };
