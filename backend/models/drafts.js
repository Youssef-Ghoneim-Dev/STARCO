const dbconfig = require("../DB/config");
const collectionName = "drafts";
const draftSchema = require("../DB/schema/drafts");

const select_one = async (condition) => {

    const openconnection = await dbconfig.openconnection(
        collectionName,
        draftSchema
    );

    return await openconnection.findOne(condition);
};

const save = async (draft) => {

    const openconnection = await dbconfig.openconnection(
        collectionName,
        draftSchema
    );

    return await openconnection.findOneAndUpdate(

        {
            userId: draft.userId
        },

        draft,

        {
            upsert: true,
            new: true
        }

    );

};

const deleteOne = async (userId) => {

    const openconnection = await dbconfig.openconnection(
        collectionName,
        draftSchema
    );

    return await openconnection.findOneAndDelete({
        userId
    });

};

const heartbeat = async (userId) => {

    const openconnection = await dbconfig.openconnection(
        collectionName,
        draftSchema
    );

    return await openconnection.findOneAndUpdate(

        {
            userId
        },

        {
            "editing.lastSeen": Date.now()
        }

    );

};


module.exports = {
    select_one,
    save,
    deleteOne,
    heartbeat
};