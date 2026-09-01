const projects = require("../models/projects");
const panels = require("../models/panels");
const users = require("../models/users");
const { sendProductionStageCheck } = require("./projectWhatsappNotifications");

const ONE_DAY = 24 * 60 * 60 * 1000;

const runProductionWorkflowReminders = async () => {
    const now = new Date();
    const panelsToCheck = await panels.find({ isDeleted: false, status: { $in: ["manufacturingFilesPending", "manufacturingFilesReady", "pendingLaserDownload", "laser", "manufacturing", "painting", "assembly"] } });
    const productionRecipients = await users.selectall({
        role: { $in: ["OwnerManager", "ProductionManager"] },
        approved: true,
        isDeleted: false,
        phoneNumber: { $nin: [null, ""] }
    });
    let remindersSent = 0;
    let delaysRecorded = 0;

    for (const panel of panelsToCheck) {
            const project = await projects.select_one({ _id: panel.projectId, isDeleted: false }); if (!project) continue;
            const workflow = panel.manufacturing || {};
            const waitingForEngineer = panel.status === "manufacturingFilesPending";
            const activeStage = (workflow.stages || []).find((stage) => stage.status === "active");
            const deadlineKey = waitingForEngineer ? "manufacturingFilesDueAt" : activeStage?.key;
            const dueAt = panel.deliverySchedule?.deadlines?.[deadlineKey];
            if (!dueAt || now < new Date(dueAt)) continue;
            const lastReminderValue = waitingForEngineer ? workflow.engineerReminderAt : workflow.lastReminderAt;
            const lastReminder = lastReminderValue ? new Date(lastReminderValue).getTime() : 0;
            if (now.getTime() - lastReminder < ONE_DAY) continue;

            const stageNames = { pendingLaserDownload: "تنزيل الملفات إلى الليزر", laser: "مرحلة الليزر", manufacturing: "مرحلة التصنيع", painting: "مرحلة الرش", assembly: "مرحلة التجميع" };
            const stageName = waitingForEngineer ? "رفع ملفات التصنيع" : stageNames[activeStage?.key];
            if (!stageName) continue;
            const recipients = waitingForEngineer
                ? await users.selectall({ _id: panel.engineerId, approved: true, isDeleted: false, phoneNumber: { $nin: [null, ""] } })
                : productionRecipients;
            const results = await Promise.allSettled(
                recipients.map((recipient) => sendProductionStageCheck(recipient.phoneNumber, project, panel, stageName))
            );
            remindersSent += results.filter((result) => result.status === "fulfilled").length;
            const update = { [waitingForEngineer ? "manufacturing.engineerReminderAt" : "manufacturing.lastReminderAt"]: now };
            if (!waitingForEngineer && now.getTime() - new Date(dueAt).getTime() >= ONE_DAY && !activeStage.delayedAt) {
                activeStage.delayReason = `تجاوز الموعد المحدد لـ${stageName}`;
                activeStage.delayedAt = now;
                update["manufacturing.stages"] = workflow.stages;
                delaysRecorded += 1;
            }
            await panels.update({ _id: panel._id }, update);
    }
    return { projectsChecked: new Set(panelsToCheck.map((panel) => String(panel.projectId))).size, remindersSent, delaysRecorded };
};

module.exports = { runProductionWorkflowReminders };
