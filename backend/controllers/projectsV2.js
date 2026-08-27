const crypto = require("crypto");
const projects = require("../models/projects");
const panels = require("../models/panels");
const counters = require("../models/counters");
const users = require("../models/users");
const whatsappMessages = require("../models/whatsappMessages");
const clients = require("../models/clients");
const systemConfiguration = require("../models/systemConfiguration");
const { compareClientNames } = require("../utils/clientNameSimilarity");
const { sendNewProjectAssigned, sendProjectCompletedPreview } = require("../services/projectWhatsappNotifications");
const { uploadFile, downloadStoredFile, deleteStoredFile } = require("../services/googleDrive");

const sameId = (a, b) => String(a || "") === String(b || "");
const isOwner = (user) => user?.role === "OwnerManager";
const isEngineer = (user) => user?.role === "Engineer";
const isMarketer = (user) => user?.role === "Marketer";
const canSeeProject = (user, project) => isOwner(user) || (isMarketer(user) ? sameId(project.marketingId, user._id) : project.status !== "draft");
const hydrate = async (project, includeDeleted = false, viewer = null) => {
    const object = project.toObject ? project.toObject() : project;
    const projectPanels = await panels.find({ projectId: project._id, ...(includeDeleted ? {} : { isDeleted: false }) });
    const [marketer, engineerRows] = await Promise.all([
        object.marketingId ? users.select_one({ _id: object.marketingId, isDeleted: false }) : null,
        users.selectall({ _id: { $in: projectPanels.map((panel) => panel.engineerId).filter(Boolean) }, isDeleted: false })
    ]);
    const engineerMap = new Map(engineerRows.map((user) => [String(user._id), { _id: user._id, name: user.name }]));
    const visiblePanels = projectPanels.map((panel) => {
        const value = panel.toObject?.() || panel;
        const executionStatuses = ["executionPdfRequested", "executionPdfReady", "executionConfirmed", "manufacturingFilesPending", "manufacturingFilesReady", "pendingLaserDownload", "laser", "manufacturing", "painting", "assembly", "completed"];
        const executionStatus = value.status === "executionPdfRequested" ? "requested" : value.status === "executionPdfReady" ? "ready" : executionStatuses.includes(value.status) ? "confirmed" : "notRequested";
        const manufacturingStatus = value.status === "manufacturingFilesPending" ? "awaitingFiles" : ["manufacturingFilesReady", "pendingLaserDownload"].includes(value.status) ? "filesReady" : ["laser", "manufacturing", "painting", "assembly", "completed"].includes(value.status) ? "downloadedToLaser" : "notStarted";
        const productionStages = (value.manufacturing?.stages || []).map((stage) => ({ ...stage, key: stage.key === "pendingLaserDownload" ? "awaitingLaserDownload" : stage.key }));
        const marketerThickness = value.marketerData?.thickness || [];
        const pricingThickness = value.pricing?.thickness || [];
        const withEngineer = { ...value, ...(value.marketerData || {}), ...(value.pricing || {}), thickness: pricingThickness.length ? pricingThickness : marketerThickness, panelId: value._id, assignedEngineer: engineerMap.get(String(panel.engineerId)) || null, executionPdf: { ...(value.executionPdf || {}), status: executionStatus }, manufacturing: { ...(value.manufacturing || {}), status: manufacturingStatus, currentStage: productionStages.find((stage) => stage.status === "active")?.key || "", productionStages } };
        if (viewer?.role !== "ProductionManager") return withEngineer;
        const executionVisible = ["executionPdfRequested", "executionPdfReady", "executionConfirmed", "manufacturingFilesPending", "manufacturingFilesReady", "pendingLaserDownload", "laser", "manufacturing", "painting", "assembly", "completed"].includes(value.status);
        return executionVisible ? withEngineer : { _id: value._id, projectId: value.projectId, panelCode: value.panelCode, sequence: value.sequence, panelName: value.panelName, status: value.status, marketerData: value.marketerData, assignedEngineer: withEngineer.assignedEngineer, createdAt: value.createdAt, updatedAt: value.updatedAt };
    });
    return {
        ...object,
        marketingRepresentative: marketer ? { _id: marketer._id, name: marketer.name } : null,
        panels: visiblePanels,
        panelIds: projectPanels.map((panel) => panel._id), panelCount: projectPanels.length
    };
};
const nextProjectCode = async () => {
    const year = new Date().getFullYear();
    return `PRJ-${year}-${String(await counters.next(`project-${year}`)).padStart(6, "0")}`;
};
const buildSimilarityReview = async (client) => {
    const enteredName = String(client?.name || "").trim();
    if (!enteredName || client?.id) return { enteredName, resolved: Boolean(client?.id), resolution: client?.id ? "existing" : "", candidates: [] };
    const existing = await clients.select_for_name_review();
    const candidates = existing.map((item) => ({ item, ...compareClientNames(enteredName, item.name) })).filter((entry) => entry.isCandidate).sort((a, b) => b.similarity - a.similarity).slice(0, 5).map(({ item, similarity }) => ({ clientId: item._id, name: item.name, type: item.type, profitPercentage: item.profitPercentage, similarity }));
    return { enteredName, resolved: candidates.length === 0, resolution: candidates.length ? "" : "new", candidates };
};
const getProjects = async (req, res, next) => { try {
    const condition = { isDeleted: false };
    if (isMarketer(req.user)) condition.marketingId = req.user._id; else condition.status = { $ne: "draft" };
    let result = await projects.find(condition);
    if (req.user.role === "ProductionManager") {
        const executionPanels = await panels.find({ isDeleted: false, status: { $in: ["executionPdfRequested", "executionPdfReady", "executionConfirmed", "manufacturingFilesPending", "manufacturingFilesReady", "pendingLaserDownload", "laser", "manufacturing", "painting", "assembly", "completed"] } });
        const ids = new Set(executionPanels.map((panel) => String(panel.projectId)));
        result = result.filter((project) => ids.has(String(project._id)));
    }
    res.json(await Promise.all(result.map((project) => hydrate(project, false, req.user))));
} catch (error) { next(error); } };
const getProject = async (req, res, next) => { try {
    const project = await projects.findOne({ _id: req.params.id, isDeleted: false }).select("+clientPreviewToken");
    if (!project) return res.status(404).json({ status: "error", message: "المشروع غير موجود." });
    if (!canSeeProject(req.user, project)) return res.status(403).json({ status: "error", message: "لا تملك صلاحية عرض هذا المشروع." });
    res.json(await hydrate(project, false, req.user));
} catch (error) { next(error); } };
const createProject = async (req, res, next) => { try {
    if (!isMarketer(req.user) && !isOwner(req.user) && !isEngineer(req.user)) return res.status(403).json({ status: "error", message: "لا تملك صلاحية إنشاء مشروع." });
    const client = { id: req.body?.client?.id || null, name: String(req.body?.client?.name || "").trim(), type: req.body?.client?.type || "", profitPercentage: req.body?.client?.profitPercentage ?? null };
    if (isMarketer(req.user) && !client.name) return res.status(400).json({ status: "error", message: "اكتب اسم العميل أو اختر عميلًا موجودًا." });
    // The source is derived from the authenticated workflow, never from a
    // client-controlled request field. WhatsApp creates its own projects in
    // the webhook controller.
    const source = isMarketer(req.user) ? "marketing" : "manual";
    const project = await projects.create({ projectCode: await nextProjectCode(), marketingId: isMarketer(req.user) ? req.user._id : req.body?.marketingId || null, client, clientNameReview: await buildSimilarityReview(client), source, status: source === "manual" ? "inProgress" : "draft" });
    res.status(201).json({ status: "ok", project: await hydrate(project, false, req.user) });
} catch (error) { next(error); } };
const updateProject = async (req, res, next) => { try {
    const project = await projects.findOne({ _id: req.params.id, isDeleted: false });
    if (!project) return res.status(404).json({ status: "error", message: "المشروع غير موجود." });
    const marketerDraft = isMarketer(req.user) && sameId(project.marketingId, req.user._id) && project.status === "draft";
    const manualEngineer = isEngineer(req.user) && project.source === "manual";
    if (!marketerDraft && !isOwner(req.user) && !manualEngineer) return res.status(403).json({ status: "error", message: "المشروع غير مفتوح للتعديل." });
    const update = {};
    // The marketer chooses the client once in the creation dialog. Shared
    // pricing data is completed through setup, while manual projects remain
    // editable by their engineer.
    if ((isOwner(req.user) || manualEngineer) && req.body.client) update.client = { ...project.client.toObject(), ...req.body.client };
    if ((isOwner(req.user) || manualEngineer) && req.body.prices) update.prices = { ...project.prices.toObject(), ...req.body.prices };
    const saved = await projects.update({ _id: project._id }, update);
    res.json({ status: "ok", project: await hydrate(saved, false, req.user) });
} catch (error) { next(error); } };
const acquireSetupLock = async (req, res, next) => { try {
    if (!isEngineer(req.user) && !isOwner(req.user)) return res.status(403).json({ status: "error", message: "إعداد المشروع متاح للمهندس فقط." });
    const now = new Date(); const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
    const project = await projects.update({ _id: req.params.id, isDeleted: false, status: "created", $or: [{ "setupLock.userId": null }, { "setupLock.userId": req.user._id }, { "setupLock.expiresAt": { $lte: now } }] }, { setupLock: { userId: req.user._id, acquiredAt: now, expiresAt } });
    if (!project) return res.status(409).json({ status: "error", message: "مهندس آخر يكمل بيانات المشروع حاليًا." });
    res.json({ status: "ok", project: await hydrate(project, false, req.user), expiresAt });
} catch (error) { next(error); } };
const completeSetup = async (req, res, next) => { try {
    const project = await projects.findOne({ _id: req.params.id, isDeleted: false, status: "created" });
    if (!project) return res.status(409).json({ status: "error", message: "المشروع ليس في مرحلة استكمال البيانات." });
    if (!isOwner(req.user) && !sameId(project.setupLock?.userId, req.user._id)) return res.status(409).json({ status: "error", message: "يجب حجز إعداد المشروع أولًا." });
    const client = { ...project.client.toObject(), ...req.body.client }; const prices = { ...project.prices.toObject(), ...req.body.prices };
    const clientNameReview = { ...(project.clientNameReview || {}), ...(req.body.clientNameReview || {}) };
    if (!client.name || !client.type || !Number(client.profitPercentage) || !Number(prices.sheetPrice) || !Number(prices.paintPrice)) return res.status(400).json({ status: "error", message: "أكمل نوع العميل ونسبة الربح وسعر الصاج والدهان." });
    if (client.id) {
        const existingClient = await clients.select_one({ _id: client.id });
        if (!existingClient) return res.status(400).json({ status: "error", message: "سجل العميل المختار غير موجود." });
        client.name = existingClient.name; client.type = existingClient.type; client.profitPercentage = existingClient.profitPercentage;
        clientNameReview.resolved = true; clientNameReview.resolution = "existing";
    } else {
        if ((clientNameReview.candidates || []).length && (!clientNameReview.resolved || clientNameReview.resolution !== "new")) return res.status(409).json({ status: "error", message: "راجع الأسماء المتشابهة واختر سجلًا موجودًا أو أكد أنه عميل جديد." });
        const createdClient = await clients.add_one({ name: client.name.trim(), type: client.type, profitPercentage: Number(client.profitPercentage) });
        client.id = createdClient._id; clientNameReview.resolved = true; clientNameReview.resolution = "new";
    }
    const saved = await projects.update({ _id: project._id }, { client, clientNameReview, prices, status: "inProgress", setupLock: { userId: null, acquiredAt: null, expiresAt: null } });
    res.json({ status: "ok", project: await hydrate(saved, false, req.user) });
} catch (error) { next(error); } };
const submitProject = async (req, res, next) => { try {
    const project = await projects.findOne({ _id: req.params.id, isDeleted: false, status: "draft" });
    if (!project || (!isOwner(req.user) && !sameId(project.marketingId, req.user._id))) return res.status(403).json({ status: "error", message: "لا يمكنك إرسال هذا المشروع." });
    const list = await panels.find({ projectId: project._id, isDeleted: false });
    if (!list.length) return res.status(400).json({ status: "error", message: "أضف لوحة واحفظها قبل إرسال المشروع." });
    if (list.some((panel) => !panel.marketerSaved)) return res.status(400).json({ status: "error", message: "افتح كل لوحة واضغط حفظ اللوحة قبل إرسال المشروع للمهندسين." });
    await panels.updateMany({ projectId: project._id, isDeleted: false }, { $set: { status: "pendingPricing" }, $push: { statusHistory: { from: "draft", to: "pendingPricing", action: "projectSubmitted", actorId: req.user._id, actorName: req.user.name || "", actorRole: req.user.role } } });
    const saved = await projects.update({ _id: project._id }, { status: "created", marketingEditSession: { active: false, openedBy: null, openedAt: null } });
    const engineers = await users.selectall({ role: "Engineer", approved: true, isDeleted: false, phoneNumber: { $nin: [null, ""] } });
    const notificationProject = { ...(saved.toObject?.() || saved), panels: list };
    const notifications = await Promise.allSettled(engineers.map((engineer) => sendNewProjectAssigned(engineer.phoneNumber, notificationProject, req.user.name || "غير محدد")));
    const acceptedIds = notifications.filter((item) => item.status === "fulfilled").map((item) => item.value?.messages?.[0]?.id).filter(Boolean);
    if (acceptedIds.length) await new Promise((resolve) => setTimeout(resolve, 1800));
    const deliveryRows = await Promise.all(acceptedIds.map((id) => whatsappMessages.findByProviderMessageId(id)));
    const notificationFailed = deliveryRows.filter((row) => row?.status === "failed").length;
    const notified = notifications.filter((item) => item.status === "fulfilled").length - notificationFailed;
    const notificationMessage = !engineers.length
        ? "لا يوجد مهندس معتمد لديه رقم WhatsApp مسجل."
        : notificationFailed > 0
            ? `قبلت Meta القالب أولًا، ثم فشل تسليمه إلى ${notificationFailed} مهندس. راجع أهلية الرقم لاستقبال القوالب.`
        : notified === 0
            ? "تم إرسال المشروع للنظام، لكن رفض WhatsApp كل محاولات إرسال القالب للمهندسين."
            : notified < engineers.length
                ? `وصل القالب إلى ${notified} من أصل ${engineers.length} مهندس.`
                : `تم إرسال قالب المشروع إلى ${notified} مهندس.`;
    notifications.forEach((item) => { if (item.status === "rejected") console.error("New project WhatsApp template failed:", item.reason?.message || item.reason); });
    res.json({ status: "ok", message: "تم إرسال المشروع للمهندسين.", notified, notificationFailed, notificationMessage, project: await hydrate(saved, false, req.user) });
} catch (error) { next(error); } };
const regeneratePreview = async (req, res, next) => { try {
    const project = await projects.findOne({ _id: req.params.id, isDeleted: false });
    if (!project || (!isOwner(req.user) && !isEngineer(req.user))) return res.status(403).json({ status: "error", message: "لا تملك صلاحية استخراج عرض السعر." });
    const list = await panels.find({ projectId: project._id, isDeleted: false });
    const allowed = ["quoteCompleted", "executionPdfRequested", "executionPdfReady", "executionConfirmed", "manufacturingFilesPending", "manufacturingFilesReady", "pendingLaserDownload", "laser", "manufacturing", "painting", "assembly", "completed"];
    if (!list.length || list.some((panel) => !allowed.includes(panel.status))) return res.status(409).json({ status: "error", message: "يجب إتمام تسعير جميع اللوحات المطلوبة أولًا." });
    const token = crypto.randomBytes(32).toString("hex");
    const saved = await projects.update({ _id: project._id }, { clientPreviewToken: token, previewVersion: Number(project.previewVersion || 0) + 1, previewGeneratedAt: new Date(), status: "inProgress" });
    const previewUrl = `${String(process.env.FRONTEND_URL || "").replace(/\/$/, "")}/p/${token}`;
    let notificationMessage = "";
    let notified = false;
    if (["marketing", "whatsapp"].includes(project.source) && project.marketingId) {
        const marketer = await users.select_one({ _id: project.marketingId, approved: true, isDeleted: false });
        if (!marketer?.phoneNumber) notificationMessage = "تم حفظ المشروع وإصدار العرض المجمع، لكن المندوب لا يملك رقم WhatsApp مسجلًا.";
        else {
            try { await sendProjectCompletedPreview(marketer.phoneNumber, { ...(saved.toObject?.() || saved), panels: list }, previewUrl); notified = true; }
            catch (error) { notificationMessage = `تم حفظ المشروع وإصدار العرض المجمع، لكن تعذر إرسال WhatsApp: ${error.message}`; }
        }
    }
    res.json({ status: "ok", previewUrl, notified, notificationMessage, project: await hydrate(saved, false, req.user) });
} catch (error) { next(error); } };
const getPreview = async (req, res, next) => { try {
    const project = await projects.findOne({ clientPreviewToken: req.params.key, isDeleted: false }).select("+clientPreviewToken");
    if (!project) return res.status(404).json({ status: "error", message: "رابط المعاينة غير صالح." });
    const hydrated = await hydrate(project);
    const configuration = await systemConfiguration.get();
    res.json({
        project: { ...hydrated, panels: hydrated.panels.map((panel) => ({ ...panel, ...(panel.marketerData || {}), ...(panel.pricing || {}), panelId: panel._id })) },
        copperConfiguration: configuration?.copperConfiguration || {}
    });
} catch (error) { next(error); } };
const removeProject = async (req, res, next) => { try {
    const project = await projects.findOne({ _id: req.params.id, isDeleted: false });
    const marketerCanDelete = project && isMarketer(req.user) && sameId(project.marketingId, req.user._id) && project.status === "draft";
    if (!project || (!isOwner(req.user) && !marketerCanDelete)) return res.status(403).json({ status: "error", message: "لا يمكن حذف المشروع بعد إرساله؛ الحذف متاح للـOwner Manager." });
    const now = new Date(); await projects.update({ _id: project._id }, { isDeleted: true, deletedAt: now, deletedBy: req.user._id }); await panels.updateMany({ projectId: project._id }, { $set: { isDeleted: true, deletedAt: now, deletedBy: req.user._id } });
    res.json({ status: "ok", message: "تم نقل المشروع ولوحاته إلى سلة المحذوفات." });
} catch (error) { next(error); } };

