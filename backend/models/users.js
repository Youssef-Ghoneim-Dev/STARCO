const dbconfig = require("../DB/config");
const collectionName = "users"
const userSchema = require("../DB/schema/users")
const select_one = async (condtion) => {
    const openconnection = await dbconfig.openconnection(collectionName, userSchema);
    const SelectOneuser = (await openconnection).findOne(condtion);
    return SelectOneuser;
};

const add_one = async (user) => {
    const openconnection = await dbconfig.openconnection(collectionName, userSchema);
    const AddOneuser = (await openconnection).insertOne(user);
    return AddOneuser;
}

const selectall = async (condtion) => {
    const openconnection = await dbconfig.openconnection(collectionName, userSchema);
    const users = await openconnection.find(condtion);
    return users;
}

const update = async (user) => {
    const openconnection = await dbconfig.openconnection(collectionName, userSchema);
    const queryResult = await openconnection.findByIdAndUpdate(user.id, {
        email: user.email,
        name: user.name
    });
    return queryResult;
}

const deleteOne = async (userId) => {
    const openconnection = await dbconfig.openconnection(collectionName, userSchema);
    const user = await openconnection.findByIdAndUpdate(userId,
        { isDeleted: true }
    );
    return user;
}
const restore = async (userId) => {
    const openconnection = await dbconfig.openconnection(collectionName, userSchema);
    const user = await openconnection.findByIdAndUpdate(userId,
        { isDeleted: false }
    );
    return user;
}
const approve = async (userId) => {
    const openconnection = await dbconfig.openconnection(collectionName, userSchema);
    const user = await openconnection.findByIdAndUpdate(userId,
        { approved: true }
    );
    return user;
}
const deleteForever = async (condtion) => {
    const openconnection = await dbconfig.openconnection(collectionName, userSchema);
    const user = await openconnection.findOneAndDelete(condtion);
    return user;
}
module.exports = {
    select_one,
    add_one,
    selectall,
    update,
    deleteOne,
    restore,
    approve,
    deleteForever
}