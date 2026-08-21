const clientModels = require("../models/clients");

const syncClient = async (project) => {

    // A project is autosaved while the engineer is still filling it in.  Do
    // not create/update a client record until the client data is complete.
    if (
        !project?.client?.name?.trim() ||
        !project.client.type ||
        project.client.profitPercentage == null ||
        Number(project.client.profitPercentage) < 10
    ) {
        return;
    }

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
