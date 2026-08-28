const panels = require("../models/panels");
const projects = require("../models/projects");
const { uploadFile, downloadStoredFile, deleteStoredFile } = require("../services/googleDrive");
const { sendExecutionPdfRequested, sendExecutionPdfCompleted, sendExecutionConfirmed, sendPanelFilesReady } = require("../services/projectWhatsappNotifications");
const users = require("../models/users");
const createZipArchive = require("../utils/createZipArchive");

const sameId = (a, b) => String(a || "") === String(b || "");
const isOwner = (user) => user?.role === "OwnerManager";
const isEngineer = (user) => user?.role === "Engineer";
const isMarketer = (user) => user?.role === "Marketer";
const executionStatuses = ["executionPdfRequested", "executionPdfReady", "executionConfirmed", "manufacturingFilesPending", "manufacturingFilesReady", "pendingLaserDownload", "laser", "manufacturing", "painting", "assembly", "completed"];
const stages = ["pendingLaserDownload", "laser", "manufacturing", "painting", "assembly"];
const executionPdfPurposes = ["page2", "page3", "page4", "gallery", "generatedPdf"];
const history = (req, from, to, action, note = "") => ({ from, to, action, note, actorId: req.user._id, actorName: req.user.name || "", actorRole: req.user.role, createdAt: new Date() });
const loadProject = (projectId) => projects.findOne({ _id: projectId, isDeleted: false });
const loadPanel = (projectId, panelId) => panels.findOne({ _id: panelId, projectId, isDeleted: false });
const nextPanelCode = (project, sequence) => `${project.projectCode}-P${String(sequence).padStart(2, "0")}`;
const marketerOwns = (req, project, panel) => isMarketer(req.user) && sameId(project.marketingId, req.user._id) && sameId(panel.marketingId, req.user._id);
const normalizePanelPayload = (body = {}) => ({
    panelName: body.panelName,
    marketerData: {
        ...(body.marketerData || {}),
        panelType: body.marketerData?.panelType ?? body.panelType,
        panelTypeKey: body.marketerData?.panelTypeKey ?? body.panelTypeKey,
        thickness: body.marketerData?.thickness ?? body.thickness,
        hasCopper: body.marketerData?.hasCopper ?? body.hasCopper,
        controlInstallation: body.marketerData?.controlInstallation ?? body.controlInstallation,
        additionalDetails: body.marketerData?.additionalDetails ?? body.additionalDetails,
        copperDetails: body.marketerData?.copperDetails ?? body.copperDetails
    },
    pricing: {
        ...(body.pricing || {}),
        dimensions: body.pricing?.dimensions ?? body.dimensions,
        parts: body.pricing?.parts ?? body.parts,
        prices: body.pricing?.prices ?? body.prices,
        copper: body.pricing?.copper ?? body.copper,
        thickness: body.pricing?.thickness ?? body.thickness
    }
});
const publicPanel = (panel) => {
    const object = panel.toObject ? panel.toObject() : panel;
    const marketerThickness = object.marketerData?.thickness || [];
    const pricingThickness = object.pricing?.thickness || [];
    const executionStatus = object.status === "executionPdfRequested" ? "requested" : object.status === "executionPdfReady" ? "ready" : executionStatuses.includes(object.status) ? "confirmed" : "notRequested";
    const manufacturingStatus = object.status === "manufacturingFilesPending" ? "awaitingFiles" : ["manufacturingFilesReady", "pendingLaserDownload"].includes(object.status) ? "filesReady" : ["laser", "manufacturing", "painting", "assembly", "completed"].includes(object.status) ? "downloadedToLaser" : "notStarted";
    const stageRows = (object.manufacturing?.stages || []).map((stage) => ({ ...stage, key: stage.key === "pendingLaserDownload" ? "awaitingLaserDownload" : stage.key }));
    const activeStage = stageRows.find((stage) => stage.status === "active");
    const pricingCopper = object.pricing?.copper || {};
    const marketerCopper = object.marketerData?.copperDetails || {};
    const copper = Object.keys(pricingCopper).length ? pricingCopper : {
        enabled: Boolean(object.marketerData?.hasCopper),
        main: { optionKey: marketerCopper.mainKey || "" },
        branches: (Array.isArray(marketerCopper.branchGroups) ? marketerCopper.branchGroups : []).map((group, index) => ({ branchId: group.id || `marketer-branch-${index}`, branchGroupId: group.id || `marketer-branch-${index}`, optionKey: group.optionKey || "", direction: "one", barCount: 1, quantity: Math.max(1, Number(group.count || group.quantity) || 1) }))
    };
    return { ...object, ...object.marketerData, ...object.pricing, copper, thickness: pricingThickness.length ? pricingThickness : marketerThickness, panelId: object._id, executionPdf: { ...(object.executionPdf || {}), status: executionStatus }, manufacturing: { ...(object.manufacturing || {}), status: manufacturingStatus, currentStage: activeStage?.key || "", productionStages: stageRows } };
};
const refreshProjectCompletion = async (projectId) => {
    const list = await panels.find({ projectId, isDeleted: false });
    const completed = list.length > 0 && list.every((panel) => panel.status === "completed");
    return projects.update({ _id: projectId }, { status: completed ? "completed" : "inProgress" });
};
const notifyRoles = async (roles, sender) => {
    const recipients = await users.selectall({ role: { $in: roles }, approved: true, isDeleted: false, phoneNumber: { $ne: null } });
    return Promise.allSettled(recipients.map(sender));
};
const notifyPanelPeople = async (panel, roles, sender) => {
    const conditions = [];
    if (panel.engineerId) conditions.push({ _id: panel.engineerId });
    if (roles.length) conditions.push({ role: { $in: roles } });
    if (!conditions.length) return [];
    const recipients = await users.selectall({ $or: conditions, approved: true, isDeleted: false, phoneNumber: { $ne: null } });
    const unique = [...new Map(recipients.map((recipient) => [String(recipient._id), recipient])).values()];
    return Promise.allSettled(unique.map(sender));
};
const notifyProjectMarketer = async (project, roles, sender) => {
    const conditions = [];
    if (project.marketingId) conditions.push({ _id: project.marketingId });
    if (roles.length) conditions.push({ role: { $in: roles } });
    if (!conditions.length) return [];
    const recipients = await users.selectall({ $or: conditions, approved: true, isDeleted: false, phoneNumber: { $ne: null } });
    const unique = [...new Map(recipients.map((recipient) => [String(recipient._id), recipient])).values()];
    return Promise.allSettled(unique.map(sender));
};
const projectResponse = async (project) => {
    const freshProject = await projects.findOne({ _id: project._id, isDeleted: false }).select("+clientPreviewToken");
    const object = freshProject?.toObject?.() || freshProject || project;
    return { ...object, quotePreviewUrl: object.clientPreviewToken ? `${String(process.env.FRONTEND_URL || "").replace(/\/$/, "")}/p/${object.clientPreviewToken}` : "", panels: (await panels.find({ projectId: project._id, isDeleted: false })).map(publicPanel) };
};

