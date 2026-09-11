const projects = require("../models/projects");
const panels = require("../models/panels");
const users = require("../models/users");
const { sendProductionStageCheck } = require("./projectWhatsappNotifications");
const { PRODUCTION_CONTROL_ROLES, SUPERVISOR_STAGE_BY_ROLE } = require("../utils/roles");
const { addEgyptWorkingDays, egyptDateValue, isEgyptNonWorkingDate } = require("../utils/egyptWorkingDays");
const { currentProductionStageDueAt, reachedEgyptDate } = require("../utils/productionStageSchedule");

const runProductionWorkflowReminders = async () => {
    const now = new Date();
    if (isEgyptNonWorkingDate(now)) {
        return { projectsChecked: 0, remindersSent: 0, delaysRecorded: 0, skipped: "nonWorkingDay" };
    }
    const panelsToCheck = await panels.find({ isDeleted: false, status: { $in: ["manufacturingFilesPending", "manufacturingFilesReady", "pendingLaserDownload", "laser", "manufacturing", "painting", "assembly"] } });
    const productionRecipients = await users.selectall({
        role: { $in: ["OwnerManager", ...PRODUCTION_CONTROL_ROLES] },
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
            const dueAt = currentProductionStageDueAt(panel);
            const baselineDueAt = panel.deliverySchedule?.deadlines?.[deadlineKey];
            // كل مرحلة تُحسب من وقت بدايتها الفعلي: يومان لملفات التصنيع،
            // ويوم عمل واحد لكل مرحلة إنتاج. بذلك يؤدي الإنجاز المبكر إلى
            // تقديم متابعة كل المراحل التالية تلقائيًا.
            if (!dueAt || !reachedEgyptDate(now, dueAt)) continue;
            const lastReminderValue = waitingForEngineer ? workflow.engineerReminderAt : workflow.lastReminderAt;
            if (lastReminderValue && egyptDateValue(lastReminderValue) === egyptDateValue(now)) continue;

            const stageNames = { pendingLaserDownload: "تنزيل الملفات إلى الليزر", laser: "مرحلة الليزر", manufacturing: "مرحلة التصنيع", painting: "مرحلة الرش", assembly: "مرحلة التجميع" };
            const stageName = waitingForEngineer ? "رفع ملفات التصنيع" : stageNames[activeStage?.key];
            if (!stageName) continue;
            const marketer = project.marketingId
                ? await users.select_one({ _id: project.marketingId, approved: true, isDeleted: false })
                : null;
            const supervisorRole = Object.entries(SUPERVISOR_STAGE_BY_ROLE).find(([, statuses]) => statuses.includes(panel.status))?.[0];
            const supervisorRecipients = !waitingForEngineer && supervisorRole
                ? await users.selectall({ role: supervisorRole, approved: true, isDeleted: false, phoneNumber: { $nin: [null, ""] } })
                : [];
            const recipients = waitingForEngineer
                ? await users.selectall({ _id: panel.engineerId, approved: true, isDeleted: false, phoneNumber: { $nin: [null, ""] } })
                : [...new Map([...productionRecipients, ...supervisorRecipients].map((recipient) => [String(recipient._id), recipient])).values()];
            const results = await Promise.allSettled(
                recipients.map((recipient) => sendProductionStageCheck(recipient.phoneNumber, project, panel, stageName, marketer?.name || "غير محدد", deadlineKey))
            );
            remindersSent += results.filter((result) => result.status === "fulfilled").length;
            const update = { [waitingForEngineer ? "manufacturing.engineerReminderAt" : "manufacturing.lastReminderAt"]: now };
            // سؤال المتابعة ديناميكي، أما التأخير فلا يُسجل لمجرد انتهاء
            // يوم المرحلة إذا كانت اللوحة ما زالت متقدمة عن الخطة النهائية.
            // الاستثناء هو تنزيل الملفات إلى الليزر: عدم تنفيذ الخطوة عند
            // أول متابعة مستحقة يُعد تأخيرًا لأنها لا تحتاج دورة تصنيع.
            const delayAt = activeStage?.key === "pendingLaserDownload"
                ? dueAt
                : baselineDueAt ? addEgyptWorkingDays(baselineDueAt, 1) : null;
            if (!waitingForEngineer && delayAt && reachedEgyptDate(now, delayAt) && !activeStage.delayedAt) {
                activeStage.delayReason = activeStage.key === "pendingLaserDownload"
                    ? "سبب التأخير غير معروف"
                    : `تجاوز الموعد المخطط لـ${stageName}`;
                activeStage.delayedAt = now;
                update["manufacturing.stages"] = workflow.stages;
                delaysRecorded += 1;
            }
            await panels.update({ _id: panel._id }, update);
    }
    return { projectsChecked: new Set(panelsToCheck.map((panel) => String(panel.projectId))).size, remindersSent, delaysRecorded };
};

module.exports = { runProductionWorkflowReminders };
