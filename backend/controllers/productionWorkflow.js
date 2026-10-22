const { runProductionWorkflowReminders } = require("../services/productionWorkflowReminders");
const { removeExpiredProjects } = require("../services/projectRetention");

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
        const [remindersResult, retentionResult] = await Promise.allSettled([
            runProductionWorkflowReminders(),
            removeExpiredProjects(),
        ]);
        if (remindersResult.status === "rejected") throw remindersResult.reason;
        return res.status(200).json({
            status: "ok",
            ...remindersResult.value,
            retention: retentionResult.status === "fulfilled"
                ? retentionResult.value
                : { status: "error", message: "تعذر تنفيذ تنظيف الملفات المؤقت." },
        });
    } catch (error) { next(error); }
};

module.exports = { runReminders };
