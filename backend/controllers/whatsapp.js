const crypto = require("crypto");
const users = require("../models/users");
const projects = require("../models/projects");
const panelsModel = require("../models/panels");
const counters = require("../models/counters");
const sessions = require("../models/whatsappSessions");
const messages = require("../models/whatsappMessages");
const systemConfiguration = require("../models/systemConfiguration");
const defaultProject = require("../utils/defaultProject");
const { parseWhatsappCommand } = require("../services/whatsappParser");
const { getWhatsappTemplates } = require("../utils/whatsappTemplates");
const {
    isValidWebhookSignature,
    markMessageAsRead,
    sendTextMessage,
    sendTemplateMessage,
    downloadMedia
} = require("../services/whatsappMeta");
const { uploadFile, deleteStoredFile } = require("../services/googleDrive");
const { normalizePhoneNumber } = require("../utils/phoneNumber");
const { createInternalNotifications } = require("../services/internalNotifications");
const {
    DRAWING_ENGINEER_ROLES,
    PRODUCTION_CONTROL_ROLES,
    SUPERVISOR_STAGE_BY_ROLE,
    isDrawingEngineer,
    isProductionController,
    supervisorCanAccessStatus,
} = require("../utils/roles");
const {
    sendNewProjectAssigned,
    sendProjectUpdatedReview,
    sendExecutionPdfRequested,
    sendExecutionConfirmed
} = require("../services/projectWhatsappNotifications");

const SESSION_HOURS = 24;
const sameId = (first, second) => String(first || "") === String(second || "");
const projectReferenceCondition = (reference) => /^[a-f\d]{24}$/i.test(String(reference || ""))
    ? { _id: reference, isDeleted: false }
    : { projectCode: String(reference || "").trim().toUpperCase(), isDeleted: false };
const loadProjectWithPanels = async (condition) => {
    const project = await projects.select_one(condition);
    if (!project) return null;
    project.panels = await panelsModel.find({ projectId: project._id, isDeleted: false });
    return project;
};

const loadWhatsappTemplates = async () => {
    const config = await systemConfiguration.get();
    return getWhatsappTemplates(config?.whatsappTemplates);
};

const panelExample = `STARCO PANEL
السمك المطلوب: 0.7, 1, 1.5
نوع اللوحة: كنترول
اختر نوعًا واحدًا: كنترول / واتربروف / نمطي
هل يوجد نحاس: لا
اكتب: نعم أو لا
تفاصيل إضافية: اكتب التفاصيل هنا`;

const copperDetailsTemplate = `نوع المفاتيح:
الرئيسي:
الفرعيات:
تفاصيل إضافية للنحاس:`;

const normalizePanelType = (value) => {
    const normalized = String(value || "").trim().toLowerCase().replace(/[أإآ]/g, "ا");
    const compact = normalized.replace(/[.\-\s_]/g, "");
    if (["كنترول", "control"].includes(normalized)) return "كنترول";
    if (["وتربروف", "واتربروف", "وتر بروف", "waterproof"].includes(normalized)) return "وتربروف";
    if (["نمطي", "standard"].includes(normalized)) return "نمطي";
    if (["ont", "اونت"].includes(compact)) return "O.N.T";
    // الأنواع الجديدة التي يضيفها Owner Manager تظل مقبولة في WhatsApp؛
    // ربطها بكتالوج الإعدادات يتم بالاسم المخصص لها.
    return String(value || "").trim();
};

const panelTypeKeyFor = (panelType, panelTypes = []) =>
    panelTypes.find((item) => item.whatsappType === panelType)?.key
    || ({ "كنترول": "control", "واتربروف": "waterproof", "نمطي": "standard", "O.N.T": "ont" }[panelType] || "");

const panelRegistrationReply = (panel, session) => session.mode === "edit"
    ? `تم تجهيز تعديل لوحة ${session.selectedPanelIndex}. يمكنك اختيار لوحة أخرى برسالة: رقم اللوحة: 2، أو أرسل «تم» لحفظ التعديلات.`
    : `تم تسجيل لوحة: ${panel.panelName}. أرسل الآن كل الصور والتسجيلات والتفاصيل الخاصة بها.`;

const panelInstructions = (templates) => [
    `تم بدء المشروع بنجاح. أرسل بيانات اللوحة بالشكل التالي، ثم أرسل الصور والتسجيلات الخاصة بها. عند إنهاء جميع اللوحات أرسل: تم\n\nمثال:\n${panelExample}`,
    templates.panel
];

const singleLine = (value) => String(value || "").replace(/[\r\n]+/g, " ").trim();

const editPanelReply = (panel, panelNumber) => {
    const thicknesses = panel.requestedThicknesses || panel.thickness || [];
    const details = panel.details ?? panel.additionalDetails ?? "";
    const hasCopper = panel.hasCopper === true ? "نعم" : panel.hasCopper === false ? "لا" : "";
    return [
        `هذه هي بيانات لوحة ${panelNumber}. عدّل السطر الذي تريده ثم أرسل رسالة البيانات كاملة.`,
        `STARCO PANEL\nالسمك المطلوب: ${thicknesses.join(", ")}\nنوع اللوحة: ${singleLine(panel.panelType)}\nهل يوجد نحاس: ${hasCopper}\nتفاصيل إضافية: ${singleLine(details)}`
    ];
};

const gettingStartedReplies = async () => {
    const templates = await loadWhatsappTemplates();
    return [
        "هذه الرسالة لا تتبع صيغة نظام STARCO. لبدء مشروع جديد استخدم الشكل التالي:\n\nمثال:\nSTARCO START\nاسم العميل: شركة ستاركو",
        templates.startProject
    ];
};

const linkedManagerCanUploadForMarketer = async (marketer, senderPhone) => {
    if (!marketer?.accountCreatedBy || marketer.phoneNumber) return false;
    const manager = await users.select_one({
        _id: marketer.accountCreatedBy,
        phoneNumber: normalizePhoneNumber(senderPhone),
        role: { $in: ["OwnerManager", "MarketingManager"] },
        approved: true,
        isDeleted: false
    });
    if (!manager) return false;
    const managerGroupId = manager.accountGroupId || manager._id;
    const marketerGroupId = marketer.accountGroupId || marketer._id;
    return sameId(managerGroupId, marketerGroupId);
};

const canSenderAttachToProject = async (project, marketer, senderPhone, { allowLinkedManager = false } = {}) => {
    if (!project?.marketingId) return false;
    const projectMarketer = await users.select_one({
        _id: project.marketingId,
        role: "Marketer",
        approved: true,
        isDeleted: false
    });
    const directOwner = Boolean(
        marketer
        && sameId(marketer._id, projectMarketer?._id)
        && normalizePhoneNumber(marketer.phoneNumber) === normalizePhoneNumber(senderPhone)
        && projectMarketer?.phoneNumber
        && normalizePhoneNumber(projectMarketer.phoneNumber) === normalizePhoneNumber(senderPhone)
    );
    if (directOwner) return true;
    return Boolean(
        allowLinkedManager
        && sameId(marketer?._id, projectMarketer?._id)
        && await linkedManagerCanUploadForMarketer(projectMarketer, senderPhone)
    );
};

