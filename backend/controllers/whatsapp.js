const crypto = require("crypto");
const users = require("../models/users");
const projects = require("../models/projects");
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
const { uploadFile } = require("../services/googleDrive");
const { normalizePhoneNumber } = require("../utils/phoneNumber");

const SESSION_HOURS = 24;

const loadWhatsappTemplates = async () => {
    const config = await systemConfiguration.get();
    return getWhatsappTemplates(config?.whatsappTemplates);
};

const panelExample = `STARCO PANEL
السمك المطلوب: 0.7, 1, 1.5
نوع اللوحة: عادية
اختر نوعًا واحدًا: عادية / نمطي / دفن / وتربروف
هل يوجد نحاس: لا
اكتب: نعم أو لا
تفاصيل إضافية: اكتب التفاصيل هنا`;

const panelInstructions = (templates) => [
    `تم بدء المشروع بنجاح. أرسل بيانات اللوحة بالشكل التالي، ثم أرسل الصور والتسجيلات الخاصة بها. عند إنهاء جميع اللوحات أرسل: STARCO FINISH\n\nمثال:\n${panelExample}`,
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
    const fileName = `whatsapp-${message.id}-${Date.now()}.${mediaExtension(downloaded.mimeType)}`;
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
    if (!command.panelType) return "اكتب نوع اللوحة في سطر: نوع اللوحة: دفن أو عادية أو وتربروف أو نمطي";
    if (command.hasCopper === null) return "اكتب هل يوجد نحاس هكذا: هل يوجد نحاس: نعم أو لا";
    return null;
};

const createProjectFromSession = async (session) => {
    const systemConfig = await systemConfiguration.get();
    if (!systemConfig) throw new Error("System configuration not found");

    const baseProject = defaultProject();
    const configuredPanelPrices = systemConfig.prices || {};

    return projects.create({
        ...baseProject,
        marketingId: session.marketingRepId,
        engineerId: null,
        status: "pending",
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
        whatsappSessionId: session._id,
        panels: session.panels.map((panel, index) => {
            const basePanel = JSON.parse(JSON.stringify(baseProject.panels[0]));
            return {
                ...basePanel,
                panelName: panel.panelName || `لوحة ${index + 1}`,
                thickness: panel.requestedThicknesses,
                panelType: panel.panelType,
                hasCopper: panel.hasCopper,
                additionalDetails: panel.details,
                prices: {
                    ...basePanel.prices,
                    manufacturing: configuredPanelPrices.manufacturing ?? basePanel.prices.manufacturing,
                    locks: configuredPanelPrices.locks ?? basePanel.prices.locks,
                    hinges: configuredPanelPrices.hinges ?? basePanel.prices.hinges,
                    transport: configuredPanelPrices.transport ?? basePanel.prices.transport,
                    screws: configuredPanelPrices.screws ?? basePanel.prices.screws,
                    stretch: configuredPanelPrices.stretch ?? basePanel.prices.stretch
                }
            };
        })
    });
};

const updateProjectFromSession = async (session) => {
    const targetProject = await projects.select_one({
        _id: session.targetProjectId,
        marketingId: session.marketingRepId,
        isDeleted: false
    });
    if (!targetProject) return null;

    const panels = targetProject.panels.map((existingPanel, index) => {
        const incomingPanel = session.panels.find((panel) => panel.targetPanelIndex === index + 1);
        if (!incomingPanel) return existingPanel.toObject();

        return {
            ...existingPanel.toObject(),
            panelName: existingPanel.panelName,
            thickness: incomingPanel.requestedThicknesses,
            panelType: incomingPanel.panelType,
            hasCopper: incomingPanel.hasCopper,
            additionalDetails: incomingPanel.details
        };
    });

    return projects.update_whatsapp_project(targetProject._id, {
        client: session.client,
        panels,
        source: "whatsapp",
        whatsappSessionId: session._id,
        updatedAt: Date.now()
    });
};

