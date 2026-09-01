const panels = require("../models/panels");
const projects = require("../models/projects");
const { uploadFile, downloadStoredFile, deleteStoredFile } = require("../services/googleDrive");
const { sendExecutionPdfRequested, sendExecutionPdfCompleted, sendExecutionConfirmed, sendPanelFilesReady } = require("../services/projectWhatsappNotifications");
const users = require("../models/users");
const createZipArchive = require("../utils/createZipArchive");
const { createInternalNotifications } = require("../services/internalNotifications");
const { addEgyptWorkingDays, subtractEgyptWorkingDays, isEgyptNonWorkingDate } = require("../utils/egyptWorkingDays");

const sameId = (a, b) => String(a || "") === String(b || "");
const isOwner = (user) => user?.role === "OwnerManager";
const isEngineer = (user) => user?.role === "Engineer";
const isMarketer = (user) => user?.role === "Marketer";
const executionStatuses = ["executionPdfRequested", "executionPdfReady", "executionConfirmed", "manufacturingFilesPending", "manufacturingFilesReady", "pendingLaserDownload", "laser", "manufacturing", "painting", "assembly", "completed"];
const marketingEditableStatuses = ["pendingPricing", "pricing", "quoteCompleted", "editing", "executionPdfRequested", "executionPdfReady"];
const stages = ["pendingLaserDownload", "laser", "manufacturing", "painting", "assembly"];
const executionPdfPurposes = ["page2", "page3", "page4", "gallery"];
const thicknessOptions = [0.6, 0.7, 0.8, 0.9, 1, 1.25, 1.5, 1.8, 2, 2.5, 3];
const history = (req, from, to, action, note = "") => ({ from, to, action, note, actorId: req.user._id, actorName: req.user.name || "", actorRole: req.user.role, createdAt: new Date() });
const buildProductionDeadlines = (approvedDate) => ({
    manufacturingFilesDueAt: subtractEgyptWorkingDays(approvedDate, 5),
    pendingLaserDownload: subtractEgyptWorkingDays(approvedDate, 4),
    laser: subtractEgyptWorkingDays(approvedDate, 3),
    manufacturing: subtractEgyptWorkingDays(approvedDate, 2),
    painting: subtractEgyptWorkingDays(approvedDate, 1),
    assembly: new Date(approvedDate)
});
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
const validateMarketerData = (data = {}) => {
    const errors = {};
    if (!Array.isArray(data.thickness) || data.thickness.length === 0) errors.thickness = "اختر سمكًا مطلوبًا واحدًا على الأقل.";
    if (!String(data.panelTypeKey || "").trim()) errors.panelType = "اختر نوع اللوحة.";
    if (typeof data.hasCopper !== "boolean") errors.hasCopper = "حدد هل يوجد نحاس أم لا.";
    if (data.panelTypeKey === "control" && !String(data.controlInstallation || "").trim()) errors.controlInstallation = "اختر تركيب لوحة الكنترول.";
    if (data.hasCopper === true) {
        const copper = data.copperDetails || {};
        if (!String(copper.switches || "").trim()) errors.copperSwitches = "اختر نوع المفاتيح.";
        if (!String(copper.mainKey || "").trim()) errors.copperMain = "اختر أمبير المفتاح الرئيسي.";
        const groups = Array.isArray(copper.branchGroups) ? copper.branchGroups : [];
        if (!groups.length || groups.some((group) => !String(group.optionKey || "").trim() || !Number.isInteger(Number(group.count)) || Number(group.count) < 1)) errors.copperBranches = "أكمل الأمبير والعدد الصحيح لكل مفتاح فرعي.";
    }
    return errors;
};
const normalizedComparable = (value) => {
    if (Array.isArray(value)) return value.map(normalizedComparable).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, normalizedComparable(value[key])]));
    return value ?? null;
};
const valuesMatch = (first, second) => JSON.stringify(normalizedComparable(first)) === JSON.stringify(normalizedComparable(second));
const summarizeCopper = (value = {}) => {
    const branches = (Array.isArray(value.branchGroups) ? value.branchGroups : []).map((group) => `${group.optionKey || "-"} × ${Math.max(1, Number(group.count || group.quantity) || 1)}`);
    return [`المفاتيح: ${value.switches || "-"}`, `الرئيسي: ${value.mainKey || "-"}`, branches.length ? `الفرعيات: ${branches.join("، ")}` : "الفرعيات: لا يوجد"].join(" | ");
};
const displayEditValue = (field, value) => {
    if (field === "hasCopper") return value === true ? "نعم" : value === false ? "لا" : "غير محدد";
    if (field === "thickness") return Array.isArray(value) && value.length ? value.map(Number).sort((a, b) => a - b).map((item) => `${item} مم`).join("، ") : "لا يوجد";
    if (field === "copperDetails") return summarizeCopper(value || {});
    return String(value ?? "").trim() || "لا يوجد";
};
const buildMarketingEditChanges = (panel, draft = {}) => {
    const before = panel.marketerData?.toObject?.() || panel.marketerData || {};
    const after = draft.marketerData || before;
    const definitions = [
        ["panelName", "اسم اللوحة", panel.panelName, draft.panelName ?? panel.panelName],
        ["panelTypeKey", "نوع اللوحة", before.panelType || before.panelTypeKey, after.panelType || after.panelTypeKey],
        ["thickness", "سمك الصاج المطلوب", (before.thickness || []).map(Number).filter(Number.isFinite).sort((a, b) => a - b), (after.thickness || []).map(Number).filter(Number.isFinite).sort((a, b) => a - b)],
        ["hasCopper", "وجود النحاس", before.hasCopper, after.hasCopper],
        ["controlInstallation", "تركيب لوحة الكنترول", before.controlInstallation, after.controlInstallation],
        ["additionalDetails", "التفاصيل الإضافية", before.additionalDetails, after.additionalDetails],
        ["copperDetails", "بيانات النحاس", before.copperDetails || {}, after.copperDetails || {}],
    ];
    return definitions.filter(([, , oldValue, newValue]) => !valuesMatch(oldValue, newValue)).map(([field, label, oldValue, newValue]) => ({ field, label, before: displayEditValue(field, oldValue), after: displayEditValue(field, newValue) }));
};
const publicPanel = (panel, useMarketingDraft = false) => {
    const stored = panel.toObject ? panel.toObject() : panel;
    const object = useMarketingDraft && stored.marketingDraft ? { ...stored, ...stored.marketingDraft } : stored;
    const safeObject = { ...object };
    delete safeObject.marketingDraft;
    delete safeObject.marketingDraftDeleted;
    const marketerThickness = object.marketerData?.thickness || [];
    const pricingThickness = object.pricing?.thickness || [];
    const executionStatus = object.status === "executionPdfRequested" ? "requested" : object.status === "executionPdfReady" ? "ready" : executionStatuses.includes(object.status) ? "confirmed" : "notRequested";
    const manufacturingStatus = object.status === "manufacturingFilesPending" ? "awaitingFiles" : ["manufacturingFilesReady", "pendingLaserDownload"].includes(object.status) ? "filesReady" : ["laser", "manufacturing", "painting", "assembly", "completed"].includes(object.status) ? "downloadedToLaser" : "notStarted";
    const stageRows = (object.manufacturing?.stages || []).map((stage) => ({ ...stage, key: stage.key === "pendingLaserDownload" ? "awaitingLaserDownload" : stage.key }));
    const activeStage = stageRows.find((stage) => stage.status === "active");
    const productionHistory = (object.statusHistory || []).filter((entry) => entry.action === "productionNotesUpdated" || String(entry.action || "").startsWith("stage:")).map((entry) => {
        const action = entry.action === "productionNotesUpdated" ? "notes" : String(entry.action).split(":")[1];
        return {
        action,
        stageKey: (entry.stageKey || entry.from) === "pendingLaserDownload" ? "awaitingLaserDownload" : (entry.stageKey || entry.from),
        reason: entry.reason || (action === "delayed" ? entry.note : ""),
        details: entry.details || "",
        notes: action === "notes" ? (entry.details || entry.note || "") : (entry.note || ""),
        actorName: entry.actorName || "",
        actorRole: entry.actorRole || "",
        createdAt: entry.createdAt
    }; });
    const pricingCopper = object.pricing?.copper || {};
    const marketerCopper = object.marketerData?.copperDetails || {};
    const copper = Object.keys(pricingCopper).length ? pricingCopper : {
        enabled: Boolean(object.marketerData?.hasCopper),
        main: { optionKey: marketerCopper.mainKey || "" },
        branches: (Array.isArray(marketerCopper.branchGroups) ? marketerCopper.branchGroups : []).map((group, index) => ({ branchId: group.id || `marketer-branch-${index}`, branchGroupId: group.id || `marketer-branch-${index}`, optionKey: group.optionKey || "", direction: "one", barCount: 1, quantity: Math.max(1, Number(group.count || group.quantity) || 1) }))
    };
    return { ...safeObject, ...object.marketerData, ...object.pricing, copper, thickness: useMarketingDraft && marketerThickness.length ? marketerThickness : pricingThickness.length ? pricingThickness : marketerThickness, panelId: object._id, executionPdf: { ...(object.executionPdf || {}), status: executionStatus }, manufacturing: { ...(object.manufacturing || {}), status: manufacturingStatus, currentStage: activeStage?.key || "", productionStages: stageRows, productionHistory } };
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
    const projectPanels = await panels.find({ projectId: project._id, isDeleted: false });
    const engineerRows = await users.selectall({
        _id: { $in: projectPanels.map((panel) => panel.engineerId).filter(Boolean) },
        isDeleted: false
    });
    const engineerMap = new Map(engineerRows.map((engineer) => [
        String(engineer._id),
        { _id: engineer._id, name: engineer.name }
    ]));
    return {
        ...object,
        quotePreviewUrl: object.clientPreviewToken ? `${String(process.env.FRONTEND_URL || "").replace(/\/$/, "")}/p/${object.clientPreviewToken}` : "",
        panels: projectPanels.map((panel) => ({
            ...publicPanel(panel),
            assignedEngineer: engineerMap.get(String(panel.engineerId)) || null
        }))
    };
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
        const viewerOwnsDraft = (isMarketer(req.user) || isOwner(req.user)) && panel.marketingEditSession?.active && sameId(panel.marketingEditSession?.openedBy, req.user._id);
        if (panel.status === "draft" && project.status !== "draft" && !viewerOwnsDraft) return false;
        if (req.user.role === "MarketingManager") {
            return project.status !== "draft" && panel.status !== "draft" && ["marketing", "whatsapp"].includes(project.source);
        }
        return true;
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
    const list = await panels.find(condition);
    res.json(list.map((panel) => publicPanel(panel, (isMarketer(req.user) || isOwner(req.user)) && panel.marketingEditSession?.active && sameId(panel.marketingEditSession?.openedBy, req.user._id))));
} catch (error) { next(error); } };
const getPanel = async (req, res, next) => { try {
    const project = await loadProject(req.params.projectId); const panel = await loadPanel(req.params.projectId, req.params.panelId); if (!project || !panel) return res.status(404).json({ status: "error", message: "اللوحة غير موجودة." });
    if (isMarketer(req.user) && !sameId(project.marketingId, req.user._id)) return res.status(403).json({ status: "error", message: "لا تملك صلاحية عرض هذه اللوحة." });
    if (req.user.role === "ProductionManager" && !executionStatuses.includes(panel.status)) return res.status(403).json({ status: "error", message: "اللوحة لم تصل إلى مرحلة التنفيذ بعد." });
    const useMarketingDraft = (isMarketer(req.user) || isOwner(req.user)) && panel.marketingEditSession?.active && sameId(panel.marketingEditSession?.openedBy, req.user._id);
    if (useMarketingDraft && panel.marketingDraftDeleted) return res.status(404).json({ status: "error", message: "اللوحة محذوفة من مسودة التعديل." });
    res.json(publicPanel(panel, useMarketingDraft));
} catch (error) { next(error); } };
const createPanel = async (req, res, next) => { try {
    const project = await loadProject(req.params.projectId); if (!project) return res.status(404).json({ status: "error", message: "المشروع غير موجود." });
    const manualEngineer = (isEngineer(req.user) || isOwner(req.user)) && project.source === "manual";
    const canCreate = manualEngineer || (isMarketer(req.user) && sameId(project.marketingId, req.user._id) && project.status === "draft") || (isOwner(req.user) && project.status === "draft");
    if (!canCreate) return res.status(403).json({ status: "error", message: "بعد إرسال المشروع تكون التعديلات على كل لوحة بصورة منفصلة، ولا يمكن إضافة لوحة من جلسة تعديل لوحة أخرى." });
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
    const marketerSessionEdit = (marketerOwns(req, project, panel) || isOwner(req.user)) && panel.marketingEditSession?.active && sameId(panel.marketingEditSession?.openedBy, req.user._id);
    const marketerCanEdit = (marketerOwns(req, project, panel) && panel.status === "draft") || marketerSessionEdit || (isOwner(req.user) && panel.status === "draft");
    const engineerCanEdit = !panel.marketingEditSession?.active && (isOwner(req.user) || (isEngineer(req.user) && sameId(panel.engineerId, req.user._id))) && ["pricing", "editing"].includes(panel.status);
    if (!marketerCanEdit && !engineerCanEdit) return res.status(409).json({ status: "error", message: "هذه اللوحة ليست مفتوحة لك للتعديل الآن." });
    if (marketerSessionEdit && panel.status !== "draft") {
        const draft = { ...(panel.marketingDraft || {}), panelName: payload.panelName != null ? String(payload.panelName).trim() : (panel.marketingDraft?.panelName || panel.panelName), marketerData: { ...(panel.marketingDraft?.marketerData || panel.marketerData.toObject()), ...payload.marketerData } };
        if (req.body?.marketerSaved === true) {
            const fields = validateMarketerData(draft.marketerData);
            if (Object.keys(fields).length) return res.status(400).json({ status: "error", code: "PANEL_VALIDATION_ERROR", message: "أكمل بيانات اللوحة الإلزامية قبل الحفظ.", fields });
            draft.marketerSaved = true;
        }
        const saved = await panels.update({ _id: panel._id }, { marketingDraft: draft });
        return res.json({ status: "ok", panel: publicPanel(saved, true) });
    }
    if (payload.panelName != null) update.panelName = String(payload.panelName).trim();
    if (marketerCanEdit) {
        update.marketerData = { ...panel.marketerData.toObject(), ...payload.marketerData };
        if (req.body?.marketerSaved === true) {
            const fields = validateMarketerData(update.marketerData);
            if (Object.keys(fields).length) return res.status(400).json({ status: "error", code: "PANEL_VALIDATION_ERROR", message: "أكمل بيانات اللوحة الإلزامية قبل الحفظ.", fields });
            update.marketerSaved = true;
        }
    }
    if (engineerCanEdit) update.pricing = { ...panel.pricing.toObject(), ...payload.pricing };
    const saved = await panels.update({ _id: panel._id }, update); res.json({ status: "ok", panel: publicPanel(saved) });
} catch (error) { next(error); } };
const claimPanel = async (req, res, next) => { try {
    if (!isEngineer(req.user) && !isOwner(req.user)) return res.status(403).json({ status: "error", message: "حجز اللوحات متاح للمهندسين." });
    const project = await loadProject(req.params.projectId);
    if (!project) return res.status(404).json({ status: "error", message: "المشروع غير موجود." });
    if (project.status !== "inProgress") return res.status(409).json({ status: "error", message: "يجب استكمال بيانات المشروع المشتركة أولًا." });
    const currentPanel = await loadPanel(req.params.projectId, req.params.panelId);
    if (currentPanel?.marketingEditSession?.active) return res.status(409).json({ status: "error", code: "PANEL_MARKETING_EDIT_ACTIVE", message: "المندوب يعدّل هذه اللوحة حاليًا. انتظر حتى ينهي التعديلات." });
    const now = new Date(); const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
    const panel = await panels.update({ _id: req.params.panelId, projectId: req.params.projectId, isDeleted: false, status: "pendingPricing", engineerId: null, "marketingEditSession.active": { $ne: true } }, { engineerId: req.user._id, assignedAt: now, status: "pricing", lock: { userId: req.user._id, role: req.user.role, acquiredAt: now, expiresAt }, $push: { statusHistory: history(req, "pendingPricing", "pricing", "claimed") } });
    if (!panel) return res.status(409).json({ status: "error", message: "تم حجز هذه اللوحة بواسطة مهندس آخر." });
    res.json({ status: "ok", panel: publicPanel(panel) });
} catch (error) { next(error); } };
const completeQuote = async (req, res, next) => { try {
    const panel = await loadPanel(req.params.projectId, req.params.panelId); if (!panel) return res.status(404).json({ status: "error", message: "اللوحة غير موجودة." });
    if (panel.marketingEditSession?.active) return res.status(409).json({ status: "error", code: "PANEL_MARKETING_EDIT_ACTIVE", message: "لا يمكن إتمام التسعير أثناء تعديل المندوب للوحة." });
    if (!isOwner(req.user) && (!isEngineer(req.user) || !sameId(panel.engineerId, req.user._id))) return res.status(403).json({ status: "error", message: "إتمام التسعير متاح للمهندس المسؤول فقط." });
    if (!["pricing", "editing"].includes(panel.status)) return res.status(409).json({ status: "error", message: "اللوحة ليست في مرحلة التسعير." });
    if (!Array.isArray(panel.pricing?.thickness) || panel.pricing.thickness.length === 0) return res.status(400).json({ status: "error", message: "يرجى اختيار سمك الصاج قبل إتمام تسعير اللوحة." });
    const saved = await panels.update({ _id: panel._id }, { status: "quoteCompleted", quoteCompletedAt: new Date(), lock: { userId: null, role: "", acquiredAt: null, expiresAt: null }, $push: { statusHistory: history(req, panel.status, "quoteCompleted", "quoteCompleted") } });
    await projects.update({ _id: panel.projectId }, { status: "inProgress", previewGeneratedAt: null });
    res.json({ status: "ok", panel: publicPanel(saved) });
} catch (error) { next(error); } };
const openEditing = async (req, res, next) => { try {
    const project = await loadProject(req.params.projectId); const panel = await loadPanel(req.params.projectId, req.params.panelId); if (!project || !panel) return res.status(404).json({ status: "error", message: "اللوحة غير موجودة." });
    if (!isOwner(req.user) && !marketerOwns(req, project, panel)) return res.status(403).json({ status: "error", message: "لا تملك صلاحية تعديل اللوحة." });
    if (!marketingEditableStatuses.includes(panel.status)) return res.status(409).json({ status: "error", code: "PANEL_EDITING_CLOSED", message: "لا يمكن تعديل اللوحة بعد تأكيد PDF التنفيذ أو دخولها مرحلة الإنتاج." });
    if (panel.marketingEditSession?.active) {
        if (sameId(panel.marketingEditSession.openedBy, req.user._id)) return res.json({ status: "ok", project: await projectResponse(project), panel: publicPanel(panel, true) });
        return res.status(409).json({ status: "error", message: "هذه اللوحة مفتوحة للتعديل بواسطة مستخدم آخر." });
    }
    const engineerIsWorking = Boolean(panel.engineerId && (["pricing", "editing"].includes(panel.status) || (panel.lock?.userId && panel.lock.expiresAt > new Date())));
    if (engineerIsWorking && req.body?.forceStopEngineer !== true) return res.status(409).json({ status: "error", code: "ENGINEER_ACTIVE_CONFIRMATION_REQUIRED", message: "المهندس يعمل على هذه اللوحة حاليًا. يجب تأكيد إيقافه قبل فتح التعديل." });
    const draft = panel.marketingDraft || { panelName: panel.panelName, marketerData: panel.marketerData.toObject(), marketerSaved: true };
    const saved = await panels.update({ _id: panel._id }, { marketingDraft: draft, marketingDraftDeleted: false, marketingEditSession: { active: true, openedBy: req.user._id, openedAt: new Date(), previousStatus: panel.status }, lock: { userId: null, role: "", acquiredAt: null, expiresAt: null } });
    if (engineerIsWorking && panel.engineerId) await createInternalNotifications({ userIds: [panel.engineerId], project, panel: saved, excludeUserId: req.user._id, type: "panelMarketingEditStarted", title: "توقف عن العمل لإجراء تعديلات المندوب", body: `${panel.panelName} — فتح المندوب تعديلًا على اللوحة، وتم إيقاف التسعير مؤقتًا.`, actor: req.user });
    res.json({ status: "ok", project: await projectResponse(project), panel: publicPanel(saved, true), notification: engineerIsWorking ? "تم إيقاف العمل على اللوحة وإخطار المهندس." : "تم فتح اللوحة للتعديل." });
} catch (error) { next(error); } };
const submitEdits = async (req, res, next) => { try {
    const project = await loadProject(req.params.projectId); const panel = await loadPanel(req.params.projectId, req.params.panelId);
    if (!project || !panel) return res.status(404).json({ status: "error", message: "اللوحة غير موجودة." });
    if (!panel.marketingEditSession?.active || (!isOwner(req.user) && !sameId(panel.marketingEditSession.openedBy, req.user._id))) return res.status(403).json({ status: "error", message: "لا توجد جلسة تعديل مفتوحة لهذه اللوحة." });
    const draft = panel.marketingDraft || {};
    const marketerData = draft.marketerData || panel.marketerData.toObject();
    const fields = validateMarketerData(marketerData);
    if (Object.keys(fields).length) return res.status(400).json({ status: "error", code: "PANEL_VALIDATION_ERROR", message: "أكمل بيانات اللوحة الإلزامية قبل إنهاء التعديلات.", fields });
    const changes = buildMarketingEditChanges(panel, draft);
    if (changes.length === 0) return res.status(409).json({ status: "error", code: "NO_PANEL_CHANGES", message: "لم تُجرِ أي تعديل على اللوحة. يمكنك إنهاء جلسة التعديل دون حفظ." });
    const onlyThicknessChanged = changes.length > 0 && changes.every((change) => change.field === "thickness");
    const onlyControlInstallationChanged = changes.length > 0 && changes.every((change) => change.field === "controlInstallation");
    const previousStatus = panel.marketingEditSession?.previousStatus || panel.status;
    const selectedThicknesses = (marketerData.thickness || []).map(Number).filter(Number.isFinite);
    const executionThickness = Number(panel.executionPdf?.steelThickness);
    const executionThicknessStillValid = !Number.isFinite(executionThickness) || selectedThicknesses.some((value) => Math.abs(value - executionThickness) < 0.0001);
    const executionNeedsReset = onlyThicknessChanged && ["executionPdfRequested", "executionPdfReady"].includes(previousStatus) && !executionThicknessStillValid;
    const executionPdfNeedsRegeneration = onlyControlInstallationChanged && ["executionPdfRequested", "executionPdfReady"].includes(previousStatus);
    const returnsWithoutRepricing = onlyThicknessChanged || onlyControlInstallationChanged;
    const nextStatus = returnsWithoutRepricing
        ? executionPdfNeedsRegeneration ? "executionPdfRequested" : executionNeedsReset ? "quoteCompleted" : previousStatus
        : "pendingPricing";
    const editSummary = { changes, onlyThicknessChanged, onlyControlInstallationChanged, requiresEngineer: !returnsWithoutRepricing, requiresExecutionPdf: executionPdfNeedsRegeneration, priceChanged: !returnsWithoutRepricing, previousStatus, nextStatus, editedAt: new Date(), editedBy: req.user._id, editedByName: req.user.name || "" };
    const commonUpdate = { ...(draft.panelName != null ? { panelName: draft.panelName } : {}), marketerData, marketerSaved: true, marketingDraft: null, marketingDraftDeleted: false, marketingEditSession: { active: false, openedBy: null, openedAt: null, previousStatus: "" }, lastMarketingEdit: editSummary, status: nextStatus, lock: { userId: null, role: "", acquiredAt: null, expiresAt: null }, $push: { statusHistory: history(req, panel.status, nextStatus, changes.length === 0 ? "marketingEditClosedNoChanges" : onlyThicknessChanged ? "marketingThicknessAutoApplied" : "panelMarketingEditsSubmitted", changes.map((change) => change.label).join("، ")) } };
    const resetExecutionPdf = {
        files: [],
        steelThickness: executionPdfNeedsRegeneration ? panel.executionPdf?.steelThickness ?? null : null,
        design: {},
        requestedAt: executionPdfNeedsRegeneration ? new Date() : null,
        requestedBy: executionPdfNeedsRegeneration ? req.user._id : null,
        readyAt: null,
        readyBy: null,
        confirmedAt: null,
        confirmedBy: null,
        skipped: false
    };
    const discardExecutionPdf = executionNeedsReset || executionPdfNeedsRegeneration || !returnsWithoutRepricing;
    const discardedExecutionFiles = discardExecutionPdf ? [...(panel.executionPdf?.files || [])] : [];
    const saved = returnsWithoutRepricing
        ? await panels.update({ _id: panel._id }, { ...commonUpdate, ...(onlyThicknessChanged ? { "pricing.thickness": selectedThicknesses } : {}), ...(discardExecutionPdf ? { executionPdf: resetExecutionPdf } : {}) })
        : await panels.update({ _id: panel._id }, { ...commonUpdate, engineerId: null, assignedAt: null, executionPdf: resetExecutionPdf, manufacturing: { files: [], notes: "", engineerNotes: "", productionNotes: "", stages: [], lastReminderAt: null } });
    if (discardedExecutionFiles.length) await Promise.allSettled(discardedExecutionFiles.map((file) => deleteStoredFile(file.storageFileId)));
    await projects.update({ _id: project._id }, returnsWithoutRepricing ? { status: "inProgress" } : { status: "inProgress", previewGeneratedAt: null });
    if (!returnsWithoutRepricing) await createInternalNotifications({ roles: ["Engineer", "OwnerManager"], excludeUserId: req.user._id, project, panel: saved, type: "panelPricingUpdated", title: "تعديلات لوحة جديدة في انتظار التسعير", body: `${saved.panelName} — ${changes.map((change) => change.label).join("، ")}`, actor: req.user });
    else if (executionPdfNeedsRegeneration) await createInternalNotifications({ userIds: [panel.engineerId], roles: ["OwnerManager"], excludeUserId: req.user._id, project, panel: saved, type: "executionPdfRequested", title: "مطلوب PDF تنفيذ جديد بعد تعديل تركيب اللوحة", body: `${saved.panelName} — لم يتغير السعر، وأُلغي PDF التنفيذ السابق لتجهيز نسخة جديدة`, actor: req.user });
    else if (onlyThicknessChanged && panel.engineerId) await createInternalNotifications({ userIds: [panel.engineerId], roles: ["OwnerManager"], excludeUserId: req.user._id, project, panel: saved, type: "panelThicknessUpdated", title: "تم تحديث سماكات اللوحة تلقائيًا", body: `${saved.panelName} — لا تحتاج إعادة تسعير يدوي`, actor: req.user });
    const message = onlyControlInstallationChanged
        ? executionPdfNeedsRegeneration
            ? "تم حفظ تركيب لوحة الكنترول دون تغيير السعر، وسيُجهز ملف التنفيذ من جديد."
            : "تم حفظ تعديل تركيب لوحة الكنترول. لم يتغير السعر ولا تحتاج اللوحة إلى إعادة تسعير."
        : onlyThicknessChanged
            ? executionNeedsReset ? "تم تحديث السماكات تلقائيًا. أُلغي PDF التنفيذ السابق لأن السمك المؤكد لم يعد ضمن الاختيارات." : "تم تحديث السماكات وعرض السعر تلقائيًا دون إعادة اللوحة للمهندس."
            : "تم حفظ تعديلات اللوحة وإرسالها للتسعير.";
    res.json({ status: "ok", message, changes, requiresEngineer: !returnsWithoutRepricing, panel: publicPanel(saved), project: await projectResponse(project) });
} catch (error) { next(error); } };
const cancelEdits = async (req, res, next) => { try {
    const project = await loadProject(req.params.projectId); const panel = await loadPanel(req.params.projectId, req.params.panelId);
    if (!project || !panel) return res.status(404).json({ status: "error", message: "اللوحة غير موجودة." });
    if (!panel.marketingEditSession?.active || (!isOwner(req.user) && !sameId(panel.marketingEditSession.openedBy, req.user._id))) return res.status(403).json({ status: "error", message: "لا توجد جلسة تعديل مفتوحة لهذه اللوحة." });
    const saved = await panels.update({ _id: panel._id }, { marketingDraft: null, marketingDraftDeleted: false, marketingEditSession: { active: false, openedBy: null, openedAt: null, previousStatus: "" }, lock: { userId: null, role: "", acquiredAt: null, expiresAt: null } });
    const engineerWasWorking = panel.engineerId && ["pricing", "editing"].includes(panel.marketingEditSession?.previousStatus || panel.status);
    if (engineerWasWorking) await createInternalNotifications({ userIds: [panel.engineerId], roles: ["OwnerManager"], excludeUserId: req.user._id, project, panel: saved, type: "panelMarketingEditCancelled", title: "تم إلغاء تعديل المندوب", body: `${saved.panelName} — يمكنك استكمال العمل على اللوحة.`, actor: req.user });
    res.json({ status: "ok", message: "تم إنهاء جلسة التعديل دون حفظ أي تغييرات.", panel: publicPanel(saved), project: await projectResponse(project) });
} catch (error) { next(error); } };
const deletePanel = async (req, res, next) => { try {
    const project = await loadProject(req.params.projectId); const panel = await loadPanel(req.params.projectId, req.params.panelId); if (!project || !panel) return res.status(404).json({ status: "error", message: "اللوحة غير موجودة." });
    const marketerCanDelete = marketerOwns(req, project, panel) && panel.status === "draft";
    if (!isOwner(req.user) && !marketerCanDelete) return res.status(403).json({ status: "error", message: "بعد إرسال اللوحة لا يمكن حذفها إلا بواسطة Owner Manager." });
    await panels.update({ _id: panel._id }, { isDeleted: true, deletedAt: new Date(), deletedBy: req.user._id }); await projects.update({ _id: project._id }, { $pull: { panelIds: panel._id }, previewGeneratedAt: null }); res.json({ status: "ok", message: "تم نقل اللوحة إلى سلة المحذوفات." });
} catch (error) { next(error); } };
const transition = async (req, res, next, { from, to, roles, extra = {}, notify, internalNotification, requireMarketingOwnership = false, requireEngineerAssignment = false }) => { try {
    if (!roles.includes(req.user.role)) return res.status(403).json({ status: "error", message: "لا تملك صلاحية تنفيذ هذه الخطوة." });
    const panel = await loadPanel(req.params.projectId, req.params.panelId); const project = await loadProject(req.params.projectId); if (!panel || !project) return res.status(404).json({ status: "error", message: "اللوحة غير موجودة." });
    if (panel.marketingEditSession?.active) return res.status(409).json({ status: "error", code: "PANEL_MARKETING_EDIT_ACTIVE", message: "لا يمكن تنفيذ هذه الخطوة أثناء تعديل المندوب للوحة." });
    if (requireMarketingOwnership && isMarketer(req.user) && !marketerOwns(req, project, panel)) return res.status(403).json({ status: "error", message: "لا تملك صلاحية تنفيذ هذه الخطوة على اللوحة." });
    if (requireEngineerAssignment && isEngineer(req.user) && !sameId(panel.engineerId, req.user._id)) return res.status(403).json({ status: "error", message: "هذه الخطوة متاحة للمهندس المسؤول عن اللوحة فقط." });
    if (!from.includes(panel.status)) return res.status(409).json({ status: "error", message: "لا يمكن تنفيذ هذه الخطوة في حالة اللوحة الحالية." });
    const saved = await panels.update({ _id: panel._id }, { status: to, ...extra, $push: { statusHistory: history(req, panel.status, to, to) } });
    if (notify) await notify(project, saved);
    if (internalNotification) await createInternalNotifications({ ...internalNotification(project, saved), project, panel: saved, excludeUserId: req.user._id, actor: req.user });
    if (to === "completed") await refreshProjectCompletion(project._id); else await projects.update({ _id: project._id }, { status: "inProgress" });
    res.json({ status: "ok", panel: publicPanel(saved), project: await projectResponse(project) });
} catch (error) { next(error); } };
const requestExecutionPdf = async (req, res, next) => { try {
    const panel = await loadPanel(req.params.projectId, req.params.panelId);
    const selectedThickness = Number(req.body?.steelThickness);
    const quotedThicknesses = (panel?.pricing?.thickness || panel?.marketerData?.thickness || []).map(Number);
    const highestQuotedThickness = quotedThicknesses.length ? Math.max(...quotedThicknesses) : 0;
    const availableThicknesses = [...quotedThicknesses, ...thicknessOptions.filter((value) => value > highestQuotedThickness)];
    if (!panel) return res.status(404).json({ status: "error", message: "اللوحة غير موجودة." });
    if (!Number.isFinite(selectedThickness) || !availableThicknesses.some((value) => Math.abs(value - selectedThickness) < 0.0001)) {
        return res.status(400).json({ status: "error", message: "اختر سمكًا من عرض السعر أو من بدائل السماكات الأعلى المعروضة للعميل." });
    }
    return transition(req, res, next, { from: ["quoteCompleted"], to: "executionPdfRequested", roles: ["Marketer", "MarketingManager", "OwnerManager"], requireMarketingOwnership: true, extra: { "executionPdf.steelThickness": selectedThickness, "executionPdf.requestedAt": new Date(), "executionPdf.requestedBy": req.user._id }, notify: (project, savedPanel) => notifyPanelPeople(savedPanel, ["OwnerManager", "ProductionManager"], (recipient) => sendExecutionPdfRequested(recipient.phoneNumber, project, savedPanel.panelName)), internalNotification: (project, savedPanel) => ({ userIds: [savedPanel.engineerId], roles: ["OwnerManager", "ProductionManager"], type: "executionPdfRequested", title: "في انتظار PDF التنفيذ", body: `${savedPanel.panelName} — ${project.client?.name || project.projectCode}` }) });
} catch (error) { next(error); } };

