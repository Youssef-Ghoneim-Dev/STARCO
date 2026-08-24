require("dotenv").config();

const mongoose = require("mongoose");

async function removeClientNameUniqueIndex() {
    await mongoose.connect(process.env.DATABASE_URL);

    const collection = mongoose.connection.collection("clients");
    const indexes = await collection.indexes();
    const nameIndex = indexes.find((index) => index.key?.name === 1 && index.unique);

    if (nameIndex) {
        await collection.dropIndex(nameIndex.name);
        console.log(`Removed unique client name index: ${nameIndex.name}`);
    } else {
        console.log("No unique client name index was found.");
    }

    await mongoose.disconnect();
}

removeClientNameUniqueIndex().catch(async (error) => {
    console.error(error);
    await mongoose.disconnect();
    process.exitCode = 1;
});
