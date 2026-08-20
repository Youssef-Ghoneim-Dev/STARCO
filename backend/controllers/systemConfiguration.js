const models = require("../models/systemConfiguration");
const { getWhatsappTemplates: normalizeWhatsappTemplates, isValidTemplates } = require("../utils/whatsappTemplates");

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
        const config = await models.update(req.body);

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

module.exports = {
    get,
    update,
    getWhatsappTemplates,
    updateWhatsappTemplates
};
