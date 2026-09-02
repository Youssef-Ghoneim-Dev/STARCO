const mongoose = require("mongoose");

const GOOGLE_ID_INDEX_NAME = "googleId_1";
const PHONE_NUMBER_INDEX_NAME = "phoneNumber_1";

const hasCorrectGoogleIdIndex = (index) =>
    index?.unique === true &&
    index?.partialFilterExpression?.googleId?.$type === "string";

const hasCorrectPhoneNumberIndex = (index) =>
    index?.unique === true &&
    index?.partialFilterExpression?.phoneNumber?.$type === "string";

const ensureUserIndexes = async () => {
    const users = mongoose.connection.collection("users");
    let indexes = [];
    try {
        indexes = await users.indexes();
    } catch (error) {
        // A fresh database does not have the users collection yet.
        if (error.code !== 26) throw error;
    }
    const googleIdIndex = indexes.find((index) => index.name === GOOGLE_ID_INDEX_NAME);
    const phoneNumberIndex = indexes.find((index) => index.name === PHONE_NUMBER_INDEX_NAME);

    if (googleIdIndex && !hasCorrectGoogleIdIndex(googleIdIndex)) {
        try {
            await users.dropIndex(GOOGLE_ID_INDEX_NAME);
        } catch (error) {
            // Another server instance may have completed the same migration.
            if (error.code !== 27) throw error;
        }
    }

    if (!googleIdIndex || !hasCorrectGoogleIdIndex(googleIdIndex)) {
        await users.createIndex(
            { googleId: 1 },
            {
                name: GOOGLE_ID_INDEX_NAME,
                unique: true,
                partialFilterExpression: { googleId: { $type: "string" } }
            }
        );
    }

    if (phoneNumberIndex && !hasCorrectPhoneNumberIndex(phoneNumberIndex)) {
        try {
            await users.dropIndex(PHONE_NUMBER_INDEX_NAME);
        } catch (error) {
            if (error.code !== 27) throw error;
        }
    }

    if (!phoneNumberIndex || !hasCorrectPhoneNumberIndex(phoneNumberIndex)) {
        await users.createIndex(
            { phoneNumber: 1 },
            {
                name: PHONE_NUMBER_INDEX_NAME,
                unique: true,
                partialFilterExpression: { phoneNumber: { $type: "string" } }
            }
        );
    }
};

module.exports = ensureUserIndexes;
