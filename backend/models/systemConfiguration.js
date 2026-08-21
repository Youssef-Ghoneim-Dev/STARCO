const dbconfig = require("../DB/config");
const collectionName = "systemConfiguration";
const schema = require("../DB/schema/systemConfiguration");
const { panelTypeDefaults } = require("../utils/panelTypeDefaults");

const get = async () => {
    const connection = await dbconfig.openconnection(
        collectionName,
        schema
    );

    const rawConfig = await connection.findOne({}).lean();
    if (!rawConfig) return null;
    if (!Array.isArray(rawConfig.panelTypes) || rawConfig.panelTypes.length === 0) {
        return connection.findByIdAndUpdate(
            rawConfig._id,
            { $set: { panelTypes: JSON.parse(JSON.stringify(panelTypeDefaults)) } },
            { new: true }
        );
    }
    const defaultsByKey = new Map(panelTypeDefaults.map((type) => [type.key, type]));
    const normalizedTypes = rawConfig.panelTypes.map((type) => {
        const fallback = defaultsByKey.get(type.key);
        if (!fallback) return type;
        const parts = (type.parts || []).map((part) => (
            type.key === "ont" && part.key === "shared" && part.name === "المشترك"
                ? { ...part, name: "حمل مشترك" }
                : part
        ));
        return {
            ...type,
            name: type.key === "waterproof" && type.name === "واتربروف" ? "وتربروف" : type.name,
            whatsappType: type.key === "waterproof" && type.whatsappType === "واتربروف" ? "وتربروف" : type.whatsappType,
            additionalParts: Array.isArray(type.additionalParts) ? type.additionalParts : fallback.additionalParts,
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
