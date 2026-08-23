const projectModels = require("../models/projects");
const userModels = require("../models/users");
const syncClient = require("../services/syncClient");
const defaultProject = require("../utils/defaultProject");
const systemConfiguration = require("../models/systemConfiguration");
const { sendTextMessage } = require("../services/whatsappMeta");
const whatsappMessages = require("../models/whatsappMessages");
const { downloadStoredFile, deleteStoredFile, uploadFile } = require("../services/googleDrive");
const crypto = require("crypto");

const isOwner = (user) => user.role === "OwnerManager";
const isEngineer = (user) => user.role === "Engineer";
const isMarketer = (user) => user.role === "Marketer";
const canWorkOnProjects = (user) => isOwner(user) || isEngineer(user);
const canUseRecycleBin = (user) => ["OwnerManager", "Engineer", "Marketer", "MarketingManager"].includes(user.role);
const sameId = (first, second) => String(first || "") === String(second || "");

const editableProjectData = (body = {}) => {
    const data = {};
    if (body.client) data.client = body.client;
    if (body.prices) data.prices = body.prices;
    if (body.panels) data.panels = body.panels;
    return data;
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
                branches: String(incoming.copperDetails?.branches || "")
            }
        };
    });

    return {
        client: {
            ...(existingProject.client.toObject?.() || existingProject.client),
            name: String(body.client?.name || "").slice(0, 100),
            type: body.client?.type === "company" ? "company" : "person"
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
            condition.marketingId = req.user._id;
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
        const token = String(req.query.key || "");
        if (!token) return res.status(401).json({ status: "error", message: "رابط المعاينة غير مكتمل." });

        const project = await projectModels.findClientPreview(req.params.id, token);
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

        if (isOwner(req.user)) return res.status(200).json(project);
        if (req.user.role === "Marketer") {
            if (!sameId(project.marketingId, req.user._id)) {
                return res.status(403).json({ status: "error", message: "هذا المشروع لا يخصك." });
            }
            return res.status(200).json(project);
        }
        if (isEngineer(req.user)) {
            if (!sameId(project.engineerId, req.user._id)) return projectAlreadyClaimed(res, project);
            return res.status(200).json(project);
        }
        return res.status(403).json({ status: "error", message: "لا تملك صلاحية عرض المشروع." });
    } catch (error) {
        next(error);
    }
};

const canReadProject = (user, project) => isOwner(user)
    || (user.role === "Marketer" && sameId(project.marketingId, user._id))
    || (isEngineer(user) && sameId(project.engineerId, user._id));

