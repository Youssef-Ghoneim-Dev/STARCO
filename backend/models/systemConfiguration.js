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

module.exports = {
    get,
    update
};