const listAllPanels = async (req, res, next) => { try {
    const condition = { isDeleted: false };
    if (isMarketer(req.user)) condition.marketingId = req.user._id;
    if (isEngineer(req.user)) condition.$or = [{ status: "pendingPricing" }, { engineerId: req.user._id }];
    if (req.user.role === "ProductionManager") condition.status = { $in: executionStatuses };
    let list = await panels.find(condition);
    const projectIds = [...new Set(list.map((panel) => String(panel.projectId)))];
    const projectRows = await projects.find({ _id: { $in: projectIds }, isDeleted: false });
    const projectMap = new Map(projectRows.map((project) => [String(project._id), project]));
    list = list.filter((panel) => {
        const project = projectMap.get(String(panel.projectId));
        if (!project) return false;
        return req.user.role !== "MarketingManager" || ["marketing", "whatsapp"].includes(project.source);
    });
    res.json(list.map((panel) => {
        const project = projectMap.get(String(panel.projectId));
        return { ...publicPanel(panel), project: { _id: project._id, projectCode: project.projectCode, client: project.client, status: project.status, source: project.source } };
    }));
} catch (error) { next(error); } };

const listPanels = async (req, res, next) => { try {
    const project = await loadProject(req.params.projectId); if (!project) return res.status(404).json({ status: "error", message: "المشروع غير موجود." });
    if (isMarketer(req.user) && !sameId(project.marketingId, req.user._id)) return res.status(403).json({ status: "error", message: "لا تملك صلاحية عرض لوحات هذا المشروع." });
    const condition = { projectId: project._id, isDeleted: false };
    if (req.user.role === "ProductionManager") condition.status = { $in: executionStatuses };
    res.json((await panels.find(condition)).map(publicPanel));
} catch (error) { next(error); } };
const getPanel = async (req, res, next) => { try {
    const project = await loadProject(req.params.projectId); const panel = await loadPanel(req.params.projectId, req.params.panelId); if (!project || !panel) return res.status(404).json({ status: "error", message: "اللوحة غير موجودة." });
    if (isMarketer(req.user) && !sameId(project.marketingId, req.user._id)) return res.status(403).json({ status: "error", message: "لا تملك صلاحية عرض هذه اللوحة." });
    if (req.user.role === "ProductionManager" && !executionStatuses.includes(panel.status)) return res.status(403).json({ status: "error", message: "اللوحة لم تصل إلى مرحلة التنفيذ بعد." });
    res.json(publicPanel(panel));
} catch (error) { next(error); } };
const createPanel = async (req, res, next) => { try {
    const project = await loadProject(req.params.projectId); if (!project) return res.status(404).json({ status: "error", message: "المشروع غير موجود." });
    const manualEngineer = (isEngineer(req.user) || isOwner(req.user)) && project.source === "manual";
    const canCreate = isOwner(req.user) || manualEngineer || (isMarketer(req.user) && sameId(project.marketingId, req.user._id) && (project.status === "draft" || project.marketingEditSession?.active));
    if (!canCreate) return res.status(403).json({ status: "error", message: "إضافة لوحة جديدة تتطلب فتح تعديل المشروع للمندوب." });
    const latest = await panels.model().findOne({ projectId: project._id }).sort({ sequence: -1 }); const sequence = Number(latest?.sequence || 0) + 1;
    const body = normalizePanelPayload(req.body);
    const panel = await panels.create({ projectId: project._id, panelCode: nextPanelCode(project, sequence), sequence, source: project.source, status: manualEngineer ? "pricing" : "draft", panelName: body.panelName || `لوحة ${sequence}`, marketingId: project.marketingId, engineerId: manualEngineer ? req.user._id : null, assignedAt: manualEngineer ? new Date() : null, marketerData: body.marketerData });
    await projects.update({ _id: project._id }, { $addToSet: { panelIds: panel._id }, ...(project.previewGeneratedAt ? { previewGeneratedAt: null } : {}), ...(project.status === "completed" ? { status: "inProgress" } : {}) });
    res.status(201).json({ status: "ok", panel: publicPanel(panel) });
} catch (error) { next(error); } };
const updatePanel = async (req, res, next) => { try {
    const project = await loadProject(req.params.projectId); const panel = await loadPanel(req.params.projectId, req.params.panelId);
    if (!project || !panel) return res.status(404).json({ status: "error", message: "اللوحة غير موجودة." });
    const payload = normalizePanelPayload(req.body); const update = {};
    const marketerCanEdit = (marketerOwns(req, project, panel) && (panel.status === "draft" || (panel.status === "editing" && project.marketingEditSession?.active))) || (isOwner(req.user) && panel.status === "draft");
    const engineerCanEdit = (isOwner(req.user) || (isEngineer(req.user) && sameId(panel.engineerId, req.user._id))) && ["pricing", "editing"].includes(panel.status);
    if (!marketerCanEdit && !engineerCanEdit) return res.status(409).json({ status: "error", message: "هذه اللوحة ليست مفتوحة لك للتعديل الآن." });
    if (payload.panelName != null) update.panelName = String(payload.panelName).trim();
    if (marketerCanEdit) { update.marketerData = { ...panel.marketerData.toObject(), ...payload.marketerData }; if (req.body?.marketerSaved === true) update.marketerSaved = true; }
    if (engineerCanEdit) update.pricing = { ...panel.pricing.toObject(), ...payload.pricing };
    const saved = await panels.update({ _id: panel._id }, update); res.json({ status: "ok", panel: publicPanel(saved) });
} catch (error) { next(error); } };
const claimPanel = async (req, res, next) => { try {
    if (!isEngineer(req.user) && !isOwner(req.user)) return res.status(403).json({ status: "error", message: "حجز اللوحات متاح للمهندسين." });
    const project = await loadProject(req.params.projectId);
    if (!project) return res.status(404).json({ status: "error", message: "المشروع غير موجود." });
    if (project.status !== "inProgress") return res.status(409).json({ status: "error", message: "يجب استكمال بيانات المشروع المشتركة أولًا." });
    const now = new Date(); const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
    const panel = await panels.update({ _id: req.params.panelId, projectId: req.params.projectId, isDeleted: false, status: "pendingPricing", engineerId: null }, { engineerId: req.user._id, assignedAt: now, status: "pricing", lock: { userId: req.user._id, role: req.user.role, acquiredAt: now, expiresAt }, $push: { statusHistory: history(req, "pendingPricing", "pricing", "claimed") } });
    if (!panel) return res.status(409).json({ status: "error", message: "تم حجز هذه اللوحة بواسطة مهندس آخر." });
    res.json({ status: "ok", panel: publicPanel(panel) });
} catch (error) { next(error); } };
const completeQuote = async (req, res, next) => { try {
    const panel = await loadPanel(req.params.projectId, req.params.panelId); if (!panel) return res.status(404).json({ status: "error", message: "اللوحة غير موجودة." });
    if (!isOwner(req.user) && (!isEngineer(req.user) || !sameId(panel.engineerId, req.user._id))) return res.status(403).json({ status: "error", message: "إتمام التسعير متاح للمهندس المسؤول فقط." });
    if (!["pricing", "editing"].includes(panel.status)) return res.status(409).json({ status: "error", message: "اللوحة ليست في مرحلة التسعير." });
    if (!Array.isArray(panel.pricing?.thickness) || panel.pricing.thickness.length === 0) return res.status(400).json({ status: "error", message: "يرجى اختيار سمك الصاج قبل إتمام تسعير اللوحة." });
    const saved = await panels.update({ _id: panel._id }, { status: "quoteCompleted", quoteCompletedAt: new Date(), lock: { userId: null, role: "", acquiredAt: null, expiresAt: null }, $push: { statusHistory: history(req, panel.status, "quoteCompleted", "quoteCompleted") } });
    await projects.update({ _id: panel.projectId }, { status: "inProgress", previewGeneratedAt: null }); res.json({ status: "ok", panel: publicPanel(saved) });
} catch (error) { next(error); } };
const openEditing = async (req, res, next) => { try {
    const project = await loadProject(req.params.projectId); const panel = await loadPanel(req.params.projectId, req.params.panelId); if (!project || !panel) return res.status(404).json({ status: "error", message: "اللوحة غير موجودة." });
    if (!isOwner(req.user) && !marketerOwns(req, project, panel)) return res.status(403).json({ status: "error", message: "لا تملك صلاحية تعديل اللوحة." });
    if (panel.lock?.userId && panel.lock.expiresAt > new Date() && !sameId(panel.lock.userId, req.user._id) && !isOwner(req.user)) return res.status(409).json({ status: "error", message: "المهندس يعمل على هذه اللوحة الآن؛ أرسل طلب تعديل أو انتظر انتهاء الحجز." });
    const saved = await panels.update({ _id: panel._id }, { status: "editing", $push: { statusHistory: history(req, panel.status, "editing", "editingOpened") } });
    await projects.update({ _id: project._id }, { status: "inProgress", marketingEditSession: { active: true, openedBy: req.user._id, openedAt: new Date() }, previewGeneratedAt: null }); res.json({ status: "ok", panel: publicPanel(saved) });
} catch (error) { next(error); } };
const submitEdits = async (req, res, next) => { try {
    const project = await loadProject(req.params.projectId); if (!project || (!isOwner(req.user) && !sameId(project.marketingEditSession?.openedBy, req.user._id))) return res.status(403).json({ status: "error", message: "لا توجد جلسة تعديل مفتوحة." });
    await panels.updateMany({ projectId: project._id, isDeleted: false, status: { $in: ["draft", "editing"] } }, { $set: { status: "pendingPricing", engineerId: null, assignedAt: null, lock: { userId: null, role: "", acquiredAt: null, expiresAt: null } } });
    await projects.update({ _id: project._id }, { status: "inProgress", marketingEditSession: { active: false, openedBy: null, openedAt: null } }); res.json({ status: "ok", message: "تم إرسال اللوحات الجديدة والمعدلة للتسعير." });
} catch (error) { next(error); } };
const deletePanel = async (req, res, next) => { try {
    const project = await loadProject(req.params.projectId); const panel = await loadPanel(req.params.projectId, req.params.panelId); if (!project || !panel) return res.status(404).json({ status: "error", message: "اللوحة غير موجودة." });
    const marketerCanDelete = marketerOwns(req, project, panel) && panel.status === "draft";
    if (!isOwner(req.user) && !marketerCanDelete) return res.status(403).json({ status: "error", message: "بعد إرسال اللوحة لا يمكن حذفها إلا بواسطة Owner Manager." });
    await panels.update({ _id: panel._id }, { isDeleted: true, deletedAt: new Date(), deletedBy: req.user._id }); await projects.update({ _id: project._id }, { $pull: { panelIds: panel._id }, previewGeneratedAt: null }); res.json({ status: "ok", message: "تم نقل اللوحة إلى سلة المحذوفات." });
} catch (error) { next(error); } };
const transition = async (req, res, next, { from, to, roles, extra = {}, notify, requireMarketingOwnership = false, requireEngineerAssignment = false }) => { try {
    if (!roles.includes(req.user.role)) return res.status(403).json({ status: "error", message: "لا تملك صلاحية تنفيذ هذه الخطوة." });
    const panel = await loadPanel(req.params.projectId, req.params.panelId); const project = await loadProject(req.params.projectId); if (!panel || !project) return res.status(404).json({ status: "error", message: "اللوحة غير موجودة." });
    if (requireMarketingOwnership && isMarketer(req.user) && !marketerOwns(req, project, panel)) return res.status(403).json({ status: "error", message: "لا تملك صلاحية تنفيذ هذه الخطوة على اللوحة." });
    if (requireEngineerAssignment && isEngineer(req.user) && !sameId(panel.engineerId, req.user._id)) return res.status(403).json({ status: "error", message: "هذه الخطوة متاحة للمهندس المسؤول عن اللوحة فقط." });
    if (!from.includes(panel.status)) return res.status(409).json({ status: "error", message: "لا يمكن تنفيذ هذه الخطوة في حالة اللوحة الحالية." });
    const saved = await panels.update({ _id: panel._id }, { status: to, ...extra, $push: { statusHistory: history(req, panel.status, to, to) } });
    if (notify) await notify(project, saved); if (to === "completed") await refreshProjectCompletion(project._id); else await projects.update({ _id: project._id }, { status: "inProgress" });
    res.json({ status: "ok", panel: publicPanel(saved), project: await projectResponse(project) });
} catch (error) { next(error); } };
const requestExecutionPdf = async (req, res, next) => { try {
    const panel = await loadPanel(req.params.projectId, req.params.panelId);
    const selectedThickness = Number(req.body?.steelThickness);
    const quotedThicknesses = (panel?.pricing?.thickness || panel?.marketerData?.thickness || []).map(Number);
    if (!panel) return res.status(404).json({ status: "error", message: "اللوحة غير موجودة." });
    if (!Number.isFinite(selectedThickness) || !quotedThicknesses.some((value) => Math.abs(value - selectedThickness) < 0.0001)) {
        return res.status(400).json({ status: "error", message: "اختر سمك الصاج الذي أكده العميل من الخيارات الموجودة في عرض السعر." });
    }
    return transition(req, res, next, { from: ["quoteCompleted"], to: "executionPdfRequested", roles: ["Marketer", "MarketingManager", "OwnerManager"], requireMarketingOwnership: true, extra: { "executionPdf.steelThickness": selectedThickness, "executionPdf.requestedAt": new Date(), "executionPdf.requestedBy": req.user._id }, notify: (project, savedPanel) => notifyPanelPeople(savedPanel, ["OwnerManager", "ProductionManager"], (recipient) => sendExecutionPdfRequested(recipient.phoneNumber, project, savedPanel.panelName)) });
} catch (error) { next(error); } };