const resolveLinkedMediaMarketer = async ({ command, activeSession, senderPhone }) => {
    let marketerId = activeSession?.mode === "media" ? activeSession.marketingRepId : null;
    if (!marketerId && command?.type === "media") {
        const targetProject = await loadProjectWithPanels(projectReferenceCondition(command.projectId));
        marketerId = targetProject?.marketingId;
    }
    if (!marketerId) return null;
    const marketer = await users.select_one({
        _id: marketerId,
        role: "Marketer",
        approved: true,
        isDeleted: false
    });
    return await linkedManagerCanUploadForMarketer(marketer, senderPhone) ? marketer : null;
};

const normalizeReplies = (reply) => Array.isArray(reply) ? reply : [reply];
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const sendSafeText = async (to, body, projectId = null) => {
    try {
        await sendTextMessage(to, body);
    } catch (error) {
        console.error("WhatsApp reply failed:", error.message);
    }
};

const verifyWebhook = (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
        return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
};

const extractText = (message) => {
    if (message.type === "text") return message.text?.body || "";
    if (message.type === "button") return message.button?.text || "";
    if (message.type === "interactive") {
        return message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || "";
    }
    return "";
};

const parseStageReply = (value) => {
    const normalized = String(value || "").trim().toLowerCase().replace(/[أإآ]/g, "ا");
    if (["نعم", "ايوه", "yes", "true"].includes(normalized)) return true;
    if (["لا", "لأ", "no", "false"].includes(normalized)) return false;
    return null;
};

const handleProductionStageReply = async ({ message, senderPhone, text }) => {
    const contextMessageId = message.context?.id;
    const answer = parseStageReply(text);
    if (!contextMessageId || answer === null) return false;

    const outbound = await messages.findByProviderMessageId(contextMessageId);
    if (outbound?.type !== "production_stage_check" || !outbound.projectId || !outbound.panelId) return false;
    if (normalizePhoneNumber(outbound.recipientPhone) !== normalizePhoneNumber(senderPhone)) return false;

    const responderCandidates = await users.selectall({ phoneNumber: normalizePhoneNumber(senderPhone), approved: true, isDeleted: false });
    if (!responderCandidates.length) {
        await sendSafeText(senderPhone, "هذا الرقم غير مربوط بحساب مدير معتمد في نظام STARCO.");
        return true;
    }

    const project = await projects.select_one({ _id: outbound.projectId, isDeleted: false });
    const panel = project && await panelsModel.findOne({ _id: outbound.panelId, projectId: project._id, isDeleted: false });
    if (!project || !panel?.manufacturing) {
        await sendSafeText(senderPhone, "تعذر العثور على اللوحة المرتبطة برسالة المتابعة.");
        return true;
    }

    await messages.create({
        providerMessageId: message.id,
        direction: "inbound",
        projectId: project._id,
        panelId: panel._id,
        senderPhone,
        type: "production_stage_reply",
        text,
        status: "processed",
        rawPayload: message
    });

    const stageName = outbound.rawPayload?.stageName || "";
    const stageKey = outbound.rawPayload?.stageKey || "";
    const waitingForEngineer = stageKey === "manufacturingFilesDueAt";
    const responder = responderCandidates.find((candidate) => waitingForEngineer
        ? (candidate.role === "OwnerManager" || (isDrawingEngineer(candidate) && sameId(panel.engineerId, candidate._id)))
        : (candidate.role === "OwnerManager" || isProductionController(candidate) || supervisorCanAccessStatus(candidate, panel.status))) || responderCandidates[0];
    const responderAllowed = waitingForEngineer
        ? (responder.role === "OwnerManager" || (isDrawingEngineer(responder) && sameId(panel.engineerId, responder._id)))
        : (responder.role === "OwnerManager" || isProductionController(responder) || supervisorCanAccessStatus(responder, panel.status));
    if (!responderAllowed) {
        await sendSafeText(senderPhone, "هذا الحساب لا يملك صلاحية تحديث المرحلة المرتبطة بهذه الرسالة.");
        return true;
    }
    const stageRows = (panel.manufacturing.stages || []).map((stage) => stage.toObject?.() || stage);
    const active = stageRows.find((stage) => stage.status === "active");
    if ((waitingForEngineer && panel.status !== "manufacturingFilesPending") || (!waitingForEngineer && (!active || active.key !== stageKey))) {
        await sendSafeText(senderPhone, `تم تحديث «${stageName || "هذه المرحلة"}» بالفعل، لذلك لم نغيّر حالة اللوحة من هذا الرد القديم.`);
        return true;
    }

    if (!answer) {
        const delayReason = waitingForEngineer
            ? "لم يتم رفع ملفات التصنيع حتى الآن"
            : active.key === "pendingLaserDownload"
                ? "برجاء تنزيل اللوحة إلى الليزر بأقصى سرعة"
                : "بانتظار تحديد سبب التأخير";
        if (active) { active.delayReason = delayReason; active.delayedAt = new Date(); active.delayedBy = responder._id; }
        await panelsModel.update({ _id: panel._id }, {
            ...(active ? { "manufacturing.stages": stageRows } : {}),
            "manufacturing.productionNotes": delayReason,
            $push: { statusHistory: { from: panel.status, to: panel.status, action: "stage:delayed", note: delayReason, stageKey, reason: delayReason, actorId: responder._id, actorName: responder.name || "", actorRole: responder.role, createdAt: new Date() } }
        });
        await createInternalNotifications({ userIds: [project.marketingId], roles: ["MarketingManager", "OwnerManager"], excludeUserId: responder._id, project, panel, type: "productionDelayed", title: "تأخير في مرحلة الإنتاج", body: `${panel.panelName} — ${delayReason}`, actor: responder });
        const link = `${String(process.env.FRONTEND_URL || "").replace(/\/$/, "")}/projects/${project._id}`;
        await sendSafeText(senderPhone, `تم تسجيل وجود تأخير في «${stageName}». افتح المشروع واختر سبب التأخير من القائمة:\n${link}`);
        return true;
    }

    if (waitingForEngineer) {
        if (!(panel.manufacturing.files || []).length) {
            await sendSafeText(senderPhone, `لا توجد ملفات تصنيع مرفوعة للوحة «${panel.panelName}» حتى الآن. ارفع الملفات من المشروع أولًا، ثم أجب عن رسالة المتابعة.`);
            return true;
        }
        const stages = ["pendingLaserDownload", "laser", "manufacturing", "painting", "assembly"].map((key, index) => ({ key, status: index === 0 ? "active" : "pending", startedAt: index === 0 ? new Date() : null }));
        const saved = await panelsModel.update({ _id: panel._id }, { status: "manufacturingFilesReady", "manufacturing.stages": stages, "manufacturing.engineerReminderAt": null, "manufacturing.productionNotes": "", $push: { statusHistory: { from: panel.status, to: "manufacturingFilesReady", action: "manufacturingFilesConfirmedByWhatsapp", stageKey, actorId: responder._id, actorName: responder.name || "", actorRole: responder.role, createdAt: new Date() } } });
        await createInternalNotifications({ roles: [...PRODUCTION_CONTROL_ROLES, "LaserSupervisor", "OwnerManager"], excludeUserId: responder._id, project, panel: saved, type: "manufacturingFilesReady", title: "ملفات تصنيع اللوحة جاهزة", body: `${panel.panelName} — برجاء تنزيل الملفات إلى الليزر`, actor: responder });
        await sendSafeText(senderPhone, `تم تأكيد جاهزية ملفات تصنيع اللوحة «${panel.panelName}». بدأت الآن متابعة تنزيل الملفات إلى الليزر.`);
        return true;
    }

    const current = active; const currentIndex = stageRows.indexOf(current);
    current.status = "completed"; current.completedAt = new Date(); current.completedBy = responder._id;
    const nextStage = stageRows[currentIndex + 1]; if (nextStage) { nextStage.status = "active"; nextStage.startedAt = new Date(); }
    const nextStatus = nextStage?.key || "completed";
    const saved = await panelsModel.update({ _id: panel._id }, { status: nextStatus, "manufacturing.stages": stageRows, "manufacturing.lastReminderAt": null, "manufacturing.productionNotes": "", $push: { statusHistory: { from: panel.status, to: nextStatus, action: "stage:completed", stageKey: current.key, actorId: responder._id, actorName: responder.name || "", actorRole: responder.role, createdAt: new Date() } } });
    if (nextStatus === "completed") {
        const projectPanels = await panelsModel.find({ projectId: project._id, isDeleted: false });
        if (projectPanels.length && projectPanels.every((projectPanel) => projectPanel.status === "completed")) await projects.update({ _id: project._id }, { status: "completed" });
    }
    const stageLabels = { pendingLaserDownload: "تنزيل الملفات إلى الليزر", laser: "مرحلة الليزر", manufacturing: "مرحلة التصنيع", painting: "مرحلة الرش", assembly: "مرحلة التجميع" };
    const resultText = nextStatus === "completed" ? "اكتمل تنفيذ اللوحة" : `بدأت ${stageLabels[nextStatus] || nextStatus}`;
    await createInternalNotifications({ userIds: [project.marketingId], roles: ["MarketingManager", "OwnerManager"], excludeUserId: responder._id, project, panel: saved, type: "productionStageCompleted", title: "تم تحديث مرحلة الإنتاج", body: `${panel.panelName} — ${resultText}`, actor: responder });
    const nextSupervisorRole = Object.entries(SUPERVISOR_STAGE_BY_ROLE).find(([, statuses]) => statuses.includes(nextStatus))?.[0];
    if (nextSupervisorRole) await createInternalNotifications({ roles: [nextSupervisorRole], excludeUserId: responder._id, project, panel: saved, type: "productionStageReady", title: "لوحة جديدة في مرحلتك", body: `${panel.panelName} — ${resultText}`, actor: responder });
    await sendSafeText(senderPhone, `تم تسجيل اكتمال «${stageName}» للوحة «${panel.panelName}». ${resultText}.`);
    return true;
};

