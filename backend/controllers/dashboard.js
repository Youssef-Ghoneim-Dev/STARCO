const { getDashboardStatistics, startOfDay } = require("../services/dashboardStatistics");

const getStatistics = async (req, res, next) => {
    try {
        if (req.user?.role !== "OwnerManager") {
            return res.status(403).json({ status: "error", message: "لا تملك صلاحية عرض إحصائيات الإدارة." });
        }
        const requestedDate = req.query.date ? new Date(`${req.query.date}T00:00:00`) : startOfDay();
        if (Number.isNaN(requestedDate.getTime())) {
            return res.status(400).json({ status: "error", message: "صيغة التاريخ غير صحيحة." });
        }
        const data = await getDashboardStatistics(requestedDate);
        return res.status(200).json({ status: "ok", ...data });
    } catch (error) {
        if (error.statusCode) return res.status(error.statusCode).json({ status: "error", message: error.message });
        next(error);
    }
};

module.exports = { getStatistics };
