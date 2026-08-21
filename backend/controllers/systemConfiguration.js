const models = require("../models/systemConfiguration");
const jwt = require("jsonwebtoken");
const { getWhatsappTemplates: normalizeWhatsappTemplates, isValidTemplates } = require("../utils/whatsappTemplates");
const googleDrive = require("../services/googleDrive");

const isOwnerManager = (req) => req.decodedToken.role === "OwnerManager";

const get = async (req, res, next) => {
    try {
        if (
            req.decodedToken.role !== "OwnerManager" &&
            req.decodedToken.role !== "Engineer"
        ) {
            return res.status(403).json({
                status: "error",
                message: "You are not allowed"
            });
        }
        const config = await models.get();

        return res.status(200).json(config);

    } catch (error) {
        next(error);
    }
};

const update = async (req, res, next) => {
    try {
        if (
            req.decodedToken.role !== "OwnerManager" &&
            req.decodedToken.role !== "Engineer"
        ) {
            return res.status(403).json({
                status: "error",
                message: "You are not allowed"
            });
        }
        const updateData = { ...req.body };
        // أنواع الألواح ومعادلاتها هي إعداد إداري؛ المهندس يستخدمها في
        // التسعير لكنه لا يستطيع تغيير كتالوج النظام نفسه.
        if (!isOwnerManager(req)) delete updateData.panelTypes;
        const config = await models.update(updateData);

        return res.status(200).json({
            status: "ok",
            config
        });

    } catch (error) {
        next(error);
    }
};

const getWhatsappTemplates = async (req, res, next) => {
    try {
        if (!isOwnerManager(req)) {
            return res.status(403).json({ status: "error", message: "Only Owner Manager can manage WhatsApp templates" });
        }

        const config = await models.get();
        return res.status(200).json(normalizeWhatsappTemplates(config?.whatsappTemplates));
    } catch (error) {
        next(error);
    }
};

const updateWhatsappTemplates = async (req, res, next) => {
    try {
        if (!isOwnerManager(req)) {
            return res.status(403).json({ status: "error", message: "Only Owner Manager can manage WhatsApp templates" });
        }
        if (!isValidTemplates(req.body)) {
            return res.status(400).json({
                status: "error",
                message: "The template must keep STARCO commands and all required field names."
            });
        }

        const config = await models.updateWhatsappTemplates(req.body);
        if (!config) {
            return res.status(404).json({ status: "error", message: "System configuration not found" });
        }
        return res.status(200).json({
            status: "ok",
            whatsappTemplates: normalizeWhatsappTemplates(config.whatsappTemplates)
        });
    } catch (error) {
        next(error);
    }
};

const getGoogleDriveStatus = async (req, res, next) => {
    try {
        if (!isOwnerManager(req)) {
            return res.status(403).json({ status: "error", message: "Only Owner Manager can manage Google Drive" });
        }
        return res.status(200).json(await googleDrive.getConnectionStatus());
    } catch (error) {
        next(error);
    }
};

const startGoogleDriveConnection = async (req, res, next) => {
    try {
        if (!isOwnerManager(req)) {
            return res.status(403).json({ status: "error", message: "Only Owner Manager can manage Google Drive" });
        }
        const state = jwt.sign(
            { purpose: "google-drive-connect", userId: req.decodedToken.id },
            process.env.TOKEN_KEY,
            { expiresIn: "10m" }
        );
        return res.status(200).json({ authorizationUrl: googleDrive.createAuthorizationUrl(state) });
    } catch (error) {
        next(error);
    }
};

const finishGoogleDriveConnection = async (req, res) => {
    try {
        const state = jwt.verify(req.query.state, process.env.TOKEN_KEY);
        if (state.purpose !== "google-drive-connect" || !req.query.code) {
            return res.status(400).send("Invalid Google Drive connection request.");
        }
        await googleDrive.connectAccount(req.query.code);
        return res.status(200).send("<html dir=\"rtl\"><body style=\"font-family:Arial;padding:40px\"><h2>تم ربط Google Drive بنجاح.</h2><p>يمكنك إغلاق هذه الصفحة والعودة إلى STARCO.</p></body></html>");
    } catch (error) {
        console.error("Google Drive connection failed:", error.message);
        return res.status(400).send("<html dir=\"rtl\"><body style=\"font-family:Arial;padding:40px\"><h2>تعذر ربط Google Drive.</h2><p>ارجع إلى STARCO وحاول مرة أخرى.</p></body></html>");
    }
};

module.exports = {
    get,
    update,
    getWhatsappTemplates,
    updateWhatsappTemplates,
    getGoogleDriveStatus,
    startGoogleDriveConnection,
    finishGoogleDriveConnection
};
