const crypto = require("crypto");
const users = require("../models/users");
const projects = require("../models/projects");
const sessions = require("../models/whatsappSessions");
const messages = require("../models/whatsappMessages");
const systemConfiguration = require("../models/systemConfiguration");
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

const gettingStartedReplies = async () => {
    const templates = await loadWhatsappTemplates();
    return [
        "هذه الرسالة لا تتبع صيغة نظام STARCO. لبدء مشروع جديد، أرسل رسالة البدء التالية كما هي، ثم عدّل البيانات المكتوبة بعد النقطتين.",
        templates.startProject,
        "بعد تأكيد بدء المشروع، سترسل لك المنصة صيغة اللوحة. يمكنك الضغط مطولًا على رسالة الصيغة ونسخها. ولحذف جلسة مفتوحة دون إنشاء مشروع أرسل: STARCO DELETE"
    ];
};

const normalizeReplies = (reply) => Array.isArray(reply) ? reply : [reply];

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
    if (!command.clientType) return "اكتب نوع العميل هكذا: نوع العميل: فرد أو شركة";
    return null;
};

const validatePanel = (command) => {
    if (!command.panelName) return "اكتب اسم اللوحة في سطر: اسم اللوحة: ...";
    if (!command.thicknesses.length) return "اكتب السمك هكذا: السمك المطلوب: 0.7, 1, 1.5";
    if (!command.panelType) return "اكتب نوع اللوحة في سطر: نوع اللوحة: دفن أو عادية أو وتربروف أو نمطي";
    if (command.hasCopper === null) return "اكتب هل يوجد نحاس هكذا: هل يوجد نحاس: نعم أو لا";
    return null;
};

const createProjectFromSession = (session) => projects.create({
    userId: session.marketingRepId,
    client: {
        name: session.client.name,
        type: session.client.type,
        profitPercentage: 0
    },
    source: "whatsapp",
    whatsappSessionId: session._id,
    panels: session.panels.map((panel) => ({
        panelName: panel.panelName,
        thickness: panel.requestedThicknesses,
        panelType: panel.panelType,
        hasCopper: panel.hasCopper,
        additionalDetails: panel.details,
        parts: [],
        prices: {}
    }))
});