const saveExecutionPdfDesign = async (req, res, next) => { try {
    const panel = await loadPanel(req.params.projectId, req.params.panelId);
    if (!panel) return res.status(404).json({ status: "error", message: "اللوحة غير موجودة." });
    if (panel.marketingEditSession?.active) return res.status(409).json({ status: "error", code: "PANEL_MARKETING_EDIT_ACTIVE", message: "المندوب يعدّل هذه اللوحة حاليًا." });
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
    if (panel.marketingEditSession?.active) return res.status(409).json({ status: "error", code: "PANEL_MARKETING_EDIT_ACTIVE", message: "لا يمكن رفع ملفات أثناء تعديل المندوب للوحة." });
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
    if (panel.marketingEditSession?.active) return res.status(409).json({ status: "error", code: "PANEL_MARKETING_EDIT_ACTIVE", message: "لا يمكن حذف ملفات أثناء تعديل المندوب للوحة." });
    if (!isOwner(req.user) && (!isEngineer(req.user) || !sameId(panel.engineerId, req.user._id))) return res.status(403).json({ status: "error", message: "حذف الملف متاح للمهندس المسؤول فقط." });
    await deleteStoredFile(file.storageFileId); const saved = await panels.update({ _id: panel._id }, { $pull: { [`${bucket}.files`]: { _id: file._id } } }); const project = await loadProject(panel.projectId); res.json({ status: "ok", panel: publicPanel(saved), project: await projectResponse(project) });
} catch (error) { next(error); } };
const finishExecutionPdf = async (req, res, next) => { try {
    const panel = await loadPanel(req.params.projectId, req.params.panelId);
    if (!panel) return res.status(404).json({ status: "error", message: "اللوحة غير موجودة." });
    const design = panel.executionPdf?.design || {};
    const assignments = design.assignments || {};
    const sourceFileIds = new Set((panel.executionPdf?.files || []).filter((file) => file.purpose !== "generatedPdf").map((file) => String(file._id)));
    const assignedIds = [assignments.page2, assignments.page3, assignments.page4, ...(assignments.gallery || [])].filter(Boolean).map(String);
    const completeDesign = design.panelSize && design.steelThickness && design.paint && design.page3Text
        && Array.isArray(design.page4Lines) && design.page4Lines.length
        && assignments.page2 && assignments.page3 && assignments.page4
        && Array.isArray(assignments.gallery) && assignments.gallery.length === 3
        && assignedIds.every((id) => sourceFileIds.has(id));
    if (!panel.executionPdf?.skipped && !completeDesign) {
        return res.status(400).json({ status: "error", message: "أكمل بيانات وصور PDF التنفيذ أولًا، أو اختر تخطي المرحلة." });
    }
    const legacyGeneratedFiles = (panel.executionPdf?.files || []).filter((file) => file.purpose === "generatedPdf");
    if (legacyGeneratedFiles.length) {
        await Promise.allSettled(legacyGeneratedFiles.map((file) => deleteStoredFile(file.storageFileId)));
        await panels.update({ _id: panel._id }, { $pull: { "executionPdf.files": { purpose: "generatedPdf" } } });
    }
    return transition(req, res, next, {
        from: ["executionPdfRequested"], to: "executionPdfReady", roles: ["Engineer", "OwnerManager"], requireEngineerAssignment: true,
        extra: { "executionPdf.readyAt": new Date(), "executionPdf.readyBy": req.user._id },
        notify: async (project, savedPanel) => {
            const previewProject = await projects.findOne({ _id: project._id, isDeleted: false }).select("+clientPreviewToken");
            const baseUrl = String(process.env.FRONTEND_URL || "").replace(/\/$/, "");
            const previewUrl = previewProject?.clientPreviewToken
                ? `${baseUrl}/p/${previewProject.clientPreviewToken}`
                : `${baseUrl}/projects/${project._id}/panels/${savedPanel._id}`;
            return notifyProjectMarketer(project, ["MarketingManager"], (recipient) => sendExecutionPdfCompleted(recipient.phoneNumber, project, savedPanel.panelName, previewUrl));
        },
        internalNotification: (project, savedPanel) => ({ userIds: [project.marketingId], roles: ["MarketingManager", "OwnerManager"], type: "executionPdfReady", title: "PDF التنفيذ جاهز للمراجعة", body: `${savedPanel.panelName} — ${project.client?.name || project.projectCode}` })
    });
} catch (error) { next(error); } };
const skipExecutionPdf = (req, res, next) => transition(req, res, next, { from: ["executionPdfRequested"], to: "executionPdfReady", roles: ["Engineer", "OwnerManager"], requireEngineerAssignment: true, extra: { "executionPdf.skipped": true, "executionPdf.readyAt": new Date(), "executionPdf.readyBy": req.user._id }, internalNotification: (project, savedPanel) => ({ userIds: [project.marketingId], roles: ["MarketingManager", "OwnerManager"], type: "executionPdfReady", title: "تم تخطي PDF التنفيذ واللوحة جاهزة للمراجعة", body: `${savedPanel.panelName} — ${project.client?.name || project.projectCode}` }) });
const requestExecutionPdfChanges = (req, res, next) => openEditing(req, res, next);
const confirmExecution = (req, res, next) => transition(req, res, next, { from: ["executionPdfReady"], to: "manufacturingFilesPending", roles: ["Marketer", "MarketingManager", "OwnerManager"], requireMarketingOwnership: true, extra: { "executionPdf.confirmedAt": new Date(), "executionPdf.confirmedBy": req.user._id }, notify: (project, panel) => notifyPanelPeople(panel, [], (recipient) => sendExecutionConfirmed(recipient.phoneNumber, project, panel.panelName)), internalNotification: (project, savedPanel) => ({ userIds: [savedPanel.engineerId], roles: ["ProductionManager", "OwnerManager"], type: "executionConfirmed", title: "تم تأكيد تنفيذ اللوحة", body: `${savedPanel.panelName} — برجاء تجهيز ملفات التصنيع` }) });
const requestDeliverySchedule = async (req, res, next) => { try {
    const project = await loadProject(req.params.projectId); const panel = await loadPanel(req.params.projectId, req.params.panelId);
    if (!project || !panel) return res.status(404).json({ status: "error", message: "اللوحة غير موجودة." });
    const allowed = isOwner(req.user) || req.user.role === "MarketingManager" || marketerOwns(req, project, panel);
    if (!allowed) return res.status(403).json({ status: "error", message: "تحديد موعد التسليم متاح للمندوب وإدارة التسويق." });
    const deliveryScheduleStatuses = ["executionConfirmed", "manufacturingFilesPending", "manufacturingFilesReady", "pendingLaserDownload", "laser", "manufacturing", "painting", "assembly"];
    if (!deliveryScheduleStatuses.includes(panel.status)) return res.status(409).json({ status: "error", message: panel.status === "completed" ? "اكتمل تنفيذ هذه اللوحة بالفعل." : "يمكن تحديد موعد انتهاء اللوحة بعد تأكيد التنفيذ فقط." });
    if (panel.deliverySchedule?.status === "accepted") return res.status(409).json({ status: "error", message: "تم اعتماد موعد اللوحة نهائيًا ولا يمكن للمندوب تغييره." });
    const value = String(req.body?.requestedDate || "").trim();
    const requestedDate = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date("");
    const minimumDate = addEgyptWorkingDays(new Date(), 7);
    if (Number.isNaN(requestedDate.getTime()) || requestedDate < minimumDate) return res.status(400).json({ status: "error", message: "يجب أن يكون موعد انتهاء اللوحة بعد سبعة أيام عمل على الأقل من تاريخ الطلب، دون احتساب الجمعة والعطلات الرسمية." });
    if (isEgyptNonWorkingDate(requestedDate)) return res.status(400).json({ status: "error", message: "لا يمكن اختيار يوم الجمعة أو عطلة رسمية موعدًا للتسليم." });
    const saved = await panels.update({ _id: panel._id }, { deliverySchedule: { requestedDate, approvedDate: null, wasAdjusted: false, deadlines: {}, status: "pending", requestedBy: req.user._id, requestedAt: new Date(), respondedBy: null, respondedAt: null, responseNote: "" }, $push: { statusHistory: history(req, panel.status, panel.status, "deliveryScheduleRequested", value) } });
    await createInternalNotifications({ roles: ["ProductionManager", "OwnerManager"], excludeUserId: req.user._id, project, panel: saved, type: "deliveryScheduleRequested", title: "طلب اعتماد موعد انتهاء لوحة", body: `${saved.panelName} — الموعد المطلوب ${requestedDate.toLocaleDateString("ar-EG")}`, actor: req.user });
    res.json({ status: "ok", message: "تم إرسال الموعد لمدير التنفيذ.", panel: publicPanel(saved), project: await projectResponse(project) });
} catch (error) { next(error); } };
const respondDeliverySchedule = async (req, res, next) => { try {
    if (!["ProductionManager", "OwnerManager"].includes(req.user.role)) return res.status(403).json({ status: "error", message: "اعتماد الموعد متاح لمدير التنفيذ." });
    const project = await loadProject(req.params.projectId); const panel = await loadPanel(req.params.projectId, req.params.panelId);
    if (!project || !panel) return res.status(404).json({ status: "error", message: "اللوحة غير موجودة." });
    if (!["pending", "rejected"].includes(panel.deliverySchedule?.status) || !panel.deliverySchedule?.requestedDate) return res.status(409).json({ status: "error", message: "لا يوجد موعد جديد بانتظار القرار." });
    const decision = String(req.body?.decision || "");
    if (!['accepted', 'rejected'].includes(decision)) return res.status(400).json({ status: "error", message: "اختر قبول الموعد أو رفضه." });
    const responseNote = String(req.body?.responseNote || "").trim().slice(0, 500);
    const replacementValue = String(req.body?.replacementDate || "").trim();
    const replacementDate = /^\d{4}-\d{2}-\d{2}$/.test(replacementValue) ? new Date(`${replacementValue}T12:00:00`) : new Date("");
    const minimumReplacementDate = addEgyptWorkingDays(new Date(), 7);
    if (decision === "rejected" && (Number.isNaN(replacementDate.getTime()) || replacementDate < minimumReplacementDate || isEgyptNonWorkingDate(replacementDate))) return res.status(400).json({ status: "error", message: "عند رفض الموعد يجب تحديد موعد بديل بعد سبعة أيام عمل على الأقل." });
    const approvedDate = decision === "accepted" ? new Date(panel.deliverySchedule.requestedDate) : replacementDate;
    const wasAdjusted = decision === "rejected";
    const saved = await panels.update({ _id: panel._id }, { "deliverySchedule.status": "accepted", "deliverySchedule.approvedDate": approvedDate, "deliverySchedule.wasAdjusted": wasAdjusted, "deliverySchedule.deadlines": buildProductionDeadlines(approvedDate), "deliverySchedule.respondedBy": req.user._id, "deliverySchedule.respondedAt": new Date(), "deliverySchedule.responseNote": responseNote, $push: { statusHistory: history(req, panel.status, panel.status, wasAdjusted ? "deliveryScheduleAdjusted" : "deliveryScheduleAccepted", wasAdjusted ? replacementValue : responseNote) } });
    await createInternalNotifications({ userIds: [project.marketingId], roles: ["MarketingManager", "OwnerManager"], excludeUserId: req.user._id, project, panel: saved, type: wasAdjusted ? "deliveryScheduleAdjusted" : "deliveryScheduleAccepted", title: wasAdjusted ? "تم تحديد موعد بديل لانتهاء اللوحة" : "تم اعتماد موعد انتهاء اللوحة", body: `${saved.panelName} — الموعد النهائي ${approvedDate.toLocaleDateString("ar-EG")}`, actor: req.user });
    res.json({ status: "ok", message: wasAdjusted ? "تم رفض الموعد المقترح واعتماد الموعد البديل نهائيًا." : "تم اعتماد موعد انتهاء اللوحة.", panel: publicPanel(saved), project: await projectResponse(project) });
} catch (error) { next(error); } };
const finishManufacturing = async (req, res, next) => { try { const panel = await loadPanel(req.params.projectId, req.params.panelId); if (!panel) return res.status(404).json({ status: "error", message: "اللوحة غير موجودة." }); if (!(panel.manufacturing?.files || []).length) return res.status(400).json({ status: "error", message: "ارفع ملف تصنيع واحدًا على الأقل." }); return transition(req, res, next, { from: ["manufacturingFilesPending"], to: "manufacturingFilesReady", roles: ["Engineer", "OwnerManager"], requireEngineerAssignment: true, extra: { "manufacturing.engineerNotes": String(req.body?.notes || "").slice(0, 2000), "manufacturing.stages": stages.map((key, index) => ({ key, status: index === 0 ? "active" : "pending", startedAt: index === 0 ? new Date() : null })) }, notify: (project, savedPanel) => notifyRoles(["ProductionManager", "OwnerManager"], (recipient) => sendPanelFilesReady(recipient.phoneNumber, project, savedPanel.panelName)), internalNotification: (project, savedPanel) => ({ roles: ["ProductionManager", "OwnerManager"], type: "manufacturingFilesReady", title: "ملفات تصنيع اللوحة جاهزة", body: `${savedPanel.panelName} — برجاء تنزيل الملفات إلى الليزر` }) }); } catch (error) { next(error); } };
const updateStage = async (req, res, next) => { try {
    if (!["ProductionManager", "OwnerManager"].includes(req.user.role)) return res.status(403).json({ status: "error", message: "متابعة الإنتاج متاحة لمدير التنفيذ." });
    const panel = await loadPanel(req.params.projectId, req.params.panelId); if (!panel) return res.status(404).json({ status: "error", message: "اللوحة غير موجودة." });
    const notes = String(req.body?.notes || "").slice(0, 2000);
    if (req.body.action === "notes") {
        const notesHistory = { ...history(req, panel.status, panel.status, "productionNotesUpdated"), stageKey: panel.manufacturing?.stages?.find((stage) => stage.status === "active")?.key || "", details: notes };
        const saved = await panels.update({ _id: panel._id }, { "manufacturing.productionNotes": notes, $push: { statusHistory: notesHistory } });
        const project = await loadProject(panel.projectId);
        return res.json({ status: "ok", panel: publicPanel(saved), project: await projectResponse(project) });
    }
    const requestedStageKey = req.body?.stageKey === "awaitingLaserDownload" ? "pendingLaserDownload" : req.body?.stageKey;
    const current = (panel.manufacturing?.stages || []).find((stage) => stage.status === "active"); if (!current || current.key !== requestedStageKey) return res.status(409).json({ status: "error", message: "يمكن تحديث المرحلة الحالية فقط." });
    if (req.body.action === "delayed") { current.delayReason = current.key === "pendingLaserDownload" ? "برجاء تنزيل اللوحة إلى الليزر بأقصى سرعة" : String(req.body.reason || ""); current.delayDetails = String(req.body.details || ""); current.delayedAt = new Date(); current.delayedBy = req.user._id; }
    else if (req.body.action === "completed") { const index = stages.indexOf(current.key); current.status = "completed"; current.completedAt = new Date(); current.completedBy = req.user._id; const nextStage = panel.manufacturing.stages[index + 1]; if (nextStage) { nextStage.status = "active"; nextStage.startedAt = new Date(); } }
    else return res.status(400).json({ status: "error", message: "اختر تمت أو لم تتم." });
    const active = panel.manufacturing.stages.find((stage) => stage.status === "active"); const nextStatus = active?.key || "completed";
    const stageHistory = { ...history(req, panel.status, nextStatus, `stage:${req.body.action}`, notes), stageKey: current.key, reason: String(req.body.reason || "").trim(), details: String(req.body.details || "").trim() };
    const nextProductionNotes = req.body.action === "completed" ? "" : notes;
    const saved = await panels.update({ _id: panel._id }, { status: nextStatus, "manufacturing.productionNotes": nextProductionNotes, "manufacturing.stages": panel.manufacturing.stages, $push: { statusHistory: stageHistory } }); if (nextStatus === "completed") await refreshProjectCompletion(panel.projectId); const project = await loadProject(panel.projectId);
    await createInternalNotifications({ userIds: [project.marketingId], roles: ["MarketingManager", "OwnerManager"], excludeUserId: req.user._id, project, panel: saved, type: req.body.action === "delayed" ? "productionDelayed" : "productionStageCompleted", title: req.body.action === "delayed" ? "تأخير في مرحلة الإنتاج" : "تم تحديث مرحلة الإنتاج", body: `${saved.panelName} — ${req.body.action === "delayed" ? (current.delayReason || "توجد متابعة مطلوبة") : (nextStatus === "completed" ? "اكتمل تنفيذ اللوحة" : `بدأت مرحلة ${nextStatus}`)}`, actor: req.user });
    res.json({ status: "ok", panel: publicPanel(saved), project: await projectResponse(project) });
} catch (error) { next(error); } };