const mediaFromMessage = (message) => {
    const media = message[message.type];
    if (!media?.id) return null;
    return { providerMediaId: media.id, mimeType: media.mime_type || null };
};

const mediaExtension = (mimeType) => ({
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "audio/ogg": "ogg",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "video/mp4": "mp4",
    "application/pdf": "pdf"
}[mimeType] || "bin");

const savePanelMediaToGoogleDrive = async (message, media) => {
    const downloaded = await downloadMedia(media.providerMediaId);
    const uniqueStamp = `${new Date().toISOString().replace(/[:.]/g, "-")}-${Date.now()}`;
    const fileName = `whatsapp-${uniqueStamp}-${message.id}.${mediaExtension(downloaded.mimeType)}`;
    const uploaded = await uploadFile({
        fileName,
        mimeType: downloaded.mimeType,
        buffer: downloaded.buffer
    });

    return {
        fileName: uploaded.name || fileName,
        fileSize: Number(uploaded.size) || downloaded.fileSize || downloaded.buffer.length,
        storageProvider: "google-drive",
        storageFileId: uploaded.id,
        uploadedAt: new Date()
    };
};

const getActiveSession = (senderPhone) => sessions.findActiveByPhone(senderPhone);

const validateStart = (command) => {
    if (!command.clientName) return "اكتب اسم العميل في سطر: اسم العميل: ...";
    return null;
};

const validatePanel = (command, session) => {
    if (session.mode === "edit") {
        if (!session.selectedPanelIndex) return "حدد رقم اللوحة أولًا، مثل: رقم اللوحة: 1";
    }
    if (!command.thicknesses.length) return "اكتب السمك هكذا: السمك المطلوب: 0.7, 1, 1.5";
    if (!normalizePanelType(command.panelType)) return "اكتب نوع اللوحة هكذا: كنترول أو واتربروف أو نمطي";
    if (command.hasCopper === null) return "اكتب هل يوجد نحاس هكذا: هل يوجد نحاس: نعم أو لا";
    return null;
};

