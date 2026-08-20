const dbconfig = require("../DB/config");
const collectionName = "projects";
const projectSchema = require("../DB/schema/projects");

const select_one = async (condition) => {
    const openconnection = await dbconfig.openconnection(
        collectionName,
        projectSchema
    );

    return await openconnection.findOne(condition);
};

const selectall = async (condition) => {
    const openconnection = await dbconfig.openconnection(
        collectionName,
        projectSchema
    );

    return await openconnection
        .find(condition)
        .sort({ updatedAt: -1 });
};

const add_one = async (project) => {
    const openconnection = await dbconfig.openconnection(
        collectionName,
        projectSchema
    );

    return await openconnection.insertOne(project);
};

const create = async (project) => {
    const openconnection = await dbconfig.openconnection(
        collectionName,
        projectSchema
    );

    return openconnection.create(project);
};

const update_whatsapp_project = async (projectId, update) => {
    const openconnection = await dbconfig.openconnection(
        collectionName,
        projectSchema
    );

    return openconnection.findByIdAndUpdate(projectId, update, { new: true });
};

const update = async (project) => {
    const openconnection = await dbconfig.openconnection(
        collectionName,
        projectSchema
    );

    return await openconnection.findByIdAndUpdate(
        project.id,
        project
    );
};

const deleteOne = async (projectId) => {
    const openconnection = await dbconfig.openconnection(
        collectionName,
        projectSchema
    );

    return await openconnection.findByIdAndUpdate(
        projectId,
        {
            isDeleted: true,
            updatedAt: Date.now()
        }
    );
};

const restore = async (projectId) => {
    const openconnection = await dbconfig.openconnection(
        collectionName,
        projectSchema
    );

    return await openconnection.findByIdAndUpdate(
        projectId,
        {
            isDeleted: false,
            updatedAt: Date.now()
        }
    );
};

module.exports = {
    select_one,
    selectall,
    add_one,
    create,
    update_whatsapp_project,
    update,
    deleteOne,
    restore
};
