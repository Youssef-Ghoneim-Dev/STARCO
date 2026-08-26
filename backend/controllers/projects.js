const projectModels = require("../models/projects");
const userModels = require("../models/users");
const syncClient = require("../services/syncClient");
const defaultProject = require("../utils/defaultProject");
const systemConfiguration = require("../models/systemConfiguration");
const clientModels = require("../models/clients");
const { compareClientNames } = require("../utils/clientNameSimilarity");
const {
    sendNewProjectAssigned,
    sendProjectUpdatedReview,
    sendProjectCompletedPreview,
    sendExecutionPdfRequested,
    sendExecutionPdfCompleted,
    sendExecutionConfirmed,
    sendPanelFilesReady
} = require("../services/projectWhatsappNotifications");
const whatsappMessages = require("../models/whatsappMessages");
const { downloadStoredFile, deleteStoredFile, uploadFile, createResumableUploadSession, getVerifiedStoredFile } = require("../services/googleDrive");
const whatsappSessions = require("../models/whatsappSessions");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const detectExecutionFileMimeType = (file) => {
    if (!file?.buffer?.length) return null;

    const buffer = file.buffer;
    const mimeType = String(file.mimetype || "").toLowerCase();
    const fileName = String(file.originalname || "").toLowerCase();
    const startsWith = (...bytes) => bytes.every((byte, index) => buffer[index] === byte);
    const ascii = (start, end) => buffer.subarray(start, end).toString("ascii");

    if (ascii(0, 5) === "%PDF-") return "application/pdf";
    if (startsWith(0xff, 0xd8, 0xff)) return "image/jpeg";
    if (startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
    if (["GIF87a", "GIF89a"].includes(ascii(0, 6))) return "image/gif";
    if (ascii(0, 2) === "BM") return "image/bmp";
    if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
    if (["II*\u0000", "MM\u0000*"].includes(ascii(0, 4))) return "image/tiff";

    const isoBrand = ascii(4, 16).toLowerCase();
    if (isoBrand.startsWith("ftyp") && /(avif|avis|heic|heix|hevc|hevx|mif1|msf1)/.test(isoBrand)) {
        return isoBrand.includes("avi") ? "image/avif" : "image/heic";
    }

    if (mimeType === "application/pdf" || fileName.endsWith(".pdf")) return "application/pdf";
    if (mimeType.startsWith("image/")) return mimeType;
    if (/\.(avif|bmp|gif|heic|heif|jpe?g|png|tiff?|webp)$/i.test(fileName)) {
        return mimeType !== "application/octet-stream" ? mimeType : "image/*";
    }
    return null;
};

const crcTable = Array.from({ length: 256 }, (_, index) => {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    return value >>> 0;
});
const crc32 = (buffer) => {
    let value = 0xffffffff;
    for (const byte of buffer) value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);
    return (value ^ 0xffffffff) >>> 0;
};
const dosDateTime = (date = new Date()) => ({
    time: ((date.getHours() & 31) << 11) | ((date.getMinutes() & 63) << 5) | Math.floor(date.getSeconds() / 2),
    date: (((Math.max(date.getFullYear(), 1980) - 1980) & 127) << 9) | (((date.getMonth() + 1) & 15) << 5) | (date.getDate() & 31)
});
const createZipArchive = (entries) => {
    const localParts = [];
    const centralParts = [];
    let offset = 0;
    entries.forEach(({ name, buffer, date }) => {
        const fileName = Buffer.from(name, "utf8");
        const checksum = crc32(buffer);
        const stamp = dosDateTime(date);
        const localHeader = Buffer.alloc(30);
        localHeader.writeUInt32LE(0x04034b50, 0);
        localHeader.writeUInt16LE(20, 4);
        localHeader.writeUInt16LE(0x0800, 6);
        localHeader.writeUInt16LE(0, 8);
        localHeader.writeUInt16LE(stamp.time, 10);
        localHeader.writeUInt16LE(stamp.date, 12);
        localHeader.writeUInt32LE(checksum, 14);
        localHeader.writeUInt32LE(buffer.length, 18);
        localHeader.writeUInt32LE(buffer.length, 22);
        localHeader.writeUInt16LE(fileName.length, 26);
        localHeader.writeUInt16LE(0, 28);
        localParts.push(localHeader, fileName, buffer);

        const centralHeader = Buffer.alloc(46);
        centralHeader.writeUInt32LE(0x02014b50, 0);
        centralHeader.writeUInt16LE(20, 4);
        centralHeader.writeUInt16LE(20, 6);
        centralHeader.writeUInt16LE(0x0800, 8);
        centralHeader.writeUInt16LE(0, 10);
        centralHeader.writeUInt16LE(stamp.time, 12);
        centralHeader.writeUInt16LE(stamp.date, 14);
        centralHeader.writeUInt32LE(checksum, 16);
        centralHeader.writeUInt32LE(buffer.length, 20);
        centralHeader.writeUInt32LE(buffer.length, 24);
        centralHeader.writeUInt16LE(fileName.length, 28);
        centralHeader.writeUInt32LE(offset, 42);
        centralParts.push(centralHeader, fileName);
        offset += localHeader.length + fileName.length + buffer.length;
    });
    const centralDirectory = Buffer.concat(centralParts);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(entries.length, 8);
    end.writeUInt16LE(entries.length, 10);
    end.writeUInt32LE(centralDirectory.length, 12);
    end.writeUInt32LE(offset, 16);
    return Buffer.concat([...localParts, centralDirectory, end]);
};

const isOwner = (user) => user.role === "OwnerManager";
const isEngineer = (user) => user.role === "Engineer";
const isMarketer = (user) => user.role === "Marketer";
const isProductionManager = (user) => user.role === "ProductionManager";
const canWorkOnProjects = (user) => isOwner(user) || isEngineer(user);
const canUseRecycleBin = (user) => ["OwnerManager", "Engineer", "Marketer", "MarketingManager"].includes(user.role);
const sameId = (first, second) => String(first || "") === String(second || "");
const MARKETER_EDIT_STATUSES = ["marketingDraft", "editingByMarketing"];
const TECHNICAL_EDIT_STATUSES = ["inProgress", "editing", "editingByEngineer", "editingByOwner"];
const QUOTE_COMPLETED_STATUSES = ["quoteCompleted", "executionPdfRequested", "executionPdfReady", "executionOrdered", "manufacturingFilesPending", "manufacturingFilesReady", "laserFilesDownloaded", "completed"];

const getPanelById = (project, panelId) => (project.panels || []).find(
    (panel) => String(panel.panelId) === String(panelId)
);
const ensurePanelManufacturing = (panel) => {
    if (!panel.manufacturing) panel.manufacturing = { status: "notStarted", notes: "", files: [] };
    if (!panel.manufacturing.files) panel.manufacturing.files = [];
    return panel.manufacturing;
};

const PRODUCTION_STAGE_KEYS = ["awaitingLaserDownload", "laser", "manufacturing", "painting", "assembly"];
const PRODUCTION_STAGE_REASONS = {
    laser: ["عطل في ماكينة الليزر", "ازدحام/ضغط على الليزر", "مشكلة في ملفات DXF", "نقص خامات/صاج", "انتظار تعديل من المهندس", "انقطاع كهرباء", "أخرى"],
    manufacturing: ["عطل في ماكينة/معدات التصنيع", "نقص خامات", "نقص عمالة", "تأخر اللوحة من مرحلة الليزر", "إعادة تصنيع جزء بسبب خطأ", "ضغط أعمال", "أخرى"],
    painting: ["عطل أو صيانة في معدات الرش", "نقص دهان/خامات", "انتظار تجهيز السطح", "ازدحام جدول الرش", "تأخر من مرحلة التصنيع", "إعادة رش بسبب مشكلة في الجودة", "أخرى"],
    assembly: ["نقص مكونات كهربائية", "نقص إكسسوارات/قطع", "نقص عمالة", "تأخر وصول أجزاء اللوحة", "مشكلة اكتُشفت أثناء التجميع", "إعادة عمل/تعديل", "تأخر من المرحلة السابقة", "أخرى"]
};
const ensureProductionStages = (manufacturing) => {
    const currentStage = PRODUCTION_STAGE_KEYS.includes(manufacturing.currentStage)
        ? manufacturing.currentStage
        : "awaitingLaserDownload";
    const currentIndex = PRODUCTION_STAGE_KEYS.indexOf(currentStage);
    const existing = new Map((manufacturing.productionStages || []).map((stage) => [stage.key, stage]));
    manufacturing.productionStages = PRODUCTION_STAGE_KEYS.map((key, index) => {
        const saved = existing.get(key)?.toObject?.() || existing.get(key) || {};
        return {
            ...saved,
            key,
            status: saved.status || (index < currentIndex ? "completed" : index === currentIndex ? "active" : "pending")
        };
    });
    if (!manufacturing.productionHistory) manufacturing.productionHistory = [];
    return manufacturing.productionStages;
};

const canManageExecutionRequest = async (user, project) => {
    if (isOwner(user) || user.role === "MarketingManager") return true;
    if (isEngineer(user)) {
        return project.source === "manual"
            && (!project.engineerId || sameId(project.engineerId, user._id));
    }
    return isMarketer(user) && marketerOwnsProject(user, project);
};

const canManageExecutionPdf = (user, project) => isOwner(user)
    || (isEngineer(user) && (!project.engineerId || sameId(project.engineerId, user._id)));
const canManageManufacturingFiles = (user, project) => isOwner(user)
    || (isEngineer(user) && (!project.engineerId || sameId(project.engineerId, user._id)));
const canDownloadManufacturingFiles = (user, project) => isOwner(user)
    || isProductionManager(user)
    || (isEngineer(user) && (!project.engineerId || sameId(project.engineerId, user._id)));
