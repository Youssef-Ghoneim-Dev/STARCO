const dbconfig = require("../DB/config");
const collectionName = "systemConfiguration";
const schema = require("../DB/schema/systemConfiguration");

const get = async () => {
    const connection = await dbconfig.openconnection(
        collectionName,
        schema
    );

    return await connection.findOne({});
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
