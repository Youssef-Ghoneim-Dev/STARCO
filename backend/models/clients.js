const dbconfig = require("../DB/config");
const collectionName = "clients"
const clientSchema = require("../DB/schema/clients");
const add_one = async (client) => {
    const openconnection = await dbconfig.openconnection(
        collectionName,
        clientSchema
    );

    const newClient = await openconnection.create(client);

    return newClient;
}
const select_one = async (client) => {
    const openconnection = await dbconfig.openconnection(collectionName, clientSchema);
    const select_one = (await openconnection).findOne(client);
    return select_one;
}
const select_all = async () => {
    const openconnection = await dbconfig.openconnection(
        collectionName,
        clientSchema
    );

    return await openconnection.find({});
};
const search = async (name) => {
    const openconnection = await dbconfig.openconnection(
        collectionName,
        clientSchema
    );
    return await openconnection.find({
        name: {
            $regex: "^" + name,
            $options: "i"
        }
    }).limit(10);
}

const update = async (client) => {
    const openconnection = await dbconfig.openconnection(
        collectionName,
        clientSchema
    );

    return await openconnection.findByIdAndUpdate(
        client.id,
        {
            type: client.type,
            profitPercentage: client.profitPercentage
        }
    );
}
const delete_one = async (id) => {

    const openconnection = await dbconfig.openconnection(
        collectionName,
        clientSchema
    );

    return await openconnection.findByIdAndDelete(id);

};
module.exports = {
    add_one,
    select_all,
    search,
    select_one,
    update,
    delete_one
}