const deriveExecutionStatus = (panels = []) => {
    const statuses = panels.map((panel) => panel.executionPdf?.status || "notRequested");
    if (statuses.includes("requested")) return "executionPdfRequested";
    if (statuses.includes("ready")) return "executionPdfReady";
    if (statuses.includes("confirmed") || statuses.includes("skipped")) return "manufacturingFilesPending";
    return "quoteCompleted";
};

// Older WhatsApp projects may have been created before marketingId was saved
// on the project.  Their WhatsApp session still has the correct marketer ID,
// so retain access through that relation rather than hiding valid projects.
const marketerOwnsProject = async (user, project) => {
    if (sameId(project.marketingId, user._id)) return true;
    if (!project.whatsappSessionId) return false;
    const session = await whatsappSessions.findById(project.whatsappSessionId);
    return sameId(session?.marketingRepId, user._id);
};

const getProjectMarketer = async (project) => {
    let marketerId = project.marketingId;
    if (!marketerId && project.whatsappSessionId) {
        const session = await whatsappSessions.findById(project.whatsappSessionId);
        marketerId = session?.marketingRepId || null;
    }
    return marketerId
        ? userModels.select_one({ _id: marketerId, approved: true, isDeleted: false })
        : null;
};

const getActiveEngineers = () => userModels.selectall({
    role: "Engineer",
    approved: true,
    isDeleted: false,
    phoneNumber: { $nin: [null, ""] }
});

const getActiveUsersByRoles = (roles) => userModels.selectall({
    role: { $in: roles },
    approved: true,
    isDeleted: false,
    phoneNumber: { $nin: [null, ""] }
});

const uniqueRecipients = (users = []) => [...new Map(
    users.filter((user) => user?.phoneNumber).map((user) => [String(user.phoneNumber).replace(/\D/g, ""), user])
).values()];

const notifyEngineersAboutSubmittedProject = async (project, isUpdatedProject) => {
    const assignedEngineer = project.engineerId
        ? await userModels.select_one({ _id: project.engineerId, approved: true, isDeleted: false })
        : null;
    const recipients = assignedEngineer?.phoneNumber ? [assignedEngineer] : await getActiveEngineers();
    if (!recipients.length) {
        throw new Error("لا يوجد مهندس نشط برقم WhatsApp مسجل.");
    }

    const marketer = await getProjectMarketer(project);
    const send = isUpdatedProject ? sendProjectUpdatedReview : sendNewProjectAssigned;
    const results = await Promise.allSettled(
        recipients.map((engineer) => send(engineer.phoneNumber, project, marketer?.name || "غير محدد"))
    );
    const sentCount = results.filter((result) => result.status === "fulfilled").length;
    if (!sentCount) throw results.find((result) => result.status === "rejected")?.reason || new Error("تعذر إرسال قالب WhatsApp.");
    return sentCount === recipients.length
        ? `تم إرسال إشعار WhatsApp إلى ${sentCount} مهندس.`
        : `تم إرسال الإشعار إلى ${sentCount} من أصل ${recipients.length} مهندس.`;
};

const editableProjectData = (body = {}) => {
    const data = {};
    if (body.client) data.client = body.client;
    if (body.prices) data.prices = body.prices;
    if (body.panels) data.panels = body.panels;
    if (body.clientNameReview) data.clientNameReview = body.clientNameReview;
    return data;
};

const preservePanelWorkflow = (incomingPanels, existingPanels = []) => {
    if (!Array.isArray(incomingPanels)) return incomingPanels;
    return incomingPanels.map((incoming, index) => {
        const existing = existingPanels.find((panel) => String(panel.panelId) === String(incoming.panelId))
            || existingPanels[index];
        if (!existing) return incoming;
        const existingObject = existing.toObject?.() || existing;
        return {
            ...incoming,
            executionPdf: existingObject.executionPdf,
            manufacturing: existingObject.manufacturing
        };
    });
};

const buildClientNameReview = async (client) => {
    if (!client?.name?.trim() || client?.id) return null;
    const candidates = (await clientModels.select_for_name_review())
        .map((existing) => ({ existing, match: compareClientNames(client.name, existing.name) }))
        .filter(({ match }) => match.isCandidate)
        .sort((left, right) => right.match.similarity - left.match.similarity)
        .map(({ existing, match }) => ({
            clientId: existing._id,
            name: existing.name,
            type: existing.type,
            profitPercentage: existing.profitPercentage,
            similarity: match.similarity
        }));
    return candidates.length ? { enteredName: client.name.trim(), resolved: false, resolution: "", candidates } : null;
};

// A marketer owns the request details, but never the quote.  Keep their
// update surface deliberately narrow so a browser request cannot overwrite
// pricing, calculated parts, or the project state.
const editableMarketingProjectData = (body = {}, existingProject) => {
    const incomingPanels = Array.isArray(body.panels) ? body.panels : [];
    const existingPanels = existingProject.panels || [];
    const defaultPanel = defaultProject().panels[0];

    const panels = incomingPanels.map((incoming, index) => {
        const current = existingPanels.find((panel) => String(panel.panelId) === String(incoming.panelId))
            || existingPanels[index]
            || defaultPanel;
        const currentObject = current.toObject?.() || current;

        const incomingCopperDetails = incoming.copperDetails || {};
        const branchGroups = Array.isArray(incomingCopperDetails.branchGroups)
            ? incomingCopperDetails.branchGroups.map((group, groupIndex) => ({
                id: String(group.id || `branch-group-${groupIndex + 1}`).slice(0, 100),
                optionKey: String(group.optionKey || "").slice(0, 100),
                count: Math.max(1, Math.min(100, Number(group.count) || 1))
            }))
            : (currentObject.copperDetails?.branchGroups || []);
        const branchRows = branchGroups.map((group) => ({
            branchId: `${group.id}-branch`,
            branchGroupId: group.id,
            optionKey: group.optionKey,
            direction: "one",
            barCount: 1,
            quantity: group.count
        }));
        const selectedMainKey = String(incomingCopperDetails.mainKey || incoming.copper?.main?.optionKey || currentObject.copperDetails?.mainKey || "").slice(0, 100);

        return {
            ...currentObject,
            panelId: currentObject.panelId || incoming.panelId,
            panelName: String(incoming.panelName || currentObject.panelName || `لوحة ${index + 1}`).slice(0, 100),
            panelType: String(incoming.panelType || "").slice(0, 100),
            panelTypeKey: String(incoming.panelTypeKey || "").slice(0, 100),
            thickness: Array.isArray(incoming.thickness) ? incoming.thickness : (currentObject.thickness || []),
            hasCopper: typeof incoming.hasCopper === "boolean" ? incoming.hasCopper : null,
            additionalDetails: String(incoming.additionalDetails || ""),
            controlInstallation: String(incoming.controlInstallation || ""),
            copperDetails: {
                switches: String(incoming.copperDetails?.switches || ""),
                main: String(incoming.copperDetails?.main || ""),
                mainKey: selectedMainKey,
                branches: String(incoming.copperDetails?.branches || ""),
                notes: String(incoming.copperDetails?.notes || ""),
                branchGroups
            },
            copper: incoming.hasCopper === true ? {
                ...(currentObject.copper?.toObject?.() || currentObject.copper || {}),
                enabled: true,
                main: { ...(currentObject.copper?.main?.toObject?.() || currentObject.copper?.main || {}), optionKey: selectedMainKey },
                branches: branchRows
            } : { ...(currentObject.copper?.toObject?.() || currentObject.copper || {}), enabled: false, branches: [] }
        };
    });

    return {
        client: {
            ...(existingProject.client.toObject?.() || existingProject.client),
            id: body.client?.id || null,
            name: String(body.client?.name || "").slice(0, 100),
            type: body.client?.type === "company" ? "company" : "person",
            profitPercentage: Number(body.client?.profitPercentage) || 0
        },
        panels: panels.length ? panels : existingPanels
    };
};

const getAssignedEngineerName = async (project) => {
    if (!project?.engineerId) return null;
    const engineer = await userModels.select_one({ _id: project.engineerId });
    return engineer?.name || "مهندس آخر";
};

const projectAlreadyClaimed = async (res, project) => {
    const engineerName = await getAssignedEngineerName(project);
    if (!engineerName) {
        return res.status(409).json({
            status: "error",
            code: "PROJECT_NOT_OPENED",
            message: "هذا المشروع لم يتم فتحه أو بدء العمل عليه بعد."
        });
    }
    return res.status(409).json({
        status: "error",
        code: "PROJECT_ALREADY_CLAIMED",
        message: `هذا المشروع يعمل عليه بالفعل ${engineerName}.`,
        engineerName
    });
};

const getProjects = async (req, res, next) => {
    try {
        const condition = { isDeleted: false };
        if (req.user.role === "Marketer") {
            const sessions = await whatsappSessions.findByMarketer(req.user._id);
            const sessionIds = sessions.map((session) => session._id);
            condition.$or = [
                { marketingId: req.user._id },
                ...(sessionIds.length ? [{ whatsappSessionId: { $in: sessionIds } }] : [])
            ];
        } else if (isEngineer(req.user)) {
            condition.status = { $nin: ["marketingDraft", "editingByMarketing"] };
        } else if (isProductionManager(req.user)) {
            condition.status = { $in: ["quoteCompleted", "executionPdfRequested", "executionPdfReady", "executionOrdered", "manufacturingFilesPending", "manufacturingFilesReady", "laserFilesDownloaded", "completed"] };
        } else if (!canWorkOnProjects(req.user) && req.user.role !== "MarketingManager") {
            return res.status(403).json({ status: "error", message: "لا تملك صلاحية عرض المشاريع." });
        }
        return res.status(200).json(await projectModels.selectall(condition));
    } catch (error) {
        next(error);
    }
};

