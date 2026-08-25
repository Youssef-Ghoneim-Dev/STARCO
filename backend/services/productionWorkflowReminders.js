const projects = require("../models/projects");
const users = require("../models/users");
const { sendProductionStageCheck } = require("./projectWhatsappNotifications");

const TWO_HOURS = 2 * 60 * 60 * 1000;
const ONE_DAY = 24 * 60 * 60 * 1000;

const runProductionWorkflowReminders = async () => {
    const now = new Date();
    const projectsToCheck = await projects.selectall({
        isDeleted: false,
        status: { $in: ["manufacturingFilesReady", "laserFilesDownloaded"] },
        "panels.manufacturing.status": { $in: ["filesReady", "downloadedToLaser"] }
    });
    const recipients = await users.selectall({
        role: { $in: ["OwnerManager", "ProductionManager"] },
        approved: true,
        isDeleted: false,
        phoneNumber: { $nin: [null, ""] }
    });
    let remindersSent = 0;
    let delaysRecorded = 0;

    for (const project of projectsToCheck) {
        let changed = false;
        for (const panel of project.panels || []) {
            const workflow = panel.manufacturing;
            if (!workflow || !["filesReady", "downloadedToLaser"].includes(workflow.status)) continue;
            const isWaitingForLaserDownload = workflow.status === "filesReady";
            if (!isWaitingForLaserDownload && workflow.currentStage && workflow.currentStage !== "laser") continue;
            const dueAt = isWaitingForLaserDownload ? workflow.filesReadyAt : workflow.laserStageDueAt;
            if (!dueAt || now < new Date(dueAt)) continue;
            const lastReminder = workflow.lastReminderAt ? new Date(workflow.lastReminderAt).getTime() : 0;
            if (now.getTime() - lastReminder < TWO_HOURS) continue;

            const stageName = isWaitingForLaserDownload ? "تنزيل الملفات إلى الليزر" : "مرحلة الليزر";
            const results = await Promise.allSettled(
                recipients.map((recipient) => sendProductionStageCheck(recipient.phoneNumber, project, panel, stageName))
            );
            remindersSent += results.filter((result) => result.status === "fulfilled").length;
            workflow.lastReminderAt = now;
            if (isWaitingForLaserDownload && now.getTime() - new Date(workflow.filesReadyAt).getTime() >= ONE_DAY && !workflow.delayRecordedAt) {
                workflow.delayReason = "عدم تنزيل الملفات إلى الليزر";
                workflow.delayRecordedAt = now;
                delaysRecorded += 1;
            }
            changed = true;
        }
        if (changed) await projects.update({ id: project._id, panels: project.panels, updatedAt: Date.now() });
    }
    return { projectsChecked: projectsToCheck.length, remindersSent, delaysRecorded };
};

module.exports = { runProductionWorkflowReminders };