const getProjectMedia = async (req, res, next) => {
    try {
        const project = await projectModels.select_one({ _id: req.params.id, isDeleted: false });
        if (!project) return res.status(404).json({ status: "error", message: "المشروع غير موجود." });
        if (!canReadProject(req.user, project)) return res.status(403).json({ status: "error", message: "لا تملك صلاحية عرض مرفقات المشروع." });
        const records = await whatsappMessages.findByProject(project._id);
        return res.status(200).json(records.map((record) => ({
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
        if (!canReadProject(req.user, project)) return res.sendStatus(403);
        const records = await whatsappMessages.findByProject(project._id);
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
            status: isMarketer(req.user) ? "pending" : "inProgress",
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
            if (!sameId(existingProject.marketingId, req.user._id)) {
                return res.status(403).json({ status: "error", message: "هذا المشروع لا يخصك." });
            }
            if (existingProject.status === "completed") {
                return res.status(409).json({ status: "error", message: "لا يمكن تعديل بيانات مشروع مكتمل." });
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
        if (existingProject.status !== "inProgress") {
            return res.status(409).json({ status: "error", message: "لا يمكن تعديل مشروع مكتمل." });
        }

        const updates = editableProjectData(req.body);
        const project = isOwner(req.user)
            ? await projectModels.update({ id: projectId, ...updates, updatedAt: Date.now() })
            : await projectModels.updateOwnedProject(projectId, req.user._id, updates);
        if (!project) return res.status(409).json({ status: "error", message: "تعذر حفظ المشروع. ربما تم تغيير حالته." });
        return res.status(200).json({ status: "ok", message: "project updated", project });
    } catch (error) {
        next(error);
    }
};

const uploadProjectMedia = async (req, res, next) => {
    try {
        const project = await projectModels.select_one({ _id: req.params.id, isDeleted: false });
        if (!project) return res.status(404).json({ status: "error", message: "المشروع غير موجود." });
        if (!isMarketer(req.user) || !sameId(project.marketingId, req.user._id)) {
            return res.status(403).json({ status: "error", message: "إضافة المرفقات متاحة للمندوب صاحب المشروع فقط." });
        }
        if (project.status === "completed") {
            return res.status(409).json({ status: "error", message: "لا يمكن إضافة مرفقات إلى مشروع مكتمل." });
        }
        if (!req.file) return res.status(400).json({ status: "error", message: "اختر صورة أو تسجيلًا صوتيًا أولًا." });
        const panel = (project.panels || []).find((item) => String(item.panelId) === String(req.body.panelId));
        if (!panel) return res.status(400).json({ status: "error", message: "اللوحة المختارة غير موجودة." });
        const type = req.file.mimetype.startsWith("image/") ? "image" : req.file.mimetype.startsWith("audio/") ? "audio" : null;
        if (!type) return res.status(400).json({ status: "error", message: "يسمح بالصور والتسجيلات الصوتية فقط." });

        const uploaded = await uploadFile({
            fileName: `frontend-${project._id}-${panel.panelId}-${Date.now()}-${req.file.originalname}`,
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

const completeProject = async (req, res, next) => {
    try {
        const project = await projectModels.select_one({ _id: req.params.id, isDeleted: false });
        if (!project) return res.status(404).json({ status: "error", message: "المشروع غير موجود." });
        if (!isOwner(req.user) && !sameId(project.engineerId, req.user._id)) {
            return projectAlreadyClaimed(res, project);
        }
        if (project.status === "completed") {
            return res.status(200).json({ status: "ok", message: "المشروع مكتمل بالفعل.", project });
        }

        const projectForClientSync = project.toObject();
        await syncClient(projectForClientSync);
        const clientPreviewToken = crypto.randomBytes(32).toString("hex");
        const completedProject = await projectModels.update({
            id: project._id,
            client: projectForClientSync.client,
            status: "completed",
            clientPreviewToken,
            updatedAt: Date.now()
        });
        let notification = "لم يتم إرسال رسالة؛ لا يوجد مسوّق مرتبط بالمشروع.";
        if (completedProject?.marketingId) {
            const marketer = await userModels.select_one({ _id: completedProject.marketingId, approved: true, isDeleted: false });
            if (marketer?.phoneNumber) {
                const frontendUrl = (process.env.FRONTEND_URL || "").replace(/\/$/, "");
                const previewUrl = `${frontendUrl}/client-project/${completedProject._id}?key=${clientPreviewToken}`;
                const body = `تم الانتهاء من مشروعك بنجاح.\nID المشروع: ${completedProject._id}\nالعميل: ${completedProject.client?.name || "غير محدد"}\nعدد اللوحات: ${(completedProject.panels || []).length}\nرابط معاينة PDF: ${previewUrl}`;
                try {
                    await sendTextMessage(marketer.phoneNumber, body);
                    await projectModels.update({ id: completedProject._id, marketingCompletionNotifiedAt: new Date(), marketingCompletionNotificationError: null });
                    notification = "تم إرسال رسالة الإنهاء إلى المسوّق.";
                } catch (error) {
                    await projectModels.update({ id: completedProject._id, marketingCompletionNotificationError: error.message });
                    notification = "اكتمل المشروع، لكن تعذر إرسال رسالة WhatsApp إلى المسوّق.";
                }
            }
        }
        return res.status(200).json({ status: "ok", message: "تم إتمام المشروع.", notification, project: completedProject });
    } catch (error) {
        next(error);
    }
};

const deleteProject = async (req, res, next) => {
    try {
        const project = await projectModels.select_one({ _id: req.params.id, isDeleted: false });
        if (!project) return res.status(404).json({ status: "error", message: `project id ${req.params.id} not found` });
        if (!isOwner(req.user) && !sameId(project.engineerId, req.user._id)) return projectAlreadyClaimed(res, project);
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
        const storedFileIds = [...new Set(messages.map((message) => message.media?.storageFileId).filter(Boolean))];
        await Promise.all(storedFileIds.map((fileId) => deleteStoredFile(fileId)));
        await whatsappMessages.deleteByProject(project._id);
        await projectModels.deleteForever(project._id);
        return res.status(200).json({ status: "ok", message: "تم حذف المشروع ومرفقاته نهائيًا." });
    } catch (error) {
        next(error);
    }
};

module.exports = { getProjects, getClientProjectPreview, getProject, getProjectMedia, getProjectMediaFile, uploadProjectMedia, addProject, updateProject, completeProject, deleteProject, getDeletedProjects, restoreProject, permanentlyDeleteProject };