// The client preview is intentionally separate from the dashboard.  It is
// only available for a completed project and needs the unguessable key that
// was sent to the marketer in the WhatsApp link.
const getClientProjectPreview = async (req, res, next) => {
    try {
        const token = String(req.params.key || req.query.key || "");
        if (!token) return res.status(401).json({ status: "error", message: "رابط المعاينة غير مكتمل." });

        const project = req.params.key
            ? await projectModels.findClientPreviewByToken(token)
            : await projectModels.findClientPreview(req.params.id, token);
        if (!project) return res.status(404).json({ status: "error", message: "رابط المعاينة غير صالح أو انتهت صلاحيته." });

        const configuration = await systemConfiguration.get();
        return res.status(200).json({
            project: {
                client: project.client,
                prices: project.prices,
                panels: project.panels,
                updatedAt: project.updatedAt
            },
            copperConfiguration: configuration?.copperConfiguration || {}
        });
    } catch (error) {
        next(error);
    }
};

const getProject = async (req, res, next) => {
    try {
        const projectId = req.params.id;
        let project = await projectModels.select_one({ _id: projectId, isDeleted: false });
        if (!project) return res.status(404).json({ status: "error", message: `project id ${projectId} not found` });

        // Claiming is atomic. Two engineers opening the same pending project
        // cannot both become its owner.
        if (isEngineer(req.user) && project.status === "pending" && !project.engineerId) {
            const claimedProject = await projectModels.claimByEngineer(projectId, req.user._id);
            project = claimedProject || await projectModels.select_one({ _id: projectId, isDeleted: false });
        }

        const marketer = await getProjectMarketer(project);
        const engineer = project.engineerId
            ? await userModels.select_one({ _id: project.engineerId })
            : null;
        const latestProductionUpdate = (project.panels || [])
            .flatMap((item) => item.manufacturing?.productionHistory || [])
            .sort((first, second) => new Date(second.createdAt || 0) - new Date(first.createdAt || 0))[0];
        const projectResponse = {
            ...(project.toObject?.() || project),
            marketingRepresentative: marketer ? {
                name: marketer.name,
                phoneNumber: marketer.phoneNumber,
                email: marketer.email
            } : null,
            assignedEngineer: engineer ? {
                name: engineer.name,
                phoneNumber: engineer.phoneNumber,
                email: engineer.email
            } : null,
            lastUpdatedByName: latestProductionUpdate?.actorName || engineer?.name || marketer?.name || "غير محدد"
        };

        if (isOwner(req.user) || req.user.role === "MarketingManager") return res.status(200).json(projectResponse);
        if (req.user.role === "Marketer") {
            if (!(await marketerOwnsProject(req.user, project))) {
                return res.status(403).json({ status: "error", message: "هذا المشروع لا يخصك." });
            }
            return res.status(200).json(projectResponse);
        }
        if (isEngineer(req.user)) {
            if (!sameId(project.engineerId, req.user._id)) {
                return res.status(200).json({
                    ...projectResponse,
                    readOnlyForCurrentUser: true,
                    workingEngineerName: engineer?.name || "مهندس آخر"
                });
            }
            return res.status(200).json({ ...projectResponse, readOnlyForCurrentUser: false });
        }
        if (isProductionManager(req.user) && ["quoteCompleted", "executionPdfRequested", "executionPdfReady", "executionOrdered", "manufacturingFilesPending", "manufacturingFilesReady", "laserFilesDownloaded", "completed"].includes(project.status)) {
            return res.status(200).json(projectResponse);
        }
        return res.status(403).json({ status: "error", message: "لا تملك صلاحية عرض المشروع." });
    } catch (error) {
        next(error);
    }
};

const canReadProject = (user, project) => isOwner(user)
    || user.role === "MarketingManager"
    || isProductionManager(user)
    || isEngineer(user);

const getProjectMedia = async (req, res, next) => {
    try {
        const project = await projectModels.select_one({ _id: req.params.id, isDeleted: false });
        if (!project) return res.status(404).json({ status: "error", message: "المشروع غير موجود." });
        const marketerCanRead = req.user.role === "Marketer" && await marketerOwnsProject(req.user, project);
        if (!canReadProject(req.user, project) && !marketerCanRead) return res.status(403).json({ status: "error", message: "لا تملك صلاحية عرض مرفقات المشروع." });
        const records = await whatsappMessages.findAllByProject(project._id);
        return res.status(200).json(records.filter((record) => record.media?.storageFileId).map((record) => ({
            id: record._id,
            panelId: record.panelId,
            type: record.type,
            mimeType: record.media?.mimeType || "application/octet-stream",
            fileName: record.media?.fileName || "مرفق واتساب",
            fileSize: record.media?.fileSize || null,
            createdAt: record.createdAt
        })));
    } catch (error) { next(error); }
};

const getProjectMediaFile = async (req, res, next) => {
    try {
        const project = await projectModels.select_one({ _id: req.params.id, isDeleted: false });
        if (!project) return res.status(404).end();
        const marketerCanRead = req.user.role === "Marketer" && await marketerOwnsProject(req.user, project);
        if (!canReadProject(req.user, project) && !marketerCanRead) return res.sendStatus(403);
        const records = await whatsappMessages.findAllByProject(project._id);
        const record = records.find((item) => String(item._id) === req.params.mediaId);
        if (!record?.media?.storageFileId) return res.sendStatus(404);
        const file = await downloadStoredFile(record.media.storageFileId);
        res.setHeader("Content-Type", file.mimeType);
        res.setHeader("Cache-Control", "private, max-age=300");
        return res.send(file.buffer);
    } catch (error) { next(error); }
};

const getDeletedProjects = async (req, res, next) => {
    try {
        if (!canUseRecycleBin(req.user)) return res.status(403).json({ status: "error", message: "لا تملك صلاحية عرض المشاريع المحذوفة." });
        return res.status(200).json(await projectModels.selectall({ isDeleted: true }));
    } catch (error) {
        next(error);
    }
};

const addProject = async (req, res, next) => {
    try {
        if (!canWorkOnProjects(req.user) && !isMarketer(req.user)) {
            return res.status(403).json({ status: "error", message: "لا تملك صلاحية بدء مشروع." });
        }
        const systemConfig = await systemConfiguration.get();
        const baseProject = defaultProject();
        const configuredPrices = systemConfig?.prices || {};
        const requestData = editableProjectData(req.body);
        const basePanel = baseProject.panels[0];
        const newProject = {
            ...baseProject,
            ...requestData,
            client: { ...baseProject.client, ...(requestData.client || {}) },
            prices: {
                sheetPrice: systemConfig?.sheetPrice ?? baseProject.prices.sheetPrice,
                paintPrice: systemConfig?.paintPrice ?? baseProject.prices.paintPrice,
                ...(requestData.prices || {})
            },
            panels: requestData.panels || [{
                ...basePanel,
                prices: {
                    ...basePanel.prices,
                    manufacturing: configuredPrices.manufacturing ?? basePanel.prices.manufacturing,
                    locks: configuredPrices.locks ?? basePanel.prices.locks,
                    hinges: configuredPrices.hinges ?? basePanel.prices.hinges,
                    transport: configuredPrices.transport ?? basePanel.prices.transport,
                    screws: configuredPrices.screws ?? basePanel.prices.screws,
                    stretch: configuredPrices.stretch ?? basePanel.prices.stretch
                }
            }],
            engineerId: isMarketer(req.user) ? null : req.user._id,
            marketingId: isMarketer(req.user) ? req.user._id : null,
            status: isMarketer(req.user) ? "marketingDraft" : "inProgress",
            source: isMarketer(req.user) ? "marketing" : "manual"
        };
        const project = await projectModels.create(newProject);
        return res.status(201).json({ status: "ok", message: "project added", project });
    } catch (error) {
        next(error);
    }
};

const updateProject = async (req, res, next) => {
    try {
        const projectId = req.params.id;
        const existingProject = await projectModels.select_one({ _id: projectId, isDeleted: false });
        if (!existingProject) return res.status(404).json({ status: "error", message: `project id ${projectId} not found` });
        if (isMarketer(req.user)) {
            if (!(await marketerOwnsProject(req.user, existingProject))) {
                return res.status(403).json({ status: "error", message: "هذا المشروع لا يخصك." });
            }
            if (!MARKETER_EDIT_STATUSES.includes(existingProject.status)) {
                return res.status(409).json({ status: "error", message: "هذا المشروع ليس مفتوحًا لتعديل المندوب الآن." });
            }
            const project = await projectModels.update({
                id: projectId,
                ...editableMarketingProjectData(req.body, existingProject),
                updatedAt: Date.now()
            });
            return res.status(200).json({ status: "ok", message: "تم حفظ بيانات المشروع.", project });
        }
        if (!isOwner(req.user) && !sameId(existingProject.engineerId, req.user._id)) {
            return projectAlreadyClaimed(res, existingProject);
        }
        if (!TECHNICAL_EDIT_STATUSES.includes(existingProject.status)) {
            return res.status(409).json({ status: "error", message: "هذا المشروع غير مفتوح للتعديل الفني الآن." });
        }

        const updates = editableProjectData(req.body);
        if (updates.panels) {
            updates.panels = preservePanelWorkflow(updates.panels, existingProject.panels || []);
        }
        const project = isOwner(req.user)
            ? await projectModels.update({ id: projectId, ...updates, updatedAt: Date.now() })
            : await projectModels.updateOwnedProject(projectId, req.user._id, updates);
        if (!project) return res.status(409).json({ status: "error", message: "تعذر حفظ المشروع. ربما تم تغيير حالته." });
        return res.status(200).json({ status: "ok", message: "project updated", project });
    } catch (error) {
        next(error);
    }
};