const createProjectFromSession = async (session) => {
    const systemConfig = await systemConfiguration.get();
    if (!systemConfig) throw new Error("System configuration not found");

    const baseProject = defaultProject();
    const configuredPanelPrices = systemConfig.prices || {};
    const year = new Date().getFullYear();
    const projectCode = `PRJ-${year}-${String(await counters.next(`project-${year}`)).padStart(6, "0")}`;
    const project = await projects.create({
        projectCode,
        marketingId: session.marketingRepId,
        status: "created",
        client: {
            ...baseProject.client,
            name: session.client.name,
            type: session.client.type
        },
        prices: {
            sheetPrice: systemConfig.sheetPrice ?? baseProject.prices.sheetPrice,
            paintPrice: systemConfig.paintPrice ?? baseProject.prices.paintPrice
        },
        source: "whatsapp",
        panelIds: []
    });
    const createdPanels = await Promise.all(session.panels.map((panel, index) => {
            const basePanel = JSON.parse(JSON.stringify(baseProject.panels[0]));
            const typeConfig = (systemConfig.panelTypes || []).find((item) => item.key === panelTypeKeyFor(panel.panelType, systemConfig.panelTypes));
            return panelsModel.create({
                projectId: project._id,
                panelCode: `${projectCode}-P${String(index + 1).padStart(2, "0")}`,
                sequence: index + 1,
                source: "whatsapp",
                status: "pendingPricing",
                marketerSaved: true,
                marketingId: session.marketingRepId,
                panelName: panel.panelName || `لوحة ${index + 1}`,
                marketerData: {
                    thickness: panel.requestedThicknesses,
                    panelType: panel.panelType,
                    panelTypeKey: typeConfig?.key || panelTypeKeyFor(panel.panelType, systemConfig.panelTypes),
                    hasCopper: panel.hasCopper,
                    additionalDetails: panel.details,
                    controlInstallation: panel.controlInstallation || "",
                    copperDetails: panel.copperDetails || {}
                },
                pricing: { parts: (typeConfig?.parts || []).map((part) => ({ name: part.name, quantity: part.quantity || 1 })), prices: {
                    ...basePanel.prices,
                    manufacturing: typeConfig?.prices?.manufacturing ?? configuredPanelPrices.manufacturing ?? basePanel.prices.manufacturing,
                    locks: typeConfig?.prices?.locks ?? configuredPanelPrices.locks ?? basePanel.prices.locks,
                    hinges: typeConfig?.prices?.hinges ?? configuredPanelPrices.hinges ?? basePanel.prices.hinges,
                    transport: typeConfig?.prices?.transport ?? configuredPanelPrices.transport ?? basePanel.prices.transport,
                    screws: typeConfig?.prices?.screws ?? configuredPanelPrices.screws ?? basePanel.prices.screws,
                    stretch: typeConfig?.prices?.stretch ?? configuredPanelPrices.stretch ?? basePanel.prices.stretch
                } },
                statusHistory: [{ from: "draft", to: "pendingPricing", action: "whatsappProjectSubmitted", actorId: session.marketingRepId, actorRole: "Marketer" }]
            });
        }));
    const saved = await projects.update({ _id: project._id }, { panelIds: createdPanels.map((panel) => panel._id) });
    saved.panels = createdPanels;
    return saved;
};

const updateProjectFromSession = async (session) => {
    const targetProject = await projects.select_one({
        _id: session.targetProjectId,
        marketingId: session.marketingRepId,
        isDeleted: false
    });
    if (!targetProject) return null;

    const storedPanels = await panelsModel.find({ projectId: targetProject._id, isDeleted: false });
    await Promise.all(storedPanels.map((existingPanel, index) => {
        const incomingPanel = session.panels.find((panel) => panel.targetPanelIndex === index + 1);
        if (!incomingPanel) return null;
        return panelsModel.update({ _id: existingPanel._id }, {
            status: "pendingPricing",
            engineerId: null,
            panelName: existingPanel.panelName,
            marketerData: {
                ...(existingPanel.marketerData?.toObject?.() || existingPanel.marketerData || {}),
                thickness: incomingPanel.requestedThicknesses,
                panelType: incomingPanel.panelType,
                panelTypeKey: incomingPanel.panelTypeKey || existingPanel.marketerData?.panelTypeKey || "",
                hasCopper: incomingPanel.hasCopper,
                additionalDetails: incomingPanel.details,
                controlInstallation: incomingPanel.controlInstallation || "",
                copperDetails: incomingPanel.copperDetails || {}
            }
        });
    }));
    const saved = await projects.update_whatsapp_project(targetProject._id, { status: "inProgress", source: "whatsapp", updatedAt: Date.now() });
    saved.panels = await panelsModel.find({ projectId: targetProject._id, isDeleted: false });
    return saved;
};

const attachMessagesToProject = async (session, project) => {
    const panelMap = new Map(
        session.panels.map((panel, index) => [
            panel.localPanelKey,
            ["edit", "media"].includes(session.mode)
                ? project.panels[panel.targetPanelIndex - 1]?._id
                : project.panels[index]?._id
        ])
    );
    const incomingMessages = await messages.findBySession(session._id);

    await Promise.all(incomingMessages.map(async (message) => {
        const panelId = panelMap.get(message.panelLocalKey) || null;
        await messages.updateByProviderMessageId(message.providerMessageId, {
            projectId: project._id,
            panelId,
            status: "attached"
        });
        if (panelId && message.media?.storageFileId) {
            await panelsModel.update({ _id: panelId, projectId: project._id }, { $addToSet: { attachments: {
                storageFileId: message.media.storageFileId,
                fileName: message.media.fileName || `whatsapp-${message._id}`,
                mimeType: message.media.mimeType || "application/octet-stream",
                fileSize: Number(message.media.fileSize || 0),
                uploadedAt: message.media.uploadedAt || new Date(),
                uploadedBy: session.marketingRepId
            } } });
        }
    }));
};

const projectCreatedReply = (project) => {
    const baseUrl = (process.env.FRONTEND_URL || "").replace(/\/$/, "");
    return [
        `تم إنشاء المشروع بنجاح.\nالرابط: ${baseUrl}/projects/${project._id}\n\nلتعديل المشروع عبر WhatsApp، انسخ الرسالة التالية وأرسلها:`,
        `STARCO EDIT #${project._id}`
    ];
};

const projectUpdatedReply = (project) => {
    const baseUrl = (process.env.FRONTEND_URL || "").replace(/\/$/, "");
    return `تم تعديل المشروع بنجاح.\nالرابط: ${baseUrl}/projects/${project._id}`;
};

const notifyAssignedEngineerOfMarketingEdit = async (project) => {
    if (!project?.engineerId) return;

    const engineer = await users.select_one({
        _id: project.engineerId,
        approved: true,
        isDeleted: false
    });
    if (!engineer?.phoneNumber) return;
    const marketer = await users.select_one({
        _id: project.marketingId,
        approved: true,
        isDeleted: false
    });

    try {
        await sendProjectUpdatedReview(engineer.phoneNumber, project, marketer?.name || "غير محدد");
    } catch (error) {
        console.error("WhatsApp project update template failed:", error.message);
    }
};

const notifyEngineersOfNewProject = async (project) => {
    const marketer = await users.select_one({
        _id: project.marketingId,
        approved: true,
        isDeleted: false
    });
    const engineers = await users.selectall({
        role: { $in: DRAWING_ENGINEER_ROLES },
        approved: true,
        isDeleted: false,
        phoneNumber: { $nin: [null, ""] }
    });
    const results = await Promise.allSettled(
        engineers.map((engineer) => sendNewProjectAssigned(
            engineer.phoneNumber,
            project,
            marketer?.name || "غير محدد"
        ))
    );
    results.forEach((result) => {
        if (result.status === "rejected") {
            console.error("WhatsApp new project template failed:", result.reason?.message || result.reason);
        }
    });
};

