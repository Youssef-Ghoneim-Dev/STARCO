const dbconfig = require("../DB/config");
const collectionName = "systemConfiguration";
const schema = require("../DB/schema/systemConfiguration");
const { panelTypeDefaults } = require("../utils/panelTypeDefaults");
const { cloneCopperConfigurationDefaults } = require("../utils/copperDefaults");

const normalizeAdditionalPart = (part) => {
    if (typeof part === "string") {
        return {
            name: part,
            defaultWidth: part === "الكرسي" ? 40 : part === "أوميجا" ? 45.5 : null,
            defaultHeight: part === "الكرسي" ? 100 : null,
            defaultQuantity: part === "الكرسي" ? 2 : 1,
            quantityStep: part === "الكرسي" ? 2 : 1,
            showQuantityControls: ["الكرسي", "أوميجا"].includes(part)
        };
    }
    return {
        name: part?.name || "",
        defaultWidth: part?.defaultWidth == null || part.defaultWidth === "" ? null : Number(part.defaultWidth),
        defaultHeight: part?.defaultHeight == null || part.defaultHeight === "" ? null : Number(part.defaultHeight),
        defaultQuantity: Number(part?.defaultQuantity) || 1,
        quantityStep: Number(part?.quantityStep) || 1,
        showQuantityControls: Boolean(part?.showQuantityControls)
    };
};

const get = async () => {
    const connection = await dbconfig.openconnection(
        collectionName,
        schema
    );

    const rawConfig = await connection.findOne({}).lean();
    if (!rawConfig) return null;
    const migration = {};
    if (!Array.isArray(rawConfig.panelTypes) || rawConfig.panelTypes.length === 0) {
        migration.panelTypes = JSON.parse(JSON.stringify(panelTypeDefaults));
    }
    if (!Array.isArray(rawConfig.copperConfiguration?.catalog) || rawConfig.copperConfiguration.catalog.length === 0) {
        migration.copperConfiguration = cloneCopperConfigurationDefaults();
    } else if (!rawConfig.copperConfiguration?.weightFormula || rawConfig.copperConfiguration?.pricePerKg == null) {
        migration.copperConfiguration = {
            ...rawConfig.copperConfiguration,
            weightFormula: rawConfig.copperConfiguration?.weightFormula || cloneCopperConfigurationDefaults().weightFormula,
            pricePerKg: rawConfig.copperConfiguration?.pricePerKg ?? cloneCopperConfigurationDefaults().pricePerKg
        };
    }
    if (Object.keys(migration).length > 0) {
        return connection.findByIdAndUpdate(rawConfig._id, { $set: migration }, { new: true });
    }
    const defaultsByKey = new Map(panelTypeDefaults.map((type) => [type.key, type]));
    const normalizedTypes = rawConfig.panelTypes.map((type) => {
        const fallback = defaultsByKey.get(type.key);
        const parts = (type.parts || []).map((part) => (
            type.key === "ont" && part.key === "shared" && ["المشترك", "حمل مشترك"].includes(part.name)
                ? { ...part, name: "حامل مشترك" }
                : part
        ));
        return {
            ...type,
            name: type.key === "waterproof" && type.name === "واتربروف" ? "وتربروف" : type.name,
            whatsappType: type.key === "waterproof" && type.whatsappType === "واتربروف" ? "وتربروف" : type.whatsappType,
            additionalParts: (Array.isArray(type.additionalParts) ? type.additionalParts : (fallback?.additionalParts || [])).map(normalizeAdditionalPart),
            parts
        };
    });
    if (JSON.stringify(rawConfig.panelTypes) !== JSON.stringify(normalizedTypes)) {
        return connection.findByIdAndUpdate(rawConfig._id, { $set: { panelTypes: normalizedTypes } }, { new: true });
    }
    return connection.findOne({});
};

const update = async (config) => {
    const connection = await dbconfig.openconnection(
        collectionName,
        schema
    );

    return await connection.findOneAndUpdate(
        {},
        config,
        {
            new: true
        }
    );
};

const updateWhatsappTemplates = async (templates) => {
    const connection = await dbconfig.openconnection(collectionName, schema);
    return connection.findOneAndUpdate(
        {},
        { $set: { whatsappTemplates: templates } },
        { new: true }
    );
};

const getGoogleDriveConnection = async () => {
    const connection = await dbconfig.openconnection(collectionName, schema);
    return connection.findOne({}).select("+googleDrive.oauthRefreshToken");
};

const updateGoogleDriveConnection = async (googleDrive) => {
    const connection = await dbconfig.openconnection(collectionName, schema);
    return connection.findOneAndUpdate(
        {},
        { $set: { googleDrive } },
        { new: true }
    );
};

module.exports = {
    get,
    update,
    updateWhatsappTemplates,
    getGoogleDriveConnection,
    updateGoogleDriveConnection
};