const startProjectEditing = async (req, res, next) => {
    try {
        const project = await projectModels.select_one({ _id: req.params.id, isDeleted: false });
        if (!project) return res.status(404).json({ status: "error", message: "المشروع غير موجود." });

        const marketerRequested = isMarketer(req.user);
        const marketerOwns = marketerRequested && await marketerOwnsProject(req.user, project);
        const technicalOwns = isOwner(req.user) || (isEngineer(req.user) && sameId(project.engineerId, req.user._id));
        if (!marketerOwns && !technicalOwns) {
            return res.status(403).json({ status: "error", message: "لا تملك صلاحية تحويل هذا المشروع إلى وضع التعديل." });
        }

        if (!QUOTE_COMPLETED_STATUSES.includes(project.status)) {
            return res.status(409).json({ status: "error", message: "هذا المشروع مفتوح بالفعل لدى مستخدم آخر أو ما زال قيد العمل." });
        }

        const editingStatus = marketerRequested
            ? "editingByMarketing"
            : isOwner(req.user) ? "editingByOwner" : "editingByEngineer";
        const editingProject = await projectModels.update({ id: project._id, status: editingStatus, updatedAt: Date.now() });
        let notification = "تم تحويل المشروع إلى وضع التعديل.";

        if (project.status === "quoteCompleted") {
            try {
                if (marketerRequested) {
                    notification = await notifyEngineersAboutSubmittedProject(editingProject, true);
                } else if (!marketerRequested) {
                    const marketer = await getProjectMarketer(project);
                    if (marketer?.phoneNumber) {
                        await sendProjectUpdatedReview(
                            marketer.phoneNumber,
                            editingProject,
                            marketer.name || "غير محدد"
                        );
                        notification = "تم تحويل المشروع إلى وضع التعديل وإرسال قالب المراجعة إلى المندوب.";
                    }
                }
            } catch (error) {
                notification = "تم تحويل المشروع إلى وضع التعديل، لكن تعذر إرسال إشعار WhatsApp.";
            }
        }

        return res.status(200).json({ status: "ok", message: "تم تحويل المشروع إلى وضع التعديل.", notification, project: editingProject });
    } catch (error) { next(error); }
};

const submitMarketingProject = async (req, res, next) => {
    try {
        if (!isMarketer(req.user)) {
            return res.status(403).json({ status: "error", message: "إرسال المشروع للمهندس متاح للمندوب فقط." });
        }
        const project = await projectModels.select_one({ _id: req.params.id, isDeleted: false });
        if (!project) return res.status(404).json({ status: "error", message: "المشروع غير موجود." });
        if (!(await marketerOwnsProject(req.user, project))) {
            return res.status(403).json({ status: "error", message: "هذا المشروع لا يخصك." });
        }
        if (!MARKETER_EDIT_STATUSES.includes(project.status)) {
            return res.status(409).json({ status: "error", message: "هذا المشروع أُرسل بالفعل للمهندس أو يعمل عليه شخص آخر." });
        }
        const wasUpdatedProject = project.status === "editingByMarketing";
        const clientNameReview = await buildClientNameReview(project.client);
        const submittedProject = await projectModels.update({ id: project._id, status: "pending", clientNameReview, updatedAt: Date.now() });
        try {
            const notification = await notifyEngineersAboutSubmittedProject(submittedProject, wasUpdatedProject);
            return res.status(200).json({ status: "ok", message: "تم حفظ المشروع.", notification, project: submittedProject });
        } catch (error) {
            console.error("WhatsApp project submission template failed:", {
                projectId: String(submittedProject._id),
                projectSource: submittedProject.source,
                previousStatus: project.status,
                message: error.message,
                metaCode: error.metaCode,
                metaSubcode: error.metaSubcode,
                metaDetails: error.metaDetails
            });
            const retryableProject = await projectModels.update({
                id: submittedProject._id,
                status: project.status,
                updatedAt: Date.now()
            });
            return res.status(502).json({
                status: "error",
                message: `تم حفظ البيانات، لكن تعذر إرسال إشعار WhatsApp: ${error.message}. يمكنك المحاولة مرة أخرى.`,
                project: retryableProject
            });
        }
    } catch (error) { next(error); }
};

const uploadProjectMedia = async (req, res, next) => {
    try {
        const project = await projectModels.select_one({ _id: req.params.id, isDeleted: false });
        if (!project) return res.status(404).json({ status: "error", message: "المشروع غير موجود." });
        if (!isMarketer(req.user) || !(await marketerOwnsProject(req.user, project))) {
            return res.status(403).json({ status: "error", message: "إضافة المرفقات متاحة للمندوب صاحب المشروع فقط." });
        }
        if (!MARKETER_EDIT_STATUSES.includes(project.status)) {
            return res.status(409).json({ status: "error", message: "لا يمكن إضافة مرفقات لأن المشروع ليس مفتوحًا لتعديل المندوب." });
        }
        if (!req.file) return res.status(400).json({ status: "error", message: "اختر صورة أو تسجيلًا صوتيًا أولًا." });
        const panel = (project.panels || []).find((item) => String(item.panelId) === String(req.body.panelId));
        if (!panel) return res.status(400).json({ status: "error", message: "اللوحة المختارة غير موجودة." });
        const type = req.file.mimetype.startsWith("image/") ? "image" : req.file.mimetype.startsWith("audio/") ? "audio" : null;
        if (!type) return res.status(400).json({ status: "error", message: "يسمح بالصور والتسجيلات الصوتية فقط." });

        const uploaded = await uploadFile({
            fileName: `frontend-${project._id}-${panel.panelId}-${Date.now()}-${crypto.randomUUID()}-${req.file.originalname}`,
            mimeType: req.file.mimetype,
            buffer: req.file.buffer
        });
        const record = await whatsappMessages.create({
            direction: "inbound",
            projectId: project._id,
            panelId: panel.panelId,
            senderPhone: req.user.phoneNumber || null,
            type,
            media: {
                mimeType: req.file.mimetype,
                fileName: uploaded.name || req.file.originalname,
                fileSize: Number(uploaded.size) || req.file.size,
                storageProvider: "google-drive",
                storageFileId: uploaded.id,
                uploadedAt: new Date()
            },
            status: "attached"
        });
        return res.status(201).json({
            id: record._id,
            panelId: record.panelId,
            type: record.type,
            fileName: record.media.fileName,
            mimeType: record.media.mimeType,
            fileSize: record.media.fileSize
        });
    } catch (error) { next(error); }
};

const deleteProjectMedia = async (req, res, next) => {
    try {
        const project = await projectModels.select_one({ _id: req.params.id, isDeleted: false });
        if (!project) return res.status(404).json({ status: "error", message: "المشروع غير موجود." });
        if (!isMarketer(req.user) || !(await marketerOwnsProject(req.user, project))) {
            return res.status(403).json({ status: "error", message: "حذف المرفقات متاح للمندوب صاحب المشروع فقط." });
        }
        if (!MARKETER_EDIT_STATUSES.includes(project.status)) return res.status(409).json({ status: "error", message: "لا يمكن حذف مرفقات لأن المشروع ليس مفتوحًا لتعديل المندوب." });

        const records = await whatsappMessages.findAllByProject(project._id);
        const record = records.find((item) => String(item._id) === String(req.params.mediaId));
        if (!record) return res.status(404).json({ status: "error", message: "المرفق غير موجود." });
        if (record.media?.storageFileId) await deleteStoredFile(record.media.storageFileId);
        await whatsappMessages.deleteById(record._id);
        return res.status(200).json({ status: "ok", message: "تم حذف المرفق." });
    } catch (error) { next(error); }
};

const getProjectMediaWhatsappLink = async (req, res, next) => {
    try {
        if (!isMarketer(req.user)) {
            return res.status(403).json({ status: "error", message: "إرسال المرفقات عبر WhatsApp متاح للمندوب فقط." });
        }
        let project = await projectModels.select_one({ _id: req.params.id, isDeleted: false });
        if (!project || !(await marketerOwnsProject(req.user, project))) {
            return res.status(404).json({ status: "error", message: "المشروع غير موجود أو لا تملك صلاحية الوصول إليه." });
        }
        // Backfill ownership for legacy marketing/WhatsApp drafts. The media
        // webhook relies on this stable owner instead of whichever duplicate
        // user record happens to be returned for the same phone number.
        if (!project.marketingId) {
            project = await projectModels.update({
                id: project._id,
                marketingId: req.user._id,
                updatedAt: Date.now()
            });
        }
        const panelIndex = project.panels.findIndex((panel) => String(panel.panelId) === String(req.query.panelId || ""));
        if (panelIndex < 0) return res.status(400).json({ status: "error", message: "اختر لوحة صحيحة لإضافة المرفقات." });

        const businessPhone = String(process.env.WHATSAPP_BUSINESS_NUMBER || "").replace(/\D/g, "");
        if (!businessPhone) {
            return res.status(503).json({ status: "error", message: "رقم WhatsApp الخاص بالشركة غير مضبوط بعد." });
        }
        const text = `STARCO MEDIA #${project._id} PANEL ${panelIndex + 1}`;
        return res.status(200).json({
            status: "ok",
            text,
            url: `https://wa.me/${businessPhone}?text=${encodeURIComponent(text)}`
        });
    } catch (error) { next(error); }
};

