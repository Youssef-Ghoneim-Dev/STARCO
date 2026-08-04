const clientModels = require("../models/clients");

const syncClient = async (project) => {

    let client = await clientModels.select_one({
        name: project.client.name
    });

    if (client === null) {

        await clientModels.add_one({
            name: project.client.name,
            type: project.client.type,
            profitPercentage: project.client.profitPercentage
        });

        client = await clientModels.select_one({
            name: project.client.name
        });

    } else if (
        client.type !== project.client.type ||
        client.profitPercentage !== project.client.profitPercentage
    ) {

        await clientModels.update({
            id: client._id,
            name: project.client.name,
            type: project.client.type,
            profitPercentage: project.client.profitPercentage
        });

        client.type = project.client.type;
        client.profitPercentage = project.client.profitPercentage;
    }

    project.client = {
        id: client._id,
        name: client.name,
        type: client.type,
        profitPercentage: client.profitPercentage
    };
};

module.exports = syncClient;