const finishSession = async (session, inboundMessage) => {
    if (session.mode === "media") {
        const targetProject = await projects.select_one({
            _id: session.targetProjectId,
            marketingId: session.marketingRepId,
            isDeleted: false
        });
        if (!targetProject) return { error: "تعذر العثور على المشروع أو لا تملك صلاحية إضافة المرفقات إليه." };
        targetProject.panels = await panelsModel.find({ projectId: targetProject._id, isDeleted: false });

        const sessionMessages = await messages.findBySession(session._id);
        const unuploadedMedia = sessionMessages.filter((message) => message.media?.providerMediaId && !message.media?.storageFileId);
        if (unuploadedMedia.length) {
            const failedUploads = unuploadedMedia.filter((message) => message.status === "media_upload_failed").length;
            return failedUploads
                ? { error: `تعذر رفع ${failedUploads} ملف إلى التخزين. لم يتم حفظ المرفقات.` }
                : { waiting: unuploadedMedia.length };
        }
        const finalizingSession = await sessions.claimForFinalization(session._id);
        if (!finalizingSession) return { finalizing: true };
        await attachMessagesToProject(finalizingSession, targetProject);
        await sessions.updateById(finalizingSession._id, {
            status: "finished",
            finishedByMessageId: inboundMessage.id,
            createdProjectId: targetProject._id,
            activePanelKey: null
        });
        return { project: targetProject, mediaOnly: true };
    }
    if (!session.panels.length) {
        return { error: "لا يمكن إنهاء المشروع قبل إرسال لوحة واحدة على الأقل." };
    }

    const missingControlInstallation = session.panels.find((panel) =>
        panel.panelType === "كنترول" && !String(panel.controlInstallation || "").trim()
    );
    if (missingControlInstallation) {
        return { error: `يرجى تحديد تركيب ${missingControlInstallation.panelName}: دفن أو عادية، قبل إنهاء المشروع.` };
    }

    const missingCopperDetails = session.panels.find((panel) => {
        const copper = panel.copperDetails || {};
        return panel.hasCopper === true && (!copper.switches?.trim() || !copper.main?.trim() || !copper.branches?.trim());
    });
    if (missingCopperDetails) {
        return { error: `يرجى استكمال بيانات النحاس للوحة ${missingCopperDetails.panelName} قبل إنهاء المشروع.\n\n${copperDetailsTemplate}` };
    }

    // A project must never be created while one of its WhatsApp attachments
    // has not reached the configured storage provider.  This also prevents a
    // failed Drive upload from being hidden behind a successful FINISH reply.
    const sessionMessages = await messages.findBySession(session._id);
    const unuploadedMedia = sessionMessages.filter((message) =>
        message.media?.providerMediaId && !message.media?.storageFileId
    );

    if (unuploadedMedia.length) {
        const failedUploads = unuploadedMedia.filter(
            (message) => message.status === "media_upload_failed"
        ).length;
        if (failedUploads) {
            return {
                error: `تعذر رفع ${failedUploads} ملف إلى التخزين. لم يتم إنشاء المشروع حتى لا تضيع المرفقات.`
            };
        }

        return { waiting: unuploadedMedia.length };
    }

    // Two uploads may finish at nearly the same time. Only the first request
    // is allowed to claim and create the project.
    const finalizingSession = await sessions.claimForFinalization(session._id);
    if (!finalizingSession) return { finalizing: true };

    const project = ["edit", "media"].includes(finalizingSession.mode)
        ? await updateProjectFromSession(finalizingSession)
        : await createProjectFromSession(finalizingSession);
    if (!project) {
        await sessions.updateById(finalizingSession._id, { status: "collecting" });
        return { error: "تعذر العثور على المشروع المطلوب تعديله." };
    }
    await attachMessagesToProject(finalizingSession, project);
    await sessions.updateById(finalizingSession._id, {
        status: "finished",
        finishedByMessageId: inboundMessage.id,
        createdProjectId: project._id,
        activePanelKey: null
    });
    if (finalizingSession.mode === "edit") {
        await notifyAssignedEngineerOfMarketingEdit(project);
    } else if (finalizingSession.mode !== "media") {
        await notifyEngineersOfNewProject(project);
    }
    return { project };
};

// FINISH is sent once. When the last media upload completes, this creates the
// project and sends its result automatically without another WhatsApp command.
const completeRequestedFinishIfReady = async (sessionId) => {
    const session = await sessions.findById(sessionId);
    if (!session || session.status !== "collecting" || !session.finishRequestedByMessageId) return;

    const result = await finishSession(session, { id: session.finishRequestedByMessageId });
    if (result.project) {
        const replies = session.mode === "media"
            ? ["تم حفظ الصور والتسجيلات في المشروع بنجاح. ارجع إلى صفحة المشروع في الموقع وستجدها مضافة."]
            : session.mode === "edit"
            ? [projectUpdatedReply(result.project)]
            : projectCreatedReply(result.project);
        for (const body of replies) {
            await sendSafeText(session.senderPhone, body);
        }
    } else if (result.error) {
        await sendSafeText(session.senderPhone, result.error);
    }
};