const completeProject = async (req, res, next) => {
    try {
        const project = await projectModels.select_one({ _id: req.params.id, isDeleted: false });
        if (!project) return res.status(404).json({ status: "error", message: "المشروع غير موجود." });
        if (!isOwner(req.user) && !sameId(project.engineerId, req.user._id)) {
            return projectAlreadyClaimed(res, project);
        }
        if (QUOTE_COMPLETED_STATUSES.includes(project.status)) {
            return res.status(200).json({ status: "ok", message: "عرض السعر مكتمل بالفعل.", project });
        }
        if (!TECHNICAL_EDIT_STATUSES.includes(project.status)) {
            return res.status(409).json({ status: "error", message: "لا يمكن إتمام المشروع قبل فتحه للتعديل الفني." });
        }

        const projectForClientSync = project.toObject();
        await syncClient(projectForClientSync);
        // A compact, URL-safe 128-bit key. It is still unguessable but keeps
        // the WhatsApp preview link short and readable.
        const clientPreviewToken = crypto.randomBytes(16).toString("base64url");
        const completedProject = await projectModels.update({
            id: project._id,
            client: projectForClientSync.client,
            status: "quoteCompleted",
            clientPreviewToken,
            updatedAt: Date.now()
        });
        const frontendUrl = (process.env.FRONTEND_URL || "").replace(/\/$/, "");
        const previewUrl = `${frontendUrl}/p/${clientPreviewToken}`;
        let notification = "لم يتم إرسال رسالة؛ لا يوجد مسوّق مرتبط بالمشروع.";
        {
            const marketer = await getProjectMarketer(completedProject);
            if (marketer?.phoneNumber) {
                try {
                    await sendProjectCompletedPreview(marketer.phoneNumber, completedProject, previewUrl);
                    await projectModels.update({ id: completedProject._id, marketingCompletionNotifiedAt: new Date(), marketingCompletionNotificationError: null });
                    notification = "تم إرسال رسالة الإنهاء إلى المسوّق.";
                } catch (error) {
                    await projectModels.update({ id: completedProject._id, marketingCompletionNotificationError: error.message });
                    notification = "اكتمل المشروع، لكن تعذر إرسال رسالة WhatsApp إلى المسوّق.";
                }
            }
        }
        return res.status(200).json({ status: "ok", message: "تم إتمام عرض السعر.", notification, previewUrl, project: completedProject });
    } catch (error) {
        next(error);
    }
};

const requestExecutionPdf = async (req, res, next) => {
    try {
        const project = await projectModels.select_one({ _id: req.params.id, isDeleted: false });
        if (!project) return res.status(404).json({ status: "error", message: "المشروع غير موجود." });
        if (!(await canManageExecutionRequest(req.user, project))) {
            return res.status(403).json({ status: "error", message: "لا تملك صلاحية إصدار أمر PDF تنفيذ لهذا المشروع." });
        }
        if (!QUOTE_COMPLETED_STATUSES.includes(project.status)) {
            return res.status(409).json({ status: "error", message: "يجب إتمام عرض السعر أولًا قبل إصدار أمر PDF التنفيذ." });
        }
        const panel = getPanelById(project, req.body?.panelId);
        if (!panel) return res.status(400).json({ status: "error", message: "اختر لوحة صحيحة لإصدار أمر التنفيذ." });

        panel.executionPdf = {
            ...(panel.executionPdf?.toObject?.() || panel.executionPdf || {}),
            status: "requested",
            requestedAt: new Date(),
            requestedBy: req.user._id,
            completedAt: null,
            completedBy: null,
            skippedAt: null,
            skippedBy: null
        };
        const updatedProject = await projectModels.update({ id: project._id, panels: project.panels, status: deriveExecutionStatus(project.panels), updatedAt: Date.now() });

        const shouldNotifyEngineer = ["marketing", "whatsapp"].includes(project.source);
        let notification = shouldNotifyEngineer
            ? "لم يتم إرسال إشعار؛ لا يوجد مهندس برقم WhatsApp مسجل."
            : "تم إصدار أمر PDF التنفيذ بدون إشعار WhatsApp لأن المشروع يدوي.";
        if (shouldNotifyEngineer) {
            const assignedEngineer = project.engineerId
                ? await userModels.select_one({ _id: project.engineerId, approved: true, isDeleted: false })
                : null;
            const engineers = assignedEngineer?.phoneNumber ? [assignedEngineer] : await getActiveEngineers();
            const managers = await getActiveUsersByRoles(["OwnerManager", "ProductionManager"]);
            const recipients = uniqueRecipients([...engineers, ...managers]);
            if (recipients.length) {
                const results = await Promise.allSettled(recipients.map((engineer) =>
                    sendExecutionPdfRequested(engineer.phoneNumber, updatedProject, panel.panelName)
                ));
                const sentCount = results.filter((result) => result.status === "fulfilled").length;
                notification = sentCount
                    ? `تم إرسال أمر PDF التنفيذ إلى ${sentCount} مستلم.`
                    : `تم إصدار أمر PDF التنفيذ، لكن تعذر إرسال WhatsApp: ${results[0]?.reason?.message || "خطأ غير معروف"}`;
            }
        }
        return res.status(200).json({ status: "ok", message: "تم إصدار أمر PDF التنفيذ.", notification, project: updatedProject });
    } catch (error) { next(error); }
};

const uploadExecutionPdfFile = async (req, res, next) => {
    try {
        const project = await projectModels.select_one({ _id: req.params.id, isDeleted: false });
        if (!project) return res.status(404).json({ status: "error", message: "المشروع غير موجود." });
        if (!canManageExecutionPdf(req.user, project)) return res.status(403).json({ status: "error", message: "رفع PDF التنفيذ متاح للمهندس أو Owner Manager فقط." });
        if (!["executionPdfRequested", "executionPdfReady", "executionOrdered"].includes(project.status)) return res.status(409).json({ status: "error", message: "لا يوجد أمر PDF تنفيذ مفتوح لهذا المشروع." });
        if (!req.file) return res.status(400).json({ status: "error", message: "اختر ملف PDF أو صورة أولًا." });
        const detectedMimeType = detectExecutionFileMimeType(req.file);
        if (!detectedMimeType) return res.status(400).json({ status: "error", message: "نوع الملف غير مدعوم. اختر PDF أو صورة." });
        const panel = getPanelById(project, req.body?.panelId);
        if (!panel || panel.executionPdf?.status !== "requested") return res.status(400).json({ status: "error", message: "هذه اللوحة لا يوجد لها أمر PDF تنفيذ مفتوح." });

        const stored = await uploadFile({ fileName: req.file.originalname, mimeType: detectedMimeType, buffer: req.file.buffer });
        panel.executionPdf.files.push({
            storageFileId: stored.id,
            fileName: stored.name || req.file.originalname,
            mimeType: stored.mimeType || detectedMimeType,
            fileSize: Number(stored.size || req.file.size || 0),
            uploadedAt: new Date(),
            uploadedBy: req.user._id
        });
        const updatedProject = await projectModels.update({ id: project._id, panels: project.panels, updatedAt: Date.now() });
        return res.status(201).json({ status: "ok", message: "تم رفع الملف.", project: updatedProject, file: panel.executionPdf.files.at(-1) });
    } catch (error) { next(error); }
};

