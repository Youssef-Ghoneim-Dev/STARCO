const dbconfig = require("../DB/config");
const schema = require("../DB/schema/whatsappMessages");

const collectionName = "whatsappMessages";
const getModel = () => dbconfig.openconnection(collectionName, schema);

const findByProviderMessageId = (providerMessageId) =>
    getModel().findOne({ providerMessageId });

const create = (message) => getModel().create(message);
const updateByProviderMessageId = (providerMessageId, update) =>
    getModel().findOneAndUpdate({ providerMessageId }, update, { new: true });
const updateManyBySession = (sessionId, update) =>
    getModel().updateMany({ sessionId }, update);
const findBySession = (sessionId) => getModel().find({ sessionId });

module.exports = {
    findByProviderMessageId,
    create,
    updateByProviderMessageId,
    updateManyBySession,
    findBySession
};
