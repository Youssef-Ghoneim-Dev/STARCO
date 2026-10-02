const models = require("../models/systemConfiguration");
const { getWhatsappTemplates: normalizeWhatsappTemplates, isValidTemplates } = require("../utils/whatsappTemplates");
const r2Storage = require("../services/r2Storage");
const isOwnerManager = (req) => req.user?.role === "OwnerManager";
const canManagePricing = (req) => ["OwnerManager", "Engineer", "FullEngineer"].includes(req.user?.role);
const canManageWhatsappTemplates = (req) => ["OwnerManager", "MarketingManager"].includes(req.user?.role);

const sanitizeEngineerPanelTypes = (currentTypes = [], requestedTypes = []) => {
    const requestedByKey = new Map(requestedTypes.map((type) => [type.key, type]));
    return currentTypes.map((currentType) => {
        const current = currentType.toObject ? currentType.toObject() : currentType;
        const requested = requestedByKey.get(current.key) || {};
        const requestedParts = new Map((requested.parts || []).map((part) => [part.key, part]));
        const currentParts = (current.parts || []).map((part) => {
            const incoming = requestedParts.get(part.key) || {};
            return {
                ...part,
                name: typeof incoming.name === "string" ? incoming.name : part.name,
                quantity: Number.isFinite(Number(incoming.quantity)) ? Number(incoming.quantity) : part.quantity,
                manualDimensions: typeof incoming.manualDimensions === "boolean" ? incoming.manualDimensions : part.manualDimensions
            };
        });
        const newManualParts = (requested.parts || [])
            .filter((part) => part?.key && !(current.parts || []).some((currentPart) => currentPart.key === part.key))
            .map((part) => ({ key: part.key, name: part.name || "جزء جديد", quantity: Number(part.quantity) || 1, manualDimensions: true, lengthFormula: "", widthFormula: "" }));
        return {
            ...current,
            prices: { ...current.prices, ...(requested.prices || {}) },
            additionalParts: Array.isArray(requested.additionalParts) ? requested.additionalParts : current.additionalParts,
            parts: [...currentParts, ...newManualParts]
        };
    });
};

const get = async (req, res, next) => {
    try {
        if (["Marketer", "MarketingManager"].includes(req.user?.role)) {
            const config = await models.get();
            return res.status(200).json({
                panelTypes: (config?.panelTypes || []).map((type) => ({
                    key: type.key,
                    name: type.name,
                    whatsappType: type.whatsappType
                }))
            });
        }
        if (!canManagePricing(req)) {
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
        if (!canManagePricing(req)) {
            return res.status(403).json({
                status: "error",
                message: "You are not allowed"
            });
        }
        const updateData = { ...req.body };
        // المهندس يعدّل الأسعار والأجزاء، لكن المعادلات وتعريف نوع اللوحة
        // يبقيان محفوظين كما حددهما Owner Manager.
        if (!isOwnerManager(req)) {
            const currentConfig = await models.get();
            updateData.panelTypes = sanitizeEngineerPanelTypes(currentConfig?.panelTypes || [], updateData.panelTypes || []);
            updateData.copperConfiguration = currentConfig?.copperConfiguration;
        }
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
        if (!canManageWhatsappTemplates(req)) {
            return res.status(403).json({ status: "error", message: "You are not allowed to manage WhatsApp templates" });
        }

        const config = await models.get();
        return res.status(200).json(normalizeWhatsappTemplates(config?.whatsappTemplates));
    } catch (error) {
        next(error);
    }
};

const updateWhatsappTemplates = async (req, res, next) => {
    try {
        if (!canManageWhatsappTemplates(req)) {
            return res.status(403).json({ status: "error", message: "You are not allowed to manage WhatsApp templates" });
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

const getR2Status = async (req, res, next) => {
    try {
        if (!isOwnerManager(req)) {
            return res.status(403).json({
                status: "error",
                message: "Only Owner Manager can manage R2"
            });
        }

        return res.status(200).json(await r2Storage.getConnectionStatus());
    } catch (error) {
        next(error);
    }
};

module.exports = {
    get,
    update,
    getWhatsappTemplates,
    updateWhatsappTemplates,
    getR2Status
};