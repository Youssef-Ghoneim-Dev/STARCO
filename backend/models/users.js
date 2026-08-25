const dbconfig = require("../DB/config");
const collectionName = "users"
const userSchema = require("../DB/schema/users")

const normalizePhoneNumber = (phoneNumber) =>
    String(phoneNumber || "").replace(/\D/g, "");
const select_one = async (condtion) => {
    const openconnection = await dbconfig.openconnection(collectionName, userSchema);
    const SelectOneuser = (await openconnection).findOne(condtion);
    return SelectOneuser;
};

const select_marketer_by_phone = async (phoneNumber) => {
    const openconnection = await dbconfig.openconnection(collectionName, userSchema);
    return openconnection.findOne({
        phoneNumber: normalizePhoneNumber(phoneNumber),
        role: "Marketer",
        approved: true,
        isDeleted: false
    });
};

const add_one = async (user) => {
    const openconnection = await dbconfig.openconnection(collectionName, userSchema);
    if (user.googleId == null) {
        delete user.googleId;
    }
    if (user.phoneNumber) {
        user.phoneNumber = normalizePhoneNumber(user.phoneNumber);
    }
    const AddOneuser = (await openconnection).insertOne(user);
    return AddOneuser;
}

const selectall = async (condtion) => {
    const openconnection = await dbconfig.openconnection(collectionName, userSchema);
    const users = await openconnection.find(condtion);
    return users;
}

const update = async (user, { allowRole = false } = {}) => {
    const openconnection = await dbconfig.openconnection(collectionName, userSchema);
    const updates = {
        email: user.email,
        name: user.name,
        phoneNumber: user.phoneNumber ? normalizePhoneNumber(user.phoneNumber) : null
    };

    if (allowRole && user.role) {
        updates.role = user.role;
    }

    const queryResult = await openconnection.findByIdAndUpdate(user.id, updates);
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
    select_marketer_by_phone,
    add_one,
    selectall,
    update,
    deleteOne,
    restore,
    approve,
    deleteForever
}