const updateProjectFromSession = async (session) => {
    const targetProject = await projects.select_one({
        _id: session.targetProjectId,
        userId: session.marketingRepId,
        isDeleted: false
    });
    if (!targetProject) return null;

    const suppliedPanelsByName = new Map(
        session.panels.map((panel) => [panel.panelName.trim(), panel])
    );
    const panels = targetProject.panels.map((existingPanel) => {
        const incomingPanel = suppliedPanelsByName.get(existingPanel.panelName.trim());
        if (!incomingPanel) return existingPanel.toObject();

        suppliedPanelsByName.delete(existingPanel.panelName.trim());
        return {
            ...existingPanel.toObject(),
            panelName: incomingPanel.panelName,
            thickness: incomingPanel.requestedThicknesses,
            panelType: incomingPanel.panelType,
            hasCopper: incomingPanel.hasCopper,
            additionalDetails: incomingPanel.details
        };
    });

    suppliedPanelsByName.forEach((panel) => {
        panels.push({
            panelId: crypto.randomUUID(),
            panelName: panel.panelName,
            thickness: panel.requestedThicknesses,
            panelType: panel.panelType,
            hasCopper: panel.hasCopper,
            additionalDetails: panel.details,
            parts: [],
            prices: {}
        });
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
        session.panels.map((panel, index) => [panel.localPanelKey, project.panels[index]?.panelId])
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

const finishSession = async (session, inboundMessage) => {
    if (!session.panels.length) {
        return { error: "لا يمكن إنهاء المشروع قبل إرسال لوحة واحدة على الأقل." };
    }
    const project = session.mode === "edit"
        ? await updateProjectFromSession(session)
        : await createProjectFromSession(session);
    if (!project) return { error: "تعذر العثور على المشروع المطلوب تعديله." };
    await attachMessagesToProject(session, project);
    await sessions.updateById(session._id, {
        status: "finished",
        finishedByMessageId: inboundMessage.id,
        createdProjectId: project._id,
        activePanelKey: null
    });
    return { project };
};

const handleCommand = async ({ command, senderPhone, marketer, inboundMessage }) => {
    const templates = await loadWhatsappTemplates();

    if (command.type === "start") {
        const validationError = validateStart(command);
        if (validationError) return [validationError, templates.startProject];
        if (await getActiveSession(senderPhone)) {
            return "لديك مشروع مفتوح بالفعل. أرسل STARCO FINISH لإنهائه أو STARCO DELETE لحذف الجلسة الحالية.";
        }

        const session = await sessions.create({
            senderPhone,
            marketingRepId: marketer._id,
            client: { name: command.clientName, type: command.clientType },
            startedByMessageId: inboundMessage.id,
            expiresAt: new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000)
        });
        return [
            "تم بدء المشروع بنجاح. أرسل الآن رسالة اللوحة التالية، ثم بعد تأكيدها أرسل كل الصور والتسجيلات الخاصة بهذه اللوحة. عندما تبدأ لوحة جديدة، أرسل صيغة اللوحة مرة أخرى.",
            templates.panel,
            "بعد الانتهاء من كل اللوحات أرسل: STARCO FINISH"
        ];
    }

    if (command.type === "edit") {
        if (await getActiveSession(senderPhone)) {
            return "لديك مشروع مفتوح بالفعل. أنهِه أو ألغِه قبل بدء التعديل.";
        }
        const targetProject = await projects.select_one({
            _id: command.projectId,
            userId: marketer._id,
            isDeleted: false
        });
        if (!targetProject) return "لم يتم العثور على مشروع بهذا ID تابع لك.";

        await sessions.create({
            senderPhone,
            marketingRepId: marketer._id,
            mode: "edit",
            targetProjectId: targetProject._id,
            client: {
                name: command.clientName || targetProject.client.name,
                type: command.clientType || targetProject.client.type
            },
            startedByMessageId: inboundMessage.id,
            expiresAt: new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000)
        });
        return "تم فتح جلسة تعديل. أرسل رسائل STARCO PANEL ثم STARCO FINISH.";
    }

    const session = await getActiveSession(senderPhone);
    if (!session) return gettingStartedReplies();

    if (command.type === "delete") {
        await sessions.updateById(session._id, { status: "cancelled", activePanelKey: null });
        return "تم حذف جلسة المشروع الحالية. لم يتم إنشاء أي مشروع، ويمكنك الآن بدء مشروع جديد برسالة STARCO START v1.";
    }

    if (command.type === "panel") {
        const validationError = validatePanel(command);
        if (validationError) return [validationError, templates.panel];

        const duplicatePanel = session.panels.find((panel) => panel.sourceMessageId === inboundMessage.id);
        if (duplicatePanel) {
            return `تم تسجيل لوحة: ${duplicatePanel.panelName}. أرسل الآن كل الصور والتسجيلات والتفاصيل الخاصة بها.`;
        }

        const panel = {
            localPanelKey: crypto.randomUUID(),
            sourceMessageId: inboundMessage.id,
            panelName: command.panelName,
            requestedThicknesses: command.thicknesses,
            panelType: command.panelType,
            hasCopper: command.hasCopper,
            details: command.details || ""
        };
        await sessions.updateById(session._id, {
            $push: { panels: panel },
            activePanelKey: panel.localPanelKey,
            expiresAt: new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000)
        });
        return `تم تسجيل لوحة: ${panel.panelName}. أرسل الآن كل الصور والتسجيلات والتفاصيل الخاصة بها.`;
    }

    if (command.type === "finish") {
        const result = await finishSession(session, inboundMessage);
        if (result.error) return result.error;
        const baseUrl = (process.env.FRONTEND_URL || "").replace(/\/$/, "");
        return `تم إنشاء المشروع بنجاح.\nID: ${result.project._id}\nالرابط: ${baseUrl}/projects/${result.project._id}`;
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
            } catch (error) {
                console.error("Google Drive media upload failed:", error.message);
                await messages.updateByProviderMessageId(message.id, {
                    "media.uploadError": error.message,
                    status: "media_upload_failed"
                });
            }
        } else {
            await messages.updateByProviderMessageId(message.id, { status: "attached" });
        }
        await sessions.updateById(activeSession._id, {
            expiresAt: new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000)
        });
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