const attachMessagesToProject = async (session, project) => {
    const panelMap = new Map(
        session.panels.map((panel, index) => [
            panel.localPanelKey,
            session.mode === "edit"
                ? project.panels[panel.targetPanelIndex - 1]?.panelId
                : project.panels[index]?.panelId
        ])
    );
    const incomingMessages = await messages.findBySession(session._id);

    await Promise.all(incomingMessages.map((message) =>
        messages.updateByProviderMessageId(message.providerMessageId, {
            projectId: project._id,
            panelId: panelMap.get(message.panelLocalKey) || null,
            status: "attached"
        })
    ));
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

    const baseUrl = (process.env.FRONTEND_URL || "").replace(/\/$/, "");
    await sendSafeText(
        engineer.phoneNumber,
        `تنبيه: المندوب عدّل بعض البيانات في مشروع يحتاج مراجعتك.\nID : ${project._id}\nالعميل: ${project.client?.name || "غير محدد"}\nالرابط: ${baseUrl}/projects/${project._id}\nبرجاء الدخول والتأكد من التعديلات.`
    );
};

const finishSession = async (session, inboundMessage) => {
    if (!session.panels.length) {
        return { error: "لا يمكن إنهاء المشروع قبل إرسال لوحة واحدة على الأقل." };
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

    const project = finalizingSession.mode === "edit"
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
        const replies = session.mode === "edit"
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

    if (command.type === "start") {
        const validationError = validateStart(command);
        if (validationError) return [`${validationError}\n\nمثال:\nSTARCO START\nاسم العميل: شركة ستاركو`, templates.startProject];
        if (await getActiveSession(senderPhone)) {
            return "لديك مشروع مفتوح بالفعل. أرسل STARCO FINISH لإنهائه أو STARCO DELETE لحذف الجلسة الحالية.";
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
        const targetProject = await projects.select_one({
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

        const targetProject = await projects.select_one({
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
            requestedThicknesses: existingProjectPanel.thickness || [],
            panelType: existingProjectPanel.panelType || "",
            hasCopper: existingProjectPanel.hasCopper,
            details: existingProjectPanel.additionalDetails || ""
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
            panelName: `لوحة ${session.panels.length + 1}`,
            targetPanelIndex: session.mode === "edit" ? session.selectedPanelIndex : null,
            requestedThicknesses: command.thicknesses,
            panelType: command.panelType,
            hasCopper: command.hasCopper,
            details: command.details || ""
        };
        const nextPanels = existingEdit
            ? session.panels.map((item) => item.targetPanelIndex === session.selectedPanelIndex ? panel : item)
            : [...session.panels, panel];
        await sessions.updateById(session._id, {
            panels: nextPanels,
            activePanelKey: panel.localPanelKey,
            expiresAt: new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000)
        });
        return session.mode === "edit"
            ? `تم تجهيز تعديل لوحة ${session.selectedPanelIndex}. يمكنك اختيار لوحة أخرى برسالة: رقم اللوحة: 2، أو أرسل STARCO FINISH لحفظ التعديلات.`
            : `تم تسجيل لوحة: ${panel.panelName}. أرسل الآن كل الصور والتسجيلات والتفاصيل الخاصة بها.`;
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
        if (result.waiting) {
            return session.mode === "edit"
                ? `جاري رفع ${result.waiting} ملف. سيتم حفظ التعديلات وإرسال الرابط تلقائيًا فور اكتمال الرفع.`
                : `جاري رفع ${result.waiting} ملف. سيتم إنشاء المشروع وإرسال الرابط تلقائيًا فور اكتمال الرفع.`;
        }
        if (result.finalizing) {
            return session.mode === "edit"
                ? "جاري حفظ التعديلات، وسيصل إليك الرابط تلقائيًا خلال لحظات."
                : "جاري إنشاء المشروع، وسيصل إليك الرابط تلقائيًا خلال لحظات.";
        }
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
    const command = parseWhatsappCommand(text);
    const activeSession = await getActiveSession(senderPhone);

    markMessageAsRead(message.id).catch((error) => console.error("Could not mark message as read:", error.message));
    const marketer = await users.select_marketer_by_phone(senderPhone);
    if (!marketer) {
        await sendSafeText(senderPhone, "هذا الرقم غير مربوط بحساب مندوب معتمد في نظام STARCO.");
        return;
    }

    if (command) {
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
        if (req.decodedToken.role !== "OwnerManager") {
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
        if (req.decodedToken.role !== "OwnerManager") {
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
