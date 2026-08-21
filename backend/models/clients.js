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

    return await openconnection.find({}).sort({ name: 1 });
};
const search = async (name) => {
    const openconnection = await dbconfig.openconnection(
        collectionName,
        clientSchema
    );
    const escapedName = String(name || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    return await openconnection.find({
        name: {
            $regex: "^" + escapedName,
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
            name: client.name,
            type: client.type,
            profitPercentage: client.profitPercentage
        },
        { new: true }
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