const getDeletedProjects = async (req, res, next) => { try {
    if (!isOwner(req.user)) return res.status(403).json({ status: "error", message: "سلة المشاريع متاحة للـOwner Manager فقط." });
    const deleted = await projects.find({ isDeleted: true });
    res.json(await Promise.all(deleted.map((project) => hydrate(project, true, req.user))));
} catch (error) { next(error); } };

const restoreProject = async (req, res, next) => { try {
    if (!isOwner(req.user)) return res.status(403).json({ status: "error", message: "استعادة المشاريع متاحة للـOwner Manager فقط." });
    const project = await projects.update({ _id: req.params.id, isDeleted: true }, { isDeleted: false, deletedAt: null, deletedBy: null });
    if (!project) return res.status(404).json({ status: "error", message: "المشروع المحذوف غير موجود." });
    await panels.updateMany({ projectId: project._id }, { $set: { isDeleted: false, deletedAt: null, deletedBy: null } });
    res.json({ status: "ok", project: await hydrate(project, false, req.user) });
} catch (error) { next(error); } };

const permanentlyDeleteProject = async (req, res, next) => { try {
    if (!isOwner(req.user)) return res.status(403).json({ status: "error", message: "الحذف النهائي متاح للـOwner Manager فقط." });
    const project = await projects.findOne({ _id: req.params.id, isDeleted: true });
    if (!project) return res.status(404).json({ status: "error", message: "المشروع المحذوف غير موجود." });
    const projectPanels = await panels.find({ projectId: project._id });
    const storageIds = projectPanels.flatMap((panel) => [
        ...(panel.attachments || []), ...(panel.executionPdf?.files || []), ...(panel.manufacturing?.files || [])
    ]).map((file) => file.storageFileId).filter(Boolean);
    await Promise.allSettled(storageIds.map(deleteStoredFile));
    await panels.deleteMany({ projectId: project._id }); await projects.deleteOne({ _id: project._id });
    res.json({ status: "ok", message: "تم حذف المشروع ولوحاته وملفاته نهائيًا." });
} catch (error) { next(error); } };

const getProjectMedia = async (req, res, next) => { try {
    const project = await projects.findOne({ _id: req.params.id, isDeleted: false });
    if (!project || !canSeeProject(req.user, project)) return res.status(404).json({ status: "error", message: "المشروع غير موجود." });
    const projectPanels = await panels.find({ projectId: project._id, isDeleted: false });
    res.json(projectPanels.flatMap((panel) => (panel.attachments || []).map((file) => ({
        id: file._id, panelId: panel._id, type: String(file.mimeType || "").startsWith("audio/") ? "audio" : "image",
        mimeType: file.mimeType, fileName: file.fileName, fileSize: file.fileSize, createdAt: file.uploadedAt
    }))));
} catch (error) { next(error); } };

const findMedia = async (projectId, mediaId) => {
    const projectPanels = await panels.find({ projectId, isDeleted: false });
    for (const panel of projectPanels) { const file = panel.attachments?.id(mediaId); if (file) return { panel, file }; }
    return null;
};
const getProjectMediaFile = async (req, res, next) => { try {
    const project = await projects.findOne({ _id: req.params.id, isDeleted: false });
    if (!project || !canSeeProject(req.user, project)) return res.sendStatus(404);
    const media = await findMedia(project._id, req.params.mediaId); if (!media) return res.sendStatus(404);
    const stored = await downloadStoredFile(media.file.storageFileId); res.setHeader("Content-Type", media.file.mimeType || stored.mimeType); res.setHeader("Cache-Control", "private, max-age=300"); res.send(stored.buffer);
} catch (error) { next(error); } };
const uploadProjectMedia = async (req, res, next) => { try {
    const project = await projects.findOne({ _id: req.params.id, isDeleted: false }); const panel = await panels.findOne({ _id: req.body?.panelId, projectId: req.params.id, isDeleted: false });
    if (!project || !panel) return res.status(400).json({ status: "error", message: "اختر لوحة صحيحة لإضافة المرفقات." });
    const canEdit = isOwner(req.user) || (isMarketer(req.user) && sameId(project.marketingId, req.user._id) && (panel.status === "draft" || (panel.status === "editing" && project.marketingEditSession?.active)));
    if (!canEdit) return res.status(403).json({ status: "error", message: "إضافة المرفقات غير متاحة في حالة اللوحة الحالية." });
    if (!req.file || (!req.file.mimetype.startsWith("image/") && !req.file.mimetype.startsWith("audio/"))) return res.status(400).json({ status: "error", message: "اختر صورة أو تسجيلًا صوتيًا أولًا." });
    const stored = await uploadFile({ buffer: req.file.buffer, fileName: `panel-${panel.panelCode}-${Date.now()}-${crypto.randomUUID()}-${req.file.originalname}`, mimeType: req.file.mimetype });
    const saved = await panels.update({ _id: panel._id }, { $push: { attachments: { storageFileId: stored.id, fileName: stored.name || req.file.originalname, mimeType: req.file.mimetype, fileSize: Number(stored.size || req.file.size), uploadedAt: new Date(), uploadedBy: req.user._id } } });
    const file = saved.attachments[saved.attachments.length - 1]; res.status(201).json({ id: file._id, panelId: panel._id, type: req.file.mimetype.startsWith("audio/") ? "audio" : "image", fileName: file.fileName, mimeType: file.mimeType, fileSize: file.fileSize });
} catch (error) { next(error); } };
const deleteProjectMedia = async (req, res, next) => { try {
    const project = await projects.findOne({ _id: req.params.id, isDeleted: false }); const media = project && await findMedia(project._id, req.params.mediaId);
    if (!project || !media) return res.status(404).json({ status: "error", message: "المرفق غير موجود." });
    const canEdit = isOwner(req.user) || (isMarketer(req.user) && sameId(project.marketingId, req.user._id) && (media.panel.status === "draft" || (media.panel.status === "editing" && project.marketingEditSession?.active)));
    if (!canEdit) return res.status(403).json({ status: "error", message: "لا يمكنك حذف هذا المرفق الآن." });
    await deleteStoredFile(media.file.storageFileId); await panels.update({ _id: media.panel._id }, { $pull: { attachments: { _id: media.file._id } } }); res.json({ status: "ok" });
} catch (error) { next(error); } };
const getProjectMediaWhatsappLink = async (req, res, next) => { try {
    const project = await projects.findOne({ _id: req.params.id, isDeleted: false }); const panel = await panels.findOne({ _id: req.query.panelId, projectId: req.params.id, isDeleted: false });
    if (!project || !panel || !isMarketer(req.user) || !sameId(project.marketingId, req.user._id)) return res.status(404).json({ status: "error", message: "المشروع أو اللوحة غير موجودين." });
    const businessPhone = String(process.env.WHATSAPP_BUSINESS_NUMBER || "").replace(/\D/g, ""); if (!businessPhone) return res.status(503).json({ status: "error", message: "رقم WhatsApp الخاص بالشركة غير مضبوط بعد." });
    const text = `STARCO MEDIA #${project.projectCode} PANEL ${panel.sequence}`; res.json({ status: "ok", text, url: `https://wa.me/${businessPhone}?text=${encodeURIComponent(text)}` });
} catch (error) { next(error); } };

module.exports = { getProjects, getProject, createProject, updateProject, acquireSetupLock, completeSetup, submitProject, regeneratePreview, getPreview, removeProject, getDeletedProjects, restoreProject, permanentlyDeleteProject, getProjectMedia, getProjectMediaFile, uploadProjectMedia, deleteProjectMedia, getProjectMediaWhatsappLink };