const handleCommand = async ({ command, senderPhone, marketer, inboundMessage }) => {
    const templates = await loadWhatsappTemplates();

    if (command.type === "execution-pdf") {
        const targetProject = await loadProjectWithPanels({ _id: command.projectId, isDeleted: false });
        const ownsProject = targetProject && await canSenderAttachToProject(targetProject, marketer, senderPhone);
        if (!targetProject || !ownsProject) return "لم يتم العثور على مشروع بهذا ID تابع لك.";
        if (!targetProject.previewGeneratedAt) return "عرض السعر لم يُعتمد أو يُرسل من المهندس بعد. انتظر إشعار جاهزية المشروع أولًا.";
        if (!command.panelNumber || command.panelNumber > targetProject.panels.length) {
            return `رقم اللوحة غير صحيح. هذا المشروع يحتوي على ${targetProject.panels.length} لوحة.`;
        }
        const panel = targetProject.panels[command.panelNumber - 1];
        if (panel.status !== "quoteCompleted") return "يجب إتمام عرض سعر اللوحة أولًا قبل إصدار أمر PDF التنفيذ.";
        const savedPanel = await panelsModel.update({ _id: panel._id }, { status: "executionPdfRequested", "executionPdf.requestedAt": new Date(), "executionPdf.requestedBy": marketer._id });
        const updatedProject = targetProject;
        const assignedEngineer = panel.engineerId
            ? await users.select_one({ _id: panel.engineerId, approved: true, isDeleted: false })
            : null;
        const engineers = assignedEngineer?.phoneNumber ? [assignedEngineer] : await users.selectall({ role: { $in: DRAWING_ENGINEER_ROLES }, approved: true, isDeleted: false, phoneNumber: { $nin: [null, ""] } });
        const managers = await users.selectall({ role: "OwnerManager", approved: true, isDeleted: false, phoneNumber: { $nin: [null, ""] } });
        const recipients = [...engineers, ...managers].filter((recipient, index, all) => {
            const phone = String(recipient.phoneNumber || "").replace(/\D/g, "");
            return phone && all.findIndex((item) => String(item.phoneNumber || "").replace(/\D/g, "") === phone) === index;
        });
        const results = await Promise.allSettled(recipients.map((recipient) =>
            sendExecutionPdfRequested(recipient.phoneNumber, updatedProject, savedPanel.panelName)
        ));
        const sentCount = results.filter((result) => result.status === "fulfilled").length;
        return sentCount
            ? `تم إصدار أمر PDF التنفيذ للوحة «${panel.panelName}» وإشعار المسؤولين.`
            : `تم إصدار أمر PDF التنفيذ للوحة «${panel.panelName}»، لكن تعذر إرسال إشعار WhatsApp.`;
    }

    if (command.type === "execution-decision") {
        const targetProject = await loadProjectWithPanels({ _id: command.projectId, isDeleted: false });
        const ownsProject = targetProject && await canSenderAttachToProject(targetProject, marketer, senderPhone);
        if (!targetProject || !ownsProject) return "لم يتم العثور على مشروع بهذا ID تابع لك.";
        if (!command.panelNumber || command.panelNumber > targetProject.panels.length) return `رقم اللوحة غير صحيح. هذا المشروع يحتوي على ${targetProject.panels.length} لوحة.`;
        const panel = targetProject.panels[command.panelNumber - 1];
        if (panel.status !== "executionPdfReady") return "يجب تجهيز PDF التنفيذ أو تخطيه أولًا.";

        if (command.decision === "changes") {
            const files = [...(panel.executionPdf?.files || [])];
            await panelsModel.update({ _id: panel._id }, { status: "editing", "executionPdf.files": [] });
            const updatedProject = targetProject;
            await Promise.allSettled(files.map((file) => deleteStoredFile(file.storageFileId)));
            const assignedEngineer = panel.engineerId ? await users.select_one({ _id: panel.engineerId, approved: true, isDeleted: false }) : null;
            const engineers = assignedEngineer?.phoneNumber ? [assignedEngineer] : await users.selectall({ role: { $in: DRAWING_ENGINEER_ROLES }, approved: true, isDeleted: false, phoneNumber: { $nin: [null, ""] } });
            await Promise.allSettled(engineers.map((engineer) => sendProjectUpdatedReview(engineer.phoneNumber, updatedProject, marketer.name || "غير محدد")));
            return `تم فتح مشروع اللوحة «${panel.panelName}» للتعديل مع الاحتفاظ بجميع بيانات التسعير.`;
        }

        await panelsModel.update({ _id: panel._id }, { status: "manufacturingFilesPending", "executionPdf.confirmedAt": new Date(), "executionPdf.confirmedBy": marketer._id });
        const updatedProject = targetProject;
        const assignedEngineer = panel.engineerId ? await users.select_one({ _id: panel.engineerId, approved: true, isDeleted: false }) : null;
        const engineers = assignedEngineer?.phoneNumber ? [assignedEngineer] : await users.selectall({ role: { $in: DRAWING_ENGINEER_ROLES }, approved: true, isDeleted: false, phoneNumber: { $nin: [null, ""] } });
        await Promise.allSettled(engineers.map((engineer) => sendExecutionConfirmed(engineer.phoneNumber, updatedProject, panel.panelName)));
        return `تم تأكيد تنفيذ اللوحة «${panel.panelName}» وفتح مرحلة رفع ملفات التصنيع.`;
    }

    if (command.type === "media") {
        if (await getActiveSession(senderPhone)) {
            return "لديك جلسة مفتوحة بالفعل. أنهِها برسالة «تم» أو ألغِها برسالة STARCO DELETE قبل بدء رفع مرفقات جديدة.";
        }
        const targetProject = await loadProjectWithPanels(projectReferenceCondition(command.projectId));
        const ownsProject = targetProject && await canSenderAttachToProject(targetProject, marketer, senderPhone, { allowLinkedManager: true });
        if (!targetProject || !ownsProject) {
            return "لم يتم العثور على مشروع بهذا ID تابع لك.";
        }
        if (!command.panelNumber || command.panelNumber > targetProject.panels.length) {
            return `رقم اللوحة غير صحيح. هذا المشروع يحتوي على ${targetProject.panels.length} لوحة.`;
        }
        const targetPanel = targetProject.panels[command.panelNumber - 1];
        const mediaPanel = {
            localPanelKey: crypto.randomUUID(),
            sourceMessageId: inboundMessage.id,
            panelName: targetPanel.panelName || `لوحة ${command.panelNumber}`,
            targetPanelIndex: command.panelNumber,
            requestedThicknesses: [],
            panelType: targetPanel.marketerData?.panelType || "",
            hasCopper: targetPanel.marketerData?.hasCopper,
            details: ""
        };
        await sessions.create({
            senderPhone,
            marketingRepId: targetProject.marketingId,
            mode: "media",
            targetProjectId: targetProject._id,
            targetPanelCount: targetProject.panels.length,
            selectedPanelIndex: command.panelNumber,
            activePanelKey: mediaPanel.localPanelKey,
            panels: [mediaPanel],
            startedByMessageId: inboundMessage.id,
            expiresAt: new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000)
        });
        return "تم فتح استقبال المرفقات للوحة المحددة. أرسل الآن الصور والتسجيلات الصوتية، ثم أرسل «تم» أو «تمام» أو «خلصت» لحفظها في المشروع.";
    }

    if (command.type === "start") {
        const validationError = validateStart(command);
        if (validationError) return [`${validationError}\n\nمثال:\nSTARCO START\nاسم العميل: شركة ستاركو`, templates.startProject];
        if (await getActiveSession(senderPhone)) {
            return "لديك مشروع مفتوح بالفعل. أرسل «تم» لإنهائه أو STARCO DELETE لحذف الجلسة الحالية.";
        }

        const session = await sessions.create({
            senderPhone,
            marketingRepId: marketer._id,
            client: { name: command.clientName },
            startedByMessageId: inboundMessage.id,
            expiresAt: new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000)
        });
        return panelInstructions(templates);
    }

    if (command.type === "edit") {
        if (await getActiveSession(senderPhone)) {
            return "لديك مشروع مفتوح بالفعل. أنهِه أو ألغِه قبل بدء التعديل.";
        }
        const targetProject = await loadProjectWithPanels({
            _id: command.projectId,
            marketingId: marketer._id,
            isDeleted: false
        });
        if (!targetProject) return "لم يتم العثور على مشروع بهذا ID تابع لك.";

        const editSession = await sessions.create({
            senderPhone,
            marketingRepId: marketer._id,
            mode: "edit",
            targetProjectId: targetProject._id,
            targetPanelCount: targetProject.panels.length,
            client: {
                name: targetProject.client.name,
                type: targetProject.client.type
            },
            startedByMessageId: inboundMessage.id,
            expiresAt: new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000)
        });
        return [
            `تم فتح جلسة التعديل. هذا المشروع يحتوي على ${editSession.targetPanelCount} لوحة. اختر رقم اللوحة التي تريد تعديلها. مثال: رقم اللوحة: 1`,
            "رقم اللوحة:"
        ];
    }

    const session = await getActiveSession(senderPhone);
    if (!session) return gettingStartedReplies();

    if (command.type === "delete") {
        await sessions.updateById(session._id, { status: "cancelled", activePanelKey: null });
        return "تم حذف جلسة المشروع الحالية. لم يتم إنشاء أي مشروع، ويمكنك الآن بدء مشروع جديد برسالة STARCO START v1.";
    }

    if (command.type === "panel-selection") {
        if (session.mode !== "edit") {
            return "اختيار رقم اللوحة متاح أثناء تعديل مشروع فقط.";
        }
        if (!command.panelNumber || command.panelNumber > session.targetPanelCount) {
            return `رقم اللوحة غير صحيح. هذا المشروع يحتوي على ${session.targetPanelCount} لوحة.`;
        }

        const targetProject = await loadProjectWithPanels({
            _id: session.targetProjectId,
            marketingId: marketer._id,
            isDeleted: false
        });
        if (!targetProject) return "تعذر العثور على المشروع المطلوب تعديله.";

        const pendingPanel = session.panels.find((panel) => panel.targetPanelIndex === command.panelNumber);
        const existingProjectPanel = targetProject.panels[command.panelNumber - 1];
        const panel = pendingPanel || {
            localPanelKey: crypto.randomUUID(),
            sourceMessageId: inboundMessage.id,
            panelName: existingProjectPanel.panelName,
            targetPanelIndex: command.panelNumber,
            requestedThicknesses: existingProjectPanel.marketerData?.thickness || [],
            panelType: existingProjectPanel.marketerData?.panelType || "",
            hasCopper: existingProjectPanel.marketerData?.hasCopper,
            details: existingProjectPanel.marketerData?.additionalDetails || "",
            controlInstallation: existingProjectPanel.marketerData?.controlInstallation || "",
            copperDetails: existingProjectPanel.marketerData?.copperDetails || {}
        };
        const nextPanels = pendingPanel
            ? session.panels
            : [...session.panels, panel];
        await sessions.updateById(session._id, {
            panels: nextPanels,
            selectedPanelIndex: command.panelNumber,
            activePanelKey: panel.localPanelKey,
            expiresAt: new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000)
        });
        return editPanelReply(panel, command.panelNumber);
    }

    if (command.type === "control-installation" || command.type === "copper-details") {
        const panelIndex = session.mode === "edit"
            ? (session.selectedPanelIndex || 0) - 1
            : session.panels.length - 1;
        const currentPanel = session.panels[panelIndex];
        if (!currentPanel) return "أرسل بيانات لوحة أولًا باستخدام STARCO PANEL.";

        if (command.type === "control-installation") {
            if (currentPanel.panelType !== "كنترول") {
                return "تحديد التركيب مطلوب فقط للوحات الكنترول.";
            }
            const nextPanels = session.panels.map((panel, index) => index === panelIndex
                ? { ...(panel.toObject?.() || panel), controlInstallation: command.value }
                : panel
            );
            await sessions.updateById(session._id, { panels: nextPanels, expiresAt: new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000) });
            if (currentPanel.hasCopper === true) {
                return ["تم حفظ التركيب. الآن املأ الحقول التالية وأرسل القالب كاملًا:", copperDetailsTemplate];
            }
            return panelRegistrationReply(currentPanel, session);
        }

        if (currentPanel.hasCopper !== true) {
            return "بيانات النحاس مطلوبة فقط عندما تكون قيمة «هل يوجد نحاس» هي نعم.";
        }
        if (!command.switches || !command.main || !command.branches) {
            return ["يرجى ملء نوع المفاتيح والرئيسي والفرعيات كلها.", copperDetailsTemplate];
        }
        const nextPanels = session.panels.map((panel, index) => index === panelIndex
            ? { ...(panel.toObject?.() || panel), copperDetails: { switches: command.switches, main: command.main, branches: command.branches, notes: command.notes || "" } }
            : panel
        );
        await sessions.updateById(session._id, { panels: nextPanels, expiresAt: new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000) });
        return panelRegistrationReply(currentPanel, session);
    }

    if (command.type === "panel") {
        const validationError = validatePanel(command, session);
        if (validationError) return [
            `${validationError}\n\nمثال:\n${panelExample}`,
            templates.panel
        ];

        const duplicatePanel = session.panels.find((panel) => panel.sourceMessageId === inboundMessage.id);
        if (duplicatePanel) {
            return `تم تسجيل لوحة: ${duplicatePanel.panelName}. أرسل الآن كل الصور والتسجيلات والتفاصيل الخاصة بها.`;
        }

        const existingEdit = session.mode === "edit"
            ? session.panels.find((item) => item.targetPanelIndex === session.selectedPanelIndex)
            : null;
        const panel = {
            localPanelKey: existingEdit?.localPanelKey || crypto.randomUUID(),
            sourceMessageId: inboundMessage.id,
            panelName: existingEdit?.panelName || `لوحة ${session.panels.length + 1}`,
            targetPanelIndex: session.mode === "edit" ? session.selectedPanelIndex : null,
            requestedThicknesses: command.thicknesses,
            panelType: normalizePanelType(command.panelType),
            hasCopper: command.hasCopper,
            details: command.details || "",
            controlInstallation: existingEdit?.controlInstallation || "",
            copperDetails: existingEdit?.copperDetails || {}
        };
        const nextPanels = existingEdit
            ? session.panels.map((item) => item.targetPanelIndex === session.selectedPanelIndex ? panel : item)
            : [...session.panels, panel];
        await sessions.updateById(session._id, {
            panels: nextPanels,
            activePanelKey: panel.localPanelKey,
            expiresAt: new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000)
        });
        const replies = [];
        if (panel.panelType === "كنترول" && !panel.controlInstallation) {
            replies.push("لوحة الكنترول تحتاج تحديد التركيب أولًا. أرسل كلمة واحدة فقط: دفن أو عادية.");
        } else if (panel.hasCopper === true) {
            replies.push("اللوحة تحتوي على نحاس. املأ الحقول التالية وأرسل القالب كاملًا:", copperDetailsTemplate);
        } else {
            replies.push(panelRegistrationReply(panel, session));
        }
        return replies;
    }

    if (command.type === "finish") {
        // Persist the intent first. The short grace period lets WhatsApp
        // webhooks for media sent just before FINISH create their records.
        await sessions.updateById(session._id, {
            finishRequestedByMessageId: inboundMessage.id,
            finishRequestedAt: new Date(),
            expiresAt: new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000)
        });
        await wait(2000);
        const latestSession = await sessions.findById(session._id);
        const result = await finishSession(latestSession, inboundMessage);
        if (result.error) return result.error;
        if (result.waiting || result.finalizing) return [];
        if (session.mode === "media") return "تم حفظ الصور والتسجيلات في المشروع بنجاح. ارجع إلى صفحة المشروع في الموقع وستجدها مضافة.";
        return session.mode === "edit"
            ? projectUpdatedReply(result.project)
            : projectCreatedReply(result.project);
    }

    return gettingStartedReplies();
};