const saveExecutionPdfDesign = async (req, res, next) => { try {
    const panel = await loadPanel(req.params.projectId, req.params.panelId);
    if (!panel) return res.status(404).json({ status: "error", message: "اللوحة غير موجودة." });
    if (!isOwner(req.user) && (!isEngineer(req.user) || !sameId(panel.engineerId, req.user._id))) return res.status(403).json({ status: "error", message: "تعديل PDF التنفيذ متاح للمهندس المسؤول فقط." });
    if (panel.status !== "executionPdfRequested") return res.status(409).json({ status: "error", message: "PDF التنفيذ ليس مفتوحًا للتجهيز الآن." });
    const assignments = req.body?.assignments && typeof req.body.assignments === "object" ? req.body.assignments : {};
    const transforms = req.body?.transforms && typeof req.body.transforms === "object" ? req.body.transforms : {};
    const design = {
        panelSize: String(req.body?.panelSize || "").slice(0, 100),
        steelThickness: String(req.body?.steelThickness || panel.executionPdf?.steelThickness || "").slice(0, 50),
        paint: String(req.body?.paint || "Electrostatic paint").slice(0, 150),
        page3Text: String(req.body?.page3Text || "").slice(0, 4000),
        page4Lines: (Array.isArray(req.body?.page4Lines) ? req.body.page4Lines : []).slice(0, 12).map((line) => String(line || "").slice(0, 180)).filter(Boolean),
        assignments: {
            page2: String(assignments.page2 || ""), page3: String(assignments.page3 || ""), page4: String(assignments.page4 || ""),
            gallery: (Array.isArray(assignments.gallery) ? assignments.gallery : []).slice(0, 3).map(String)
        },
        transforms
    };
    const saved = await panels.update({ _id: panel._id }, { "executionPdf.design": design });
    const project = await loadProject(panel.projectId);
    res.json({ status: "ok", panel: publicPanel(saved), project: await projectResponse(project) });
} catch (error) { next(error); } };
const uploadTo = (bucket) => async (req, res, next) => { try {
    const panel = await loadPanel(req.params.projectId, req.params.panelId); if (!panel || !req.file) return res.status(400).json({ status: "error", message: "اختر ملفًا أولًا." });
    if (!isOwner(req.user) && (!isEngineer(req.user) || !sameId(panel.engineerId, req.user._id))) return res.status(403).json({ status: "error", message: "رفع الملفات متاح للمهندس المسؤول." });
    const purpose = bucket === "executionPdf" ? String(req.body?.purpose || "") : "";
    if (bucket === "executionPdf" && !executionPdfPurposes.includes(purpose)) return res.status(400).json({ status: "error", message: "نوع ملف PDF التنفيذ غير صحيح." });
    const stored = await uploadFile({ buffer: req.file.buffer, fileName: `${Date.now()}-${req.file.originalname}`, mimeType: req.file.mimetype || "application/octet-stream", folderName: `${panel.panelCode}-${bucket}` });
    const entry = { storageFileId: stored.id, fileName: req.file.originalname, mimeType: req.file.mimetype || stored.mimeType || "application/octet-stream", fileSize: req.file.size, purpose, uploadedAt: new Date(), uploadedBy: req.user._id };
    const isSingleSlot = bucket === "executionPdf" && purpose !== "gallery";
    const replacedFiles = isSingleSlot ? (panel.executionPdf?.files || []).filter((file) => file.purpose === purpose) : [];
    if (replacedFiles.length) await panels.update({ _id: panel._id }, { $pull: { "executionPdf.files": { purpose } } });
    const saved = await panels.update({ _id: panel._id }, { $push: { [`${bucket}.files`]: entry } });
    await Promise.allSettled(replacedFiles.map((file) => deleteStoredFile(file.storageFileId)));
    const project = await loadProject(panel.projectId); res.status(201).json({ status: "ok", panel: publicPanel(saved), project: await projectResponse(project) });
} catch (error) { next(error); } };
const downloadFile = (bucket) => async (req, res, next) => { try {
    const panel = await loadPanel(req.params.projectId, req.params.panelId); const file = panel?.[bucket]?.files?.id(req.params.fileId); if (!file) return res.status(404).json({ status: "error", message: "الملف غير موجود." });
    const stored = await downloadStoredFile(file.storageFileId); res.setHeader("Content-Type", file.mimeType || stored.mimeType); res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`); res.send(stored.buffer);
} catch (error) { next(error); } };
const deleteFile = (bucket) => async (req, res, next) => { try {
    const panel = await loadPanel(req.params.projectId, req.params.panelId); const file = panel?.[bucket]?.files?.id(req.params.fileId); if (!file) return res.status(404).json({ status: "error", message: "الملف غير موجود." });
    if (!isOwner(req.user) && (!isEngineer(req.user) || !sameId(panel.engineerId, req.user._id))) return res.status(403).json({ status: "error", message: "حذف الملف متاح للمهندس المسؤول فقط." });
    await deleteStoredFile(file.storageFileId); const saved = await panels.update({ _id: panel._id }, { $pull: { [`${bucket}.files`]: { _id: file._id } } }); const project = await loadProject(panel.projectId); res.json({ status: "ok", panel: publicPanel(saved), project: await projectResponse(project) });
} catch (error) { next(error); } };
const finishExecutionPdf = async (req, res, next) => { try { const panel = await loadPanel(req.params.projectId, req.params.panelId); if (!panel) return res.status(404).json({ status: "error", message: "اللوحة غير موجودة." }); if (!panel.executionPdf?.skipped && !(panel.executionPdf?.files || []).some((file) => file.purpose === "generatedPdf")) return res.status(400).json({ status: "error", message: "أنشئ ملف PDF التنفيذ النهائي أولًا، أو اختر تخطي المرحلة." }); return transition(req, res, next, { from: ["executionPdfRequested"], to: "executionPdfReady", roles: ["Engineer", "OwnerManager"], requireEngineerAssignment: true, extra: { "executionPdf.readyAt": new Date(), "executionPdf.readyBy": req.user._id }, notify: (project, savedPanel) => notifyProjectMarketer(project, ["MarketingManager"], (recipient) => sendExecutionPdfCompleted(recipient.phoneNumber, project, savedPanel.panelName, `${String(process.env.FRONTEND_URL || "").replace(/\/$/, "")}/projects/${project._id}/panels/${savedPanel._id}`)) }); } catch (error) { next(error); } };
const skipExecutionPdf = (req, res, next) => transition(req, res, next, { from: ["executionPdfRequested"], to: "executionPdfReady", roles: ["Engineer", "OwnerManager"], requireEngineerAssignment: true, extra: { "executionPdf.skipped": true, "executionPdf.readyAt": new Date(), "executionPdf.readyBy": req.user._id } });
const requestExecutionPdfChanges = async (req, res, next) => { try { const project = await loadProject(req.params.projectId); const panel = await loadPanel(req.params.projectId, req.params.panelId); if (!project || !panel) return res.status(404).json({ status: "error", message: "اللوحة غير موجودة." }); if (!["Marketer", "MarketingManager", "OwnerManager"].includes(req.user.role) || panel.status !== "executionPdfReady") return res.status(409).json({ status: "error", message: "لا يمكن طلب تعديل هذه اللوحة الآن." }); if (isMarketer(req.user) && !marketerOwns(req, project, panel)) return res.status(403).json({ status: "error", message: "لا تملك صلاحية طلب تعديل هذه اللوحة." }); const saved = await panels.update({ _id: panel._id }, { status: "editing", $push: { statusHistory: history(req, panel.status, "editing", "executionChangesRequested") } }); await projects.update({ _id: project._id }, { status: "inProgress", marketingEditSession: { active: true, openedBy: req.user._id, openedAt: new Date() }, previewGeneratedAt: null }); res.json({ status: "ok", panel: publicPanel(saved), project: await projectResponse(project) }); } catch (error) { next(error); } };
const confirmExecution = (req, res, next) => transition(req, res, next, { from: ["executionPdfReady", "executionPdfRequested"], to: "manufacturingFilesPending", roles: ["Marketer", "MarketingManager", "OwnerManager"], requireMarketingOwnership: true, extra: { "executionPdf.confirmedAt": new Date(), "executionPdf.confirmedBy": req.user._id }, notify: (project, panel) => notifyPanelPeople(panel, [], (recipient) => sendExecutionConfirmed(recipient.phoneNumber, project, panel.panelName)) });
const finishManufacturing = async (req, res, next) => { try { const panel = await loadPanel(req.params.projectId, req.params.panelId); if (!panel) return res.status(404).json({ status: "error", message: "اللوحة غير موجودة." }); if (!(panel.manufacturing?.files || []).length) return res.status(400).json({ status: "error", message: "ارفع ملف تصنيع واحدًا على الأقل." }); return transition(req, res, next, { from: ["manufacturingFilesPending"], to: "manufacturingFilesReady", roles: ["Engineer", "OwnerManager"], requireEngineerAssignment: true, extra: { "manufacturing.notes": String(req.body?.notes || "").slice(0, 2000), "manufacturing.stages": stages.map((key, index) => ({ key, status: index === 0 ? "active" : "pending", startedAt: index === 0 ? new Date() : null })) }, notify: (project, savedPanel) => notifyRoles(["ProductionManager", "OwnerManager"], (recipient) => sendPanelFilesReady(recipient.phoneNumber, project, savedPanel.panelName)) }); } catch (error) { next(error); } };
const updateStage = async (req, res, next) => { try {
    if (!["ProductionManager", "OwnerManager"].includes(req.user.role)) return res.status(403).json({ status: "error", message: "متابعة الإنتاج متاحة لمدير التنفيذ." });
    const panel = await loadPanel(req.params.projectId, req.params.panelId); if (!panel) return res.status(404).json({ status: "error", message: "اللوحة غير موجودة." });
    const requestedStageKey = req.body?.stageKey === "awaitingLaserDownload" ? "pendingLaserDownload" : req.body?.stageKey;
    const current = (panel.manufacturing?.stages || []).find((stage) => stage.status === "active"); if (!current || current.key !== requestedStageKey) return res.status(409).json({ status: "error", message: "يمكن تحديث المرحلة الحالية فقط." });
    if (req.body.action === "delayed") { current.delayReason = current.key === "pendingLaserDownload" ? "برجاء تنزيل اللوحة إلى الليزر بأقصى سرعة" : String(req.body.reason || ""); current.delayDetails = String(req.body.details || ""); current.delayedAt = new Date(); current.delayedBy = req.user._id; }
    else if (req.body.action === "completed") { const index = stages.indexOf(current.key); current.status = "completed"; current.completedAt = new Date(); current.completedBy = req.user._id; const nextStage = panel.manufacturing.stages[index + 1]; if (nextStage) { nextStage.status = "active"; nextStage.startedAt = new Date(); } }
    else return res.status(400).json({ status: "error", message: "اختر تمت أو لم تتم." });
    const active = panel.manufacturing.stages.find((stage) => stage.status === "active"); const nextStatus = active?.key || "completed";
    const saved = await panels.update({ _id: panel._id }, { status: nextStatus, "manufacturing.stages": panel.manufacturing.stages, $push: { statusHistory: history(req, panel.status, nextStatus, `stage:${req.body.action}`, req.body.reason || "") } }); if (nextStatus === "completed") await refreshProjectCompletion(panel.projectId); const project = await loadProject(panel.projectId); res.json({ status: "ok", panel: publicPanel(saved), project: await projectResponse(project) });
} catch (error) { next(error); } };

const downloadManufacturingArchive = async (req, res, next) => { try { const panel = await loadPanel(req.params.projectId, req.params.panelId); if (!panel) return res.status(404).json({ status: "error", message: "اللوحة غير موجودة." }); const files = panel.manufacturing?.files || []; if (!files.length) return res.status(404).json({ status: "error", message: "لا توجد ملفات تصنيع لتنزيلها." }); const entries = await Promise.all(files.map(async (file, index) => ({ name: `${index + 1}-${file.fileName}`, buffer: (await downloadStoredFile(file.storageFileId)).buffer, date: file.uploadedAt || new Date() }))); const archive = createZipArchive(entries); res.setHeader("Content-Type", "application/zip"); res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(`${panel.panelName || "panel"}-files.zip`)}`); res.send(archive); } catch (error) { next(error); } };

module.exports = { listAllPanels, listPanels, getPanel, createPanel, updatePanel, claimPanel, completeQuote, openEditing, submitEdits, deletePanel, requestExecutionPdf, saveExecutionPdfDesign, uploadExecutionPdf: uploadTo("executionPdf"), downloadExecutionPdf: downloadFile("executionPdf"), deleteExecutionPdf: deleteFile("executionPdf"), finishExecutionPdf, skipExecutionPdf, requestExecutionPdfChanges, confirmExecution, uploadManufacturing: uploadTo("manufacturing"), downloadManufacturing: downloadFile("manufacturing"), downloadManufacturingArchive, deleteManufacturing: deleteFile("manufacturing"), finishManufacturing, updateStage };
