const projects = require("../models/projects");
const panels = require("../models/panels");
const whatsappMessages = require("../models/whatsappMessages");
const notifications = require("../models/notifications");
const { deleteStoredFile } = require("./r2Storage");

const PROJECT_RETENTION_DAYS = 365;

const expiredBefore = () => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - PROJECT_RETENTION_DAYS);
    return date;
};

const collectPanelStorageIds = (projectPanels) => projectPanels.flatMap((panel) => [
    ...(panel.attachments || []),
    ...(panel.executionPdf?.files || []),
    ...(panel.manufacturing?.files || []),
]).map((file) => file.storageFileId).filter(Boolean);

// MongoDB TTL indexes cannot clean R2. Keep the two stores in one deliberate
// cleanup operation so an expired project never leaves its uploaded files behind.
const removeExpiredProjects = async () => {
    const cutoff = expiredBefore();
    const expiredProjects = await projects.model()
        .find({ createdAt: { $lte: cutoff } })
        .select("_id")
        .lean();

    let filesDeleted = 0;
    let fileDeleteFailures = 0;

    for (const project of expiredProjects) {
        const projectPanels = await panels.find({ projectId: project._id });
        const whatsappMedia = await whatsappMessages.findByProject(project._id);
        const storageIds = new Set([
            ...collectPanelStorageIds(projectPanels),
            ...whatsappMedia
                .filter((message) => message.media?.storageProvider === "r2")
                .map((message) => message.media?.storageFileId)
                .filter(Boolean),
        ]);
        const deleted = await Promise.allSettled(
            [...storageIds].map((storageFileId) => deleteStoredFile(storageFileId)),
        );
        filesDeleted += deleted.filter((result) => result.status === "fulfilled").length;
        fileDeleteFailures += deleted.filter((result) => result.status === "rejected").length;

        await Promise.all([
            panels.deleteMany({ projectId: project._id }),
            whatsappMessages.deleteByProject(project._id),
            notifications.model().deleteMany({ projectId: project._id }),
            projects.deleteOne({ _id: project._id }),
        ]);
    }

    return {
        retentionDays: PROJECT_RETENTION_DAYS,
        deletedProjects: expiredProjects.length,
        deletedFiles: filesDeleted,
        fileDeleteFailures,
    };
};

module.exports = { PROJECT_RETENTION_DAYS, removeExpiredProjects };