const handleIncomingMessage = async (message, value) => {
    const senderPhone = normalizePhoneNumber(message.from);
    if (await messages.findByProviderMessageId(message.id)) return;

    const text = extractText(message);
    const activatedAccount = await users.verifyPendingWhatsappOptInByPhone(senderPhone, message.id);
    if (activatedAccount) {
        try {
            await messages.create({
                providerMessageId: message.id,
                direction: "inbound",
                senderPhone,
                type: "whatsapp_opt_in",
                text: text || null,
                status: "processed",
                rawPayload: message
            });
        } catch (error) {
            if (error?.code === 11000) return;
            throw error;
        }
        markMessageAsRead(message.id).catch((error) => console.error("Could not mark message as read:", error.message));
        await sendSafeText(senderPhone, "تم تأكيد رقم WhatsApp لحسابك في STARCO. يمكنك الآن الرجوع إلى الموقع ومتابعة الدخول.");
        return;
    }
    const command = parseWhatsappCommand(text);
    const activeSession = await getActiveSession(senderPhone);

    markMessageAsRead(message.id).catch((error) => console.error("Could not mark message as read:", error.message));
    if (await handleProductionStageReply({ message, senderPhone, text })) return;
    const marketer = await users.select_marketer_by_phone(senderPhone)
        || await resolveLinkedMediaMarketer({ command, activeSession, senderPhone });
    if (!marketer) {
        await sendSafeText(senderPhone, "هذا الرقم غير مربوط بحساب مندوب معتمد في نظام STARCO.");
        return;
    }

    if (command) {
        try {
            await messages.create({
                providerMessageId: message.id,
                direction: "inbound",
                sessionId: activeSession?._id || null,
                senderPhone,
                type: "text",
                text: text || null,
                status: "command_received"
            });
        } catch (error) {
            if (error?.code === 11000) return;
            throw error;
        }
        const reply = await handleCommand({ command, senderPhone, marketer, inboundMessage: message });
        for (const body of normalizeReplies(reply)) {
            await sendSafeText(senderPhone, body);
        }
        return;
    }

    if (activeSession?.activePanelKey) {
        const media = mediaFromMessage(message);
        const inboundRecord = await messages.create({
            providerMessageId: message.id,
            direction: "inbound",
            sessionId: activeSession._id,
            panelLocalKey: activeSession.activePanelKey,
            senderPhone,
            type: message.type,
            text: text || null,
            media: media || undefined,
            status: "attached"
        });

        if (media?.providerMediaId) {
            try {
                const storedMedia = await savePanelMediaToGoogleDrive(message, media);
                await messages.updateByProviderMessageId(message.id, {
                    media: { ...media, ...storedMedia },
                    status: "stored"
                });
                await completeRequestedFinishIfReady(activeSession._id);
            } catch (error) {
                console.error("Google Drive media upload failed:", error.message);
                await messages.updateByProviderMessageId(message.id, {
                    "media.uploadError": error.message,
                    status: "media_upload_failed"
                });
                const latestSession = await sessions.findById(activeSession._id);
                if (latestSession?.finishRequestedByMessageId) {
                    await sendSafeText(
                        senderPhone,
                        "تعذر رفع أحد الملفات إلى التخزين، لذلك لن يتم إنشاء المشروع تلقائيًا حتى لا تفقد المرفقات."
                    );
                }
            }
        } else {
            await messages.updateByProviderMessageId(message.id, { status: "attached" });
        }
        await sessions.updateById(activeSession._id, {
            expiresAt: new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000)
        });
        return;
    }

    if (activeSession?.mode === "edit") {
        await sendSafeText(
            senderPhone,
            "حدد رقم اللوحة أولًا برسالة مثل: رقم اللوحة: 1، ثم أرسل الصور أو التسجيلات الخاصة بها."
        );
        return;
    }

    for (const body of await gettingStartedReplies()) {
        await sendSafeText(senderPhone, body);
    }
};