const getExecutionPdfFile = async (req, res, next) => {
    try {
        const project = await projectModels.select_one({ _id: req.params.id, isDeleted: false });
        if (!project) return res.status(404).json({ status: "error", message: "المشروع غير موجود." });
        if (!canReadProject(req.user, project) && !(await marketerOwnsProject(req.user, project))) {
            return res.status(403).json({ status: "error", message: "لا تملك صلاحية عرض الملف." });
        }
        const panel = getPanelById(project, req.params.panelId);
        const file = panel?.executionPdf?.files?.id(req.params.fileId);
        if (!file) return res.status(404).json({ status: "error", message: "الملف غير موجود." });
        const stored = await downloadStoredFile(file.storageFileId);
        res.setHeader("Content-Type", file.mimeType || stored.mimeType);
        res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`);
        return res.send(stored.buffer);
    } catch (error) { next(error); }
};

const deleteExecutionPdfFile = async (req, res, next) => {
    try {
        const project = await projectModels.select_one({ _id: req.params.id, isDeleted: false });
        if (!project) return res.status(404).json({ status: "error", message: "المشروع غير موجود." });
        if (!canManageExecutionPdf(req.user, project)) return res.status(403).json({ status: "error", message: "حذف ملف PDF التنفيذ متاح للمهندس أو Owner Manager فقط." });
        const panel = getPanelById(project, req.params.panelId);
        const file = panel?.executionPdf?.files?.id(req.params.fileId);
        if (!file) return res.status(404).json({ status: "error", message: "الملف غير موجود." });
        if (file.storageFileId) await deleteStoredFile(file.storageFileId);
        file.deleteOne();
        const updatedProject = await projectModels.update({ id: project._id, panels: project.panels, updatedAt: Date.now() });
        return res.status(200).json({ status: "ok", message: "تم حذف الملف.", project: updatedProject });
    } catch (error) { next(error); }
};

const finishExecutionPdf = async (req, res, next) => {
    try {
        const project = await projectModels.select_one({ _id: req.params.id, isDeleted: false });
        if (!project) return res.status(404).json({ status: "error", message: "المشروع غير موجود." });
        if (!canManageExecutionPdf(req.user, project)) return res.status(403).json({ status: "error", message: "إتمام PDF التنفيذ متاح للمهندس أو Owner Manager فقط." });
        const panel = getPanelById(project, req.body?.panelId);
        if (!panel || panel.executionPdf?.status !== "requested") return res.status(409).json({ status: "error", message: "لا يوجد أمر PDF تنفيذ مفتوح لهذه اللوحة." });
        if (!(panel.executionPdf.files || []).length) return res.status(400).json({ status: "error", message: "ارفع ملف PDF أو صورة واحدة على الأقل قبل الإتمام." });
        panel.executionPdf.status = "ready";
        panel.executionPdf.completedAt = new Date();
        panel.executionPdf.completedBy = req.user._id;
        const updatedProject = await projectModels.update({ id: project._id, panels: project.panels, status: deriveExecutionStatus(project.panels), updatedAt: Date.now() });
        let notification = "";
        const marketer = await getProjectMarketer(updatedProject);
        if (marketer?.phoneNumber) {
            try {
                await sendExecutionPdfCompleted(marketer.phoneNumber, updatedProject, panel.panelName);
                notification = "تم إشعار المندوب باكتمال PDF التنفيذ.";
            } catch (error) { notification = `اكتمل PDF التنفيذ، لكن تعذر إرسال WhatsApp: ${error.message}`; }
        }
        return res.status(200).json({ status: "ok", message: "تم حفظ وإتمام PDF التنفيذ.", notification, project: updatedProject });
    } catch (error) { next(error); }
};

const skipExecutionPdf = async (req, res, next) => {
    try {
        const project = await projectModels.select_one({ _id: req.params.id, isDeleted: false });
        if (!project) return res.status(404).json({ status: "error", message: "المشروع غير موجود." });
        if (!canManageExecutionPdf(req.user, project)) return res.status(403).json({ status: "error", message: "تخطي PDF التنفيذ متاح للمهندس أو Owner Manager فقط." });
        const panel = getPanelById(project, req.body?.panelId);
        if (!panel || panel.executionPdf?.status !== "requested") return res.status(409).json({ status: "error", message: "لا يوجد أمر PDF تنفيذ مفتوح لهذه اللوحة." });
        panel.executionPdf.status = "skipped";
        panel.executionPdf.skippedAt = new Date();
        panel.executionPdf.skippedBy = req.user._id;
        panel.manufacturing = {
            ...(panel.manufacturing?.toObject?.() || panel.manufacturing || {}),
            status: "awaitingFiles",
            startedAt: new Date(),
            startedBy: req.user._id
        };
        const updatedProject = await projectModels.update({ id: project._id, panels: project.panels, status: "manufacturingFilesPending", updatedAt: Date.now() });
        return res.status(200).json({ status: "ok", message: "تم تخطي PDF التنفيذ والانتقال إلى أمر التنفيذ.", project: updatedProject });
    } catch (error) { next(error); }
};

const requestExecutionPdfChanges = async (req, res, next) => {
    try {
        const project = await projectModels.select_one({ _id: req.params.id, isDeleted: false });
        if (!project) return res.status(404).json({ status: "error", message: "المشروع غير موجود." });
        if (!(await canManageExecutionRequest(req.user, project))) return res.status(403).json({ status: "error", message: "لا تملك صلاحية طلب تعديل ملف التنفيذ." });
        const panel = getPanelById(project, req.body?.panelId);
        if (!panel || !["ready", "skipped"].includes(panel.executionPdf?.status)) return res.status(409).json({ status: "error", message: "ملف تنفيذ هذه اللوحة غير جاهز لطلب التعديل." });

        const oldFiles = [...(panel.executionPdf.files || [])];
        panel.executionPdf.status = "changesRequested";
        panel.executionPdf.changesRequestedAt = new Date();
        panel.executionPdf.changesRequestedBy = req.user._id;
        ensurePanelManufacturing(panel).status = "notStarted";
        await Promise.allSettled(oldFiles.map((file) => deleteStoredFile(file.storageFileId)));
        panel.executionPdf.files = [];
        const updatedProject = await projectModels.update({ id: project._id, panels: project.panels, status: "editingByEngineer", updatedAt: Date.now() });

        let notification = "تم فتح التسعير للتعديل مع الاحتفاظ بجميع البيانات الحالية.";
        if (["marketing", "whatsapp"].includes(project.source)) {
            try { notification = await notifyEngineersAboutSubmittedProject(updatedProject, true); }
            catch (error) { notification = `تم فتح التعديل، لكن تعذر إشعار المهندس: ${error.message}`; }
        }
        return res.status(200).json({ status: "ok", message: "تم فتح المشروع للتعديل دون مسح بيانات التسعير.", notification, project: updatedProject });
    } catch (error) { next(error); }
};

const confirmExecution = async (req, res, next) => {
    try {
        const project = await projectModels.select_one({ _id: req.params.id, isDeleted: false });
        if (!project) return res.status(404).json({ status: "error", message: "المشروع غير موجود." });
        if (!(await canManageExecutionRequest(req.user, project))) return res.status(403).json({ status: "error", message: "لا تملك صلاحية تأكيد التنفيذ." });
        const panel = getPanelById(project, req.body?.panelId);
        if (!panel || !["ready", "skipped"].includes(panel.executionPdf?.status)) return res.status(409).json({ status: "error", message: "يجب تجهيز PDF التنفيذ أو تخطيه أولًا." });

        panel.executionPdf.status = "confirmed";
        panel.executionPdf.confirmedAt = new Date();
        panel.executionPdf.confirmedBy = req.user._id;
        panel.manufacturing = {
            ...(panel.manufacturing?.toObject?.() || panel.manufacturing || {}),
            status: "awaitingFiles",
            startedAt: new Date(),
            startedBy: req.user._id
        };
        const updatedProject = await projectModels.update({ id: project._id, panels: project.panels, status: "manufacturingFilesPending", updatedAt: Date.now() });

        let notification = "تم تأكيد التنفيذ وفتح مرحلة ملفات التصنيع.";
        if (["marketing", "whatsapp"].includes(project.source)) {
            const assignedEngineer = project.engineerId ? await userModels.select_one({ _id: project.engineerId, approved: true, isDeleted: false }) : null;
            const engineers = assignedEngineer?.phoneNumber ? [assignedEngineer] : await getActiveEngineers();
            const results = await Promise.allSettled(engineers.map((engineer) => sendExecutionConfirmed(engineer.phoneNumber, updatedProject, panel.panelName)));
            if (!results.some((result) => result.status === "fulfilled")) notification = `تم التأكيد، لكن تعذر إشعار المهندس: ${results[0]?.reason?.message || "لا يوجد مهندس"}`;
        }
        return res.status(200).json({ status: "ok", message: "تم تأكيد التنفيذ.", notification, project: updatedProject });
    } catch (error) { next(error); }
};

const uploadManufacturingFile = async (req, res, next) => {
    try {
        const project = await projectModels.select_one({ _id: req.params.id, isDeleted: false });
        if (!project) return res.status(404).json({ status: "error", message: "المشروع غير موجود." });
        if (!canManageManufacturingFiles(req.user, project)) return res.status(403).json({ status: "error", message: "رفع ملفات التصنيع متاح للمهندس أو Owner Manager فقط." });
        const panel = getPanelById(project, req.body?.panelId);
        if (!panel || panel.manufacturing?.status !== "awaitingFiles") return res.status(409).json({ status: "error", message: "مرحلة رفع ملفات التصنيع غير مفتوحة لهذه اللوحة." });
        if (!req.file) return res.status(400).json({ status: "error", message: "اختر ملفًا أولًا." });
        const stored = await uploadFile({ fileName: req.file.originalname, mimeType: req.file.mimetype || "application/octet-stream", buffer: req.file.buffer });
        ensurePanelManufacturing(panel).files.push({
            storageFileId: stored.id,
            fileName: stored.name || req.file.originalname,
            mimeType: stored.mimeType || req.file.mimetype || "application/octet-stream",
            fileSize: Number(stored.size || req.file.size || 0),
            uploadedAt: new Date(),
            uploadedBy: req.user._id
        });
        const updatedProject = await projectModels.update({ id: project._id, panels: project.panels, updatedAt: Date.now() });
        return res.status(201).json({ status: "ok", message: "تم رفع ملف التصنيع.", project: updatedProject });
    } catch (error) { next(error); }
};

const startManufacturingFileUpload = async (req, res, next) => {
    try {
        const project = await projectModels.select_one({ _id: req.params.id, isDeleted: false });
        if (!project) return res.status(404).json({ status: "error", message: "المشروع غير موجود." });
        if (!canManageManufacturingFiles(req.user, project)) return res.status(403).json({ status: "error", message: "رفع ملفات التصنيع متاح للمهندس أو Owner Manager فقط." });
        const panel = getPanelById(project, req.body?.panelId);
        if (!panel || panel.manufacturing?.status !== "awaitingFiles") return res.status(409).json({ status: "error", message: "مرحلة رفع ملفات التصنيع غير مفتوحة لهذه اللوحة." });

        const fileName = String(req.body?.fileName || "").trim();
        const mimeType = String(req.body?.mimeType || "application/octet-stream").trim();
        const fileSize = Number(req.body?.fileSize);
        if (!fileName || !Number.isFinite(fileSize) || fileSize <= 0) {
            return res.status(400).json({ status: "error", message: "بيانات الملف غير مكتملة." });
        }
        if (fileSize > 250 * 1024 * 1024) {
            return res.status(413).json({ status: "error", message: "حجم الملف أكبر من الحد المسموح وهو 250MB." });
        }

        const uploadUrl = await createResumableUploadSession({ fileName, mimeType, fileSize });
        if (!process.env.TOKEN_KEY) throw new Error("TOKEN_KEY is required to secure file uploads.");
        const uploadToken = jwt.sign({
            purpose: "manufacturing-upload",
            uploadUrl,
            projectId: String(project._id),
            panelId: String(panel.panelId),
            fileName,
            mimeType,
            fileSize
        }, process.env.TOKEN_KEY, { expiresIn: "30m" });
        return res.status(201).json({ status: "ok", uploadToken, chunkSize: 3 * 1024 * 1024 });
    } catch (error) { next(error); }
};

const uploadManufacturingFileChunk = async (req, res, next) => {
    try {
        const project = await projectModels.select_one({ _id: req.params.id, isDeleted: false });
        if (!project) return res.status(404).json({ status: "error", message: "المشروع غير موجود." });
        if (!canManageManufacturingFiles(req.user, project)) return res.status(403).json({ status: "error", message: "رفع ملفات التصنيع متاح للمهندس أو Owner Manager فقط." });
        const panel = getPanelById(project, req.body?.panelId);
        if (!panel || panel.manufacturing?.status !== "awaitingFiles") return res.status(409).json({ status: "error", message: "مرحلة رفع ملفات التصنيع غير مفتوحة لهذه اللوحة." });
        if (!req.file?.buffer?.length) return res.status(400).json({ status: "error", message: "جزء الملف غير موجود." });
        if (!process.env.TOKEN_KEY) throw new Error("TOKEN_KEY is required to secure file uploads.");

        let upload;
        try { upload = jwt.verify(String(req.body?.uploadToken || ""), process.env.TOKEN_KEY); }
        catch { return res.status(401).json({ status: "error", message: "انتهت جلسة رفع الملف. اختر الملف مرة أخرى." }); }
        if (upload.purpose !== "manufacturing-upload"
            || upload.projectId !== String(project._id)
            || upload.panelId !== String(panel.panelId)) {
            return res.status(403).json({ status: "error", message: "جلسة رفع الملف لا تخص هذا المشروع." });
        }

        const start = Number(req.body?.start);
        const total = Number(req.body?.total);
        const end = start + req.file.buffer.length - 1;
        if (!Number.isInteger(start) || start < 0 || total !== Number(upload.fileSize) || end >= total) {
            return res.status(400).json({ status: "error", message: "ترتيب أجزاء الملف غير صحيح." });
        }

        const driveResponse = await fetch(upload.uploadUrl, {
            method: "PUT",
            redirect: "manual",
            headers: {
                "Content-Type": upload.mimeType || "application/octet-stream",
                "Content-Length": String(req.file.buffer.length),
                "Content-Range": `bytes ${start}-${end}/${total}`
            },
            body: req.file.buffer
        });
        if (driveResponse.status === 308) {
            return res.status(200).json({ status: "ok", complete: false, uploadedBytes: end + 1 });
        }

        const stored = await driveResponse.json().catch(() => ({}));
        if (!driveResponse.ok || !stored.id) {
            throw new Error(stored?.error?.message || `تعذر إرسال جزء الملف إلى Google Drive (${driveResponse.status}).`);
        }

        const manufacturing = ensurePanelManufacturing(panel);
        if (!manufacturing.files.some((file) => String(file.storageFileId) === String(stored.id))) {
            manufacturing.files.push({
                storageFileId: stored.id,
                fileName: stored.name || upload.fileName,
                mimeType: stored.mimeType || upload.mimeType || "application/octet-stream",
                fileSize: Number(stored.size || upload.fileSize || 0),
                uploadedAt: stored.createdTime ? new Date(stored.createdTime) : new Date(),
                uploadedBy: req.user._id
            });
        }
        const updatedProject = await projectModels.update({ id: project._id, panels: project.panels, updatedAt: Date.now() });
        return res.status(201).json({ status: "ok", complete: true, message: "تم رفع ملف التصنيع.", project: updatedProject });
    } catch (error) { next(error); }
};

const completeManufacturingFileUpload = async (req, res, next) => {
    try {
        const project = await projectModels.select_one({ _id: req.params.id, isDeleted: false });
        if (!project) return res.status(404).json({ status: "error", message: "المشروع غير موجود." });
        if (!canManageManufacturingFiles(req.user, project)) return res.status(403).json({ status: "error", message: "رفع ملفات التصنيع متاح للمهندس أو Owner Manager فقط." });
        const panel = getPanelById(project, req.body?.panelId);
        if (!panel || panel.manufacturing?.status !== "awaitingFiles") return res.status(409).json({ status: "error", message: "مرحلة رفع ملفات التصنيع غير مفتوحة لهذه اللوحة." });

        const storageFileId = String(req.body?.storageFileId || "").trim();
        if (!storageFileId) return res.status(400).json({ status: "error", message: "معرّف الملف المرفوع غير موجود." });
        const stored = await getVerifiedStoredFile(storageFileId);
        const manufacturing = ensurePanelManufacturing(panel);
        if (!manufacturing.files.some((file) => String(file.storageFileId) === storageFileId)) {
            manufacturing.files.push({
                storageFileId: stored.id,
                fileName: stored.name,
                mimeType: stored.mimeType || "application/octet-stream",
                fileSize: Number(stored.size || 0),
                uploadedAt: stored.createdTime ? new Date(stored.createdTime) : new Date(),
                uploadedBy: req.user._id
            });
        }
        const updatedProject = await projectModels.update({ id: project._id, panels: project.panels, updatedAt: Date.now() });
        return res.status(201).json({ status: "ok", message: "تم رفع ملف التصنيع.", project: updatedProject });
    } catch (error) { next(error); }
};

const getManufacturingFile = async (req, res, next) => {
    try {
        const project = await projectModels.select_one({ _id: req.params.id, isDeleted: false });
        if (!project) return res.status(404).json({ status: "error", message: "المشروع غير موجود." });
        if (!canDownloadManufacturingFiles(req.user, project)) return res.status(403).json({ status: "error", message: "لا تملك صلاحية تنزيل ملفات التصنيع." });
        const panel = getPanelById(project, req.params.panelId);
        const file = panel?.manufacturing?.files?.id(req.params.fileId);
        if (!file) return res.status(404).json({ status: "error", message: "الملف غير موجود." });
        const stored = await downloadStoredFile(file.storageFileId);
        res.setHeader("Content-Type", file.mimeType || stored.mimeType || "application/octet-stream");
        res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`);
        return res.send(stored.buffer);
    } catch (error) { next(error); }
};

