const mongoose = require("mongoose");

const openconnection = (collectionName, schema) => {

    const collection =
        mongoose.models[collectionName] ||
        mongoose.model(collectionName, schema);

    return collection;
}

module.exports = {
    openconnection
}