const { addEgyptWorkingDays, egyptDateValue } = require("./egyptWorkingDays");

const latestStatusStart = (panel, status) => [...(panel?.statusHistory || [])]
    .reverse()
    .find((entry) => entry.to === status)?.createdAt;

const cairoMinutes = (value) => {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Africa/Cairo",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).formatToParts(new Date(value));
    const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
    const minute = Number(parts.find((part) => part.type === "minute")?.value || 0);
    return (hour * 60) + minute;
};

const currentProductionStageDueAt = (panel) => {
    if (!panel) return null;
    if (panel.status === "manufacturingFilesPending") {
        const startedAt = panel.executionPdf?.confirmedAt || latestStatusStart(panel, "manufacturingFilesPending");
        return startedAt ? addEgyptWorkingDays(startedAt, 2) : null;
    }

    const activeStage = (panel.manufacturing?.stages || []).find((stage) => stage.status === "active");
    if (!activeStage) return null;
    const startedAt = activeStage.startedAt || latestStatusStart(panel, activeStage.key);
    if (!startedAt) return null;
    if (activeStage.key === "pendingLaserDownload") {
        return new Date(new Date(startedAt).getTime() + (2 * 60 * 60 * 1000));
    }

    const startMinutes = cairoMinutes(startedAt);
    // باقي مراحل الإنتاج إذا بدأت قبل متابعة العاشرة صباحًا تظهر في
    // متابعة اليوم نفسه، دون أن يعني ذلك تسجيل تأخير عليها.
    const workingDays = startMinutes <= (10 * 60) ? 0 : 1;
    return addEgyptWorkingDays(startedAt, workingDays);
};

const reachedEgyptDate = (now, target) => {
    const currentDate = egyptDateValue(now);
    const targetDate = egyptDateValue(target);
    return Boolean(currentDate && targetDate && currentDate >= targetDate);
};

module.exports = { currentProductionStageDueAt, reachedEgyptDate };
