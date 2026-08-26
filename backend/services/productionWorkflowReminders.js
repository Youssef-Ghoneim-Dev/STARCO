const projects = require("../models/projects");
const panels = require("../models/panels");
const users = require("../models/users");
const { sendProductionStageCheck } = require("./projectWhatsappNotifications");

const TWO_HOURS = 2 * 60 * 60 * 1000;
const ONE_DAY = 24 * 60 * 60 * 1000;

const runProductionWorkflowReminders = async () => {
    const now = new Date();
    const panelsToCheck = await panels.find({ isDeleted: false, status: { $in: ["manufacturingFilesReady", "pendingLaserDownload", "laser"] } });
    const recipients = await users.selectall({
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
            const activeStage = (workflow.stages || []).find((stage) => stage.status === "active");
            if (!activeStage || !["pendingLaserDownload", "laser"].includes(activeStage.key)) continue;
            const isWaitingForLaserDownload = activeStage.key === "pendingLaserDownload";
            const dueAt = activeStage.startedAt;
            if (!dueAt || (isWaitingForLaserDownload && now.getTime() - new Date(dueAt).getTime() < TWO_HOURS) || (!isWaitingForLaserDownload && now < new Date(new Date(dueAt).setHours(24, 0, 0, 0)))) continue;
            const lastReminder = workflow.lastReminderAt ? new Date(workflow.lastReminderAt).getTime() : 0;
            if (now.getTime() - lastReminder < TWO_HOURS) continue;

            const stageName = isWaitingForLaserDownload ? "تنزيل الملفات إلى الليزر" : "مرحلة الليزر";
            const results = await Promise.allSettled(
                recipients.map((recipient) => sendProductionStageCheck(recipient.phoneNumber, project, panel, stageName))
            );
            remindersSent += results.filter((result) => result.status === "fulfilled").length;
            const update = { "manufacturing.lastReminderAt": now };
            if (isWaitingForLaserDownload && now.getTime() - new Date(dueAt).getTime() >= ONE_DAY && !activeStage.delayedAt) {
                activeStage.delayReason = "عدم تنزيل الملفات إلى الليزر";
                activeStage.delayedAt = now;
                update["manufacturing.stages"] = workflow.stages;
                delaysRecorded += 1;
            }
            await panels.update({ _id: panel._id }, update);
    }
    return { projectsChecked: new Set(panelsToCheck.map((panel) => String(panel.projectId))).size, remindersSent, delaysRecorded };
};

module.exports = { runProductionWorkflowReminders };