const downloadManufacturingArchive = async (req, res, next) => { try { const panel = await loadPanel(req.params.projectId, req.params.panelId); if (!panel) return res.status(404).json({ status: "error", message: "اللوحة غير موجودة." }); const files = panel.manufacturing?.files || []; if (!files.length) return res.status(404).json({ status: "error", message: "لا توجد ملفات تصنيع لتنزيلها." }); const entries = await Promise.all(files.map(async (file, index) => ({ name: `${index + 1}-${file.fileName}`, buffer: (await downloadStoredFile(file.storageFileId)).buffer, date: file.uploadedAt || new Date() }))); const archive = createZipArchive(entries); res.setHeader("Content-Type", "application/zip"); res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(`${panel.panelName || "panel"}-files.zip`)}`); res.send(archive); } catch (error) { next(error); } };

module.exports = { listAllPanels, listPanels, getPanel, createPanel, updatePanel, claimPanel, completeQuote, openEditing, submitEdits, cancelEdits, deletePanel, requestExecutionPdf, saveExecutionPdfDesign, uploadExecutionPdf: uploadTo("executionPdf"), downloadExecutionPdf: downloadFile("executionPdf"), deleteExecutionPdf: deleteFile("executionPdf"), finishExecutionPdf, skipExecutionPdf, requestExecutionPdfChanges, confirmExecution, requestDeliverySchedule, respondDeliverySchedule, uploadManufacturing: uploadTo("manufacturing"), downloadManufacturing: downloadFile("manufacturing"), downloadManufacturingArchive, deleteManufacturing: deleteFile("manufacturing"), finishManufacturing, updateStage };
