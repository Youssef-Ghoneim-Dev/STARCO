const dbconfig = require("../DB/config");
const schema = require("../DB/schema/whatsappMessages");

const collectionName = "whatsappMessages";
const getModel = () => dbconfig.openconnection(collectionName, schema);

const findByProviderMessageId = (providerMessageId) =>
    getModel().findOne({ providerMessageId });

const create = (message) => getModel().create(message);
const updateByProviderMessageId = (providerMessageId, update) =>
    getModel().findOneAndUpdate({ providerMessageId }, update, { returnDocument: "after" });
const updateManyBySession = (sessionId, update) =>
    getModel().updateMany({ sessionId }, update);
const findBySession = (sessionId) => getModel().find({ sessionId });
const findByProject = (projectId) => getModel().find({
    projectId,
    "media.storageFileId": { $ne: null }
}).sort({ createdAt: 1 });
const findAllByProject = (projectId) => getModel().find({ projectId });
const deleteByProject = (projectId) => getModel().deleteMany({ projectId });
const deleteById = (id) => getModel().findByIdAndDelete(id);

module.exports = {
    findByProviderMessageId,
    create,
    updateByProviderMessageId,
    updateManyBySession,
    findBySession,
    findByProject,
    findAllByProject,
    deleteByProject,
    deleteById
};