const downloadManufacturingArchive = async (req, res, next) => {
    try {
        const project = await projectModels.select_one({ _id: req.params.id, isDeleted: false });
        if (!project) return res.status(404).json({ status: "error", message: "المشروع غير موجود." });
        if (!canDownloadManufacturingFiles(req.user, project)) return res.status(403).json({ status: "error", message: "لا تملك صلاحية تنزيل ملفات التصنيع." });
        const panel = getPanelById(project, req.params.panelId);
        const files = panel?.manufacturing?.files || [];
        if (!files.length) return res.status(404).json({ status: "error", message: "لا توجد ملفات تصنيع لتنزيلها." });
        const downloaded = await Promise.all(files.map(async (file, index) => {
            const stored = await downloadStoredFile(file.storageFileId);
            return { name: `${index + 1}-${file.fileName}`, buffer: stored.buffer, date: file.uploadedAt || new Date() };
        }));
        const archive = createZipArchive(downloaded);
        res.setHeader("Content-Type", "application/zip");
        res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(`${panel.panelName || "panel"}-files.zip`)}`);
        return res.send(archive);
    } catch (error) { next(error); }
};

const finishManufacturingFiles = async (req, res, next) => {
    try {
        const project = await projectModels.select_one({ _id: req.params.id, isDeleted: false });
        if (!project) return res.status(404).json({ status: "error", message: "المشروع غير موجود." });
        if (!canManageManufacturingFiles(req.user, project)) return res.status(403).json({ status: "error", message: "إتمام ملفات التصنيع متاح للمهندس أو Owner Manager فقط." });
        const panel = getPanelById(project, req.body?.panelId);
        if (!panel || panel.manufacturing?.status !== "awaitingFiles") return res.status(409).json({ status: "error", message: "مرحلة ملفات التصنيع غير مفتوحة لهذه اللوحة." });
        if (!(panel.manufacturing.files || []).length) return res.status(400).json({ status: "error", message: "ارفع ملف تصنيع واحدًا على الأقل." });
        panel.manufacturing.status = "filesReady";
        panel.manufacturing.notes = String(req.body?.notes || "").slice(0, 2000);
        panel.manufacturing.filesReadyAt = new Date();
        panel.manufacturing.filesReadyBy = req.user._id;
        panel.manufacturing.currentStage = "awaitingLaserDownload";
        panel.manufacturing.currentStageStartedAt = new Date();
        panel.manufacturing.lastReminderAt = null;
        const updatedProject = await projectModels.update({ id: project._id, panels: project.panels, status: "manufacturingFilesReady", updatedAt: Date.now() });
        const recipients = await getActiveUsersByRoles(["OwnerManager", "ProductionManager"]);
        const results = await Promise.allSettled(recipients.map((recipient) => sendPanelFilesReady(recipient.phoneNumber, updatedProject, panel.panelName)));
        const sentCount = results.filter((result) => result.status === "fulfilled").length;
        const notification = sentCount ? `تم إشعار ${sentCount} من مسؤولي التنفيذ.` : `تم حفظ الملفات، لكن تعذر إرسال الإشعار: ${results[0]?.reason?.message || "لا يوجد مستلم"}`;
        return res.status(200).json({ status: "ok", message: "ملفات تصنيع اللوحة جاهزة.", notification, project: updatedProject });
    } catch (error) { next(error); }
};

const markManufacturingDownloadedToLaser = async (req, res, next) => {
    try {
        const project = await projectModels.select_one({ _id: req.params.id, isDeleted: false });
        if (!project) return res.status(404).json({ status: "error", message: "المشروع غير موجود." });
        if (!isOwner(req.user) && !isProductionManager(req.user)) return res.status(403).json({ status: "error", message: "تأكيد تنزيل الملفات إلى الليزر متاح لمدير التنفيذ أو Owner Manager فقط." });
        const panel = getPanelById(project, req.body?.panelId);
        if (!panel || panel.manufacturing?.status !== "filesReady") return res.status(409).json({ status: "error", message: "ملفات هذه اللوحة ليست جاهزة للتنزيل إلى الليزر." });
        panel.manufacturing.status = "downloadedToLaser";
        panel.manufacturing.downloadedToLaserAt = new Date();
        panel.manufacturing.downloadedToLaserBy = req.user._id;
        panel.manufacturing.currentStage = "laser";
        panel.manufacturing.currentStageStartedAt = new Date();
        panel.manufacturing.lastReminderAt = null;
        const laserStageDueAt = new Date();
        laserStageDueAt.setHours(24, 0, 0, 0);
        panel.manufacturing.laserStageDueAt = laserStageDueAt;
        panel.manufacturing.lastReminderAt = null;
        const updatedProject = await projectModels.update({ id: project._id, panels: project.panels, status: "laserFilesDownloaded", updatedAt: Date.now() });
        return res.status(200).json({ status: "ok", message: "تم تسجيل تنزيل الملفات إلى الليزر.", project: updatedProject });
    } catch (error) { next(error); }
};

const recordManufacturingDelay = async (req, res, next) => {
    try {
        const project = await projectModels.select_one({ _id: req.params.id, isDeleted: false });
        if (!project) return res.status(404).json({ status: "error", message: "المشروع غير موجود." });
        if (!isOwner(req.user) && !isProductionManager(req.user)) return res.status(403).json({ status: "error", message: "تسجيل سبب التأخير متاح لمدير التنفيذ أو Owner Manager فقط." });
        const panel = getPanelById(project, req.body?.panelId);
        const allowedReasons = ["عدم تنزيل الملفات إلى الليزر", "أعطال الليزر", "نقص خامات", "أعطال التصنيع", "مراجعة العميل", "أخرى"];
        const reason = String(req.body?.reason || "");
        if (!panel || !allowedReasons.includes(reason)) return res.status(400).json({ status: "error", message: "اختر سبب تأخير صحيحًا." });
        panel.manufacturing.delayReason = reason;
        panel.manufacturing.delayRecordedAt = new Date();
        const updatedProject = await projectModels.update({ id: project._id, panels: project.panels, updatedAt: Date.now() });
        return res.status(200).json({ status: "ok", message: "تم تسجيل سبب التأخير.", project: updatedProject });
    } catch (error) { next(error); }
};

const updateManufacturingStage = async (req, res, next) => {
    try {
        const project = await projectModels.select_one({ _id: req.params.id, isDeleted: false });
        if (!project) return res.status(404).json({ status: "error", message: "المشروع غير موجود." });
        if (!isOwner(req.user) && !isProductionManager(req.user)) {
            return res.status(403).json({ status: "error", message: "متابعة مراحل الإنتاج متاحة لمدير التنفيذ أو Owner Manager فقط." });
        }

        const panel = getPanelById(project, req.body?.panelId);
        if (!panel || !["filesReady", "downloadedToLaser"].includes(panel.manufacturing?.status)) {
            return res.status(409).json({ status: "error", message: "ملفات تصنيع هذه اللوحة ليست جاهزة بعد." });
        }

        const manufacturing = ensurePanelManufacturing(panel);
        const stages = ensureProductionStages(manufacturing);
        const stageKey = String(req.body?.stageKey || "");
        const action = String(req.body?.action || "");
        const stageIndex = PRODUCTION_STAGE_KEYS.indexOf(stageKey);
        const stage = stages[stageIndex];
        if (!stage || stage.status !== "active" || manufacturing.currentStage !== stageKey) {
            return res.status(409).json({ status: "error", message: "يمكن تحديث مرحلة الإنتاج الحالية فقط." });
        }

        const notes = String(req.body?.notes || "").trim().slice(0, 2000);
        manufacturing.notes = notes;

        if (action === "completed") {
            const now = new Date();
            stage.status = "completed";
            stage.completedAt = now;
            stage.completedBy = req.user._id;
            stage.delayReason = "";
            stage.delayDetails = "";
            manufacturing.productionHistory.push({ stageKey, action: "completed", actorRole: req.user.role, actorName: req.user.name || "", createdAt: now });

            const nextStage = stages[stageIndex + 1];
            if (nextStage) {
                nextStage.status = "active";
                manufacturing.currentStage = nextStage.key;
                manufacturing.currentStageStartedAt = now;
            } else {
                manufacturing.currentStage = "completed";
            }
            if (stageKey === "awaitingLaserDownload") {
                manufacturing.status = "downloadedToLaser";
                manufacturing.downloadedToLaserAt = now;
                manufacturing.downloadedToLaserBy = req.user._id;
                const laserStageDueAt = new Date();
                laserStageDueAt.setHours(24, 0, 0, 0);
                manufacturing.laserStageDueAt = laserStageDueAt;
            }
        } else if (action === "delayed") {
            const reason = stageKey === "awaitingLaserDownload"
                ? "برجاء تنزيل اللوحة إلى الليزر بأقصى سرعة"
                : String(req.body?.reason || "").trim();
            const details = String(req.body?.details || "").trim().slice(0, 1000);
            const allowedReasons = PRODUCTION_STAGE_REASONS[stageKey] || [];
            if (stageKey !== "awaitingLaserDownload" && !allowedReasons.includes(reason)) {
                return res.status(400).json({ status: "error", message: "اختر سبب تأخير صحيحًا للمرحلة الحالية." });
            }
            if (reason === "أخرى" && !details) {
                return res.status(400).json({ status: "error", message: "اكتب سبب التأخير عند اختيار أخرى." });
            }
            const now = new Date();
            stage.delayReason = reason;
            stage.delayDetails = details;
            stage.delayedAt = now;
            stage.delayedBy = req.user._id;
            manufacturing.delayReason = reason === "أخرى" ? details : reason;
            manufacturing.delayRecordedAt = now;
            manufacturing.productionHistory.push({ stageKey, action: "delayed", reason, details, actorRole: req.user.role, actorName: req.user.name || "", createdAt: now });
        } else if (action === "notes") {
            manufacturing.productionHistory.push({ stageKey, action: "notes", details: notes, actorRole: req.user.role, actorName: req.user.name || "", createdAt: new Date() });
        } else {
            return res.status(400).json({ status: "error", message: "اختر تمت أو لم تتم أولًا." });
        }

        const allPanelsCompleted = (project.panels || []).every((item) => item.manufacturing?.currentStage === "completed");
        const nextProjectStatus = allPanelsCompleted
            ? "completed"
            : (project.panels || []).some((item) => item.manufacturing?.status === "downloadedToLaser")
                ? "laserFilesDownloaded"
                : "manufacturingFilesReady";
        const updatedProject = await projectModels.update({ id: project._id, panels: project.panels, status: nextProjectStatus, updatedAt: Date.now() });
        return res.status(200).json({ status: "ok", message: action === "completed" ? "تم الانتقال إلى المرحلة التالية." : "تم حفظ تحديث المرحلة.", project: updatedProject });
    } catch (error) { next(error); }
};

const deleteProject = async (req, res, next) => {
    try {
        const project = await projectModels.select_one({ _id: req.params.id, isDeleted: false });
        if (!project) return res.status(404).json({ status: "error", message: `project id ${req.params.id} not found` });
        const marketerCanDelete = isMarketer(req.user) && await marketerOwnsProject(req.user, project);
        if (isEngineer(req.user) && !project.engineerId) {
            return res.status(409).json({
                status: "error",
                code: "PROJECT_NOT_OPENED",
                message: "هذا المشروع لم يتم فتحه أو بدء العمل عليه بعد، لذلك لا يمكنك حذفه."
            });
        }
        if (!isOwner(req.user) && !marketerCanDelete && !sameId(project.engineerId, req.user._id)) return projectAlreadyClaimed(res, project);
        await projectModels.deleteOne(req.params.id);
        return res.status(200).json({ status: "ok", message: "project deleted" });
    } catch (error) {
        next(error);
    }
};

const restoreProject = async (req, res, next) => {
    try {
        if (!canUseRecycleBin(req.user)) return res.status(403).json({ status: "error", message: "لا تملك صلاحية الاستعادة." });
        const result = await projectModels.restore(req.params.id);
        if (!result) return res.status(404).json({ status: "error", message: `project id ${req.params.id} not found` });
        return res.status(200).json({ status: "ok", message: "project restored" });
    } catch (error) {
        next(error);
    }
};

const permanentlyDeleteProject = async (req, res, next) => {
    try {
        if (!canUseRecycleBin(req.user)) return res.status(403).json({ status: "error", message: "لا تملك صلاحية الحذف النهائي." });
        const project = await projectModels.select_one({ _id: req.params.id, isDeleted: true });
        if (!project) return res.status(404).json({ status: "error", message: "المشروع المحذوف غير موجود." });

        const messages = await whatsappMessages.findAllByProject(project._id);
        const executionFileIds = (project.panels || []).flatMap((panel) =>
            (panel.executionPdf?.files || []).map((file) => file.storageFileId).filter(Boolean)
        );
        const manufacturingFileIds = (project.panels || []).flatMap((panel) =>
            (panel.manufacturing?.files || []).map((file) => file.storageFileId).filter(Boolean)
        );
        const storedFileIds = [...new Set([
            ...messages.map((message) => message.media?.storageFileId).filter(Boolean),
            ...executionFileIds,
            ...manufacturingFileIds
        ])];
        await Promise.all(storedFileIds.map((fileId) => deleteStoredFile(fileId)));
        await whatsappMessages.deleteByProject(project._id);
        await projectModels.deleteForever(project._id);
        return res.status(200).json({ status: "ok", message: "تم حذف المشروع ومرفقاته نهائيًا." });
    } catch (error) {
        next(error);
    }
};

module.exports = { getProjects, getClientProjectPreview, getProject, getProjectMedia, getProjectMediaFile, uploadProjectMedia, deleteProjectMedia, getProjectMediaWhatsappLink, addProject, updateProject, startProjectEditing, submitMarketingProject, completeProject, requestExecutionPdf, uploadExecutionPdfFile, getExecutionPdfFile, deleteExecutionPdfFile, finishExecutionPdf, skipExecutionPdf, requestExecutionPdfChanges, confirmExecution, uploadManufacturingFile, startManufacturingFileUpload, uploadManufacturingFileChunk, completeManufacturingFileUpload, getManufacturingFile, downloadManufacturingArchive, finishManufacturingFiles, markManufacturingDownloadedToLaser, recordManufacturingDelay, updateManufacturingStage, deleteProject, getDeletedProjects, restoreProject, permanentlyDeleteProject };