const receiveWebhook = async (req, res) => {
    if (!isValidWebhookSignature(req.rawBody, req.get("x-hub-signature-256"))) {
        return res.sendStatus(401);
    }

    try {
        const changes = req.body?.entry?.flatMap((entry) => entry.changes || []) || [];
        for (const change of changes) {
            const value = change.value || {};
            for (const status of value.statuses || []) {
                await messages.updateByProviderMessageId(status.id, {
                    status: status.status || "unknown",
                    recipientPhone: status.recipient_id || null,
                    rawPayload: status
                });
                if (status.status === "failed") {
                    console.error("WhatsApp message delivery failed:", {
                        messageId: status.id,
                        recipient: status.recipient_id,
                        errors: status.errors || []
                    });
                }
            }
            for (const message of value.messages || []) {
                await handleIncomingMessage(message, value);
            }
        }
        return res.sendStatus(200);
    } catch (error) {
        console.error("WhatsApp webhook processing failed:", error);
        return res.sendStatus(200);
    }
};

const sendTestMessage = async (req, res, next) => {
    try {
        if (req.user.role !== "OwnerManager") {
            return res.status(403).json({ status: "error", message: "Only Owner Manager can send a WhatsApp test message" });
        }
        const { to, body } = req.body;
        if (!to || !body) {
            return res.status(400).json({ status: "error", message: "to and body are required" });
        }
        const result = await sendTextMessage(to, body);
        return res.status(200).json({ status: "ok", result });
    } catch (error) {
        next(error);
    }
};

const sendTestTemplate = async (req, res, next) => {
    try {
        if (req.user.role !== "OwnerManager") {
            return res.status(403).json({ status: "error", message: "Only Owner Manager can send a WhatsApp test template" });
        }
        const { to, name, languageCode, components } = req.body;
        if (!to || !name) {
            return res.status(400).json({ status: "error", message: "to and name are required" });
        }
        const result = await sendTemplateMessage(to, name, languageCode, components || []);
        return res.status(200).json({ status: "ok", result });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    verifyWebhook,
    receiveWebhook,
    sendTestMessage,
    sendTestTemplate
};
