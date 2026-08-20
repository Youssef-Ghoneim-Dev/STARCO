const dbconfig = require("../DB/config");
const schema = require("../DB/schema/whatsappSessions");

const collectionName = "whatsappSessions";
const getModel = () => dbconfig.openconnection(collectionName, schema);

const findActiveByPhone = (senderPhone) =>
    getModel().findOne({ senderPhone, status: "collecting" });

const findById = (id) => getModel().findById(id);
const claimForFinalization = (id) => getModel().findOneAndUpdate(
    { _id: id, status: "collecting" },
    { status: "finalizing" },
    { new: true }
);

const create = (session) => getModel().create(session);
const updateById = (id, update) => getModel().findByIdAndUpdate(id, update, { new: true });

module.exports = {
    findActiveByPhone,
    findById,
    claimForFinalization,
    create,
    updateById
};
