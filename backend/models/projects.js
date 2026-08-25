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

const findClientPreview = async (projectId, clientPreviewToken) => {
    const openconnection = await dbconfig.openconnection(
        collectionName,
        projectSchema
    );

    return openconnection.findOne({
        _id: projectId,
        clientPreviewToken,
        status: { $in: ["quoteCompleted", "executionPdfRequested", "executionPdfReady", "executionOrdered", "manufacturingFilesPending", "manufacturingFilesReady", "laserFilesDownloaded", "completed"] },
        isDeleted: false
    });
};

const findClientPreviewByToken = async (clientPreviewToken) => {
    const openconnection = await dbconfig.openconnection(
        collectionName,
        projectSchema
    );

    return openconnection.findOne({
        clientPreviewToken,
        status: { $in: ["quoteCompleted", "executionPdfRequested", "executionPdfReady", "executionOrdered", "manufacturingFilesPending", "manufacturingFilesReady", "laserFilesDownloaded", "completed"] },
        isDeleted: false
    });
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

    return openconnection.findByIdAndUpdate(projectId, update, { returnDocument: "after" });
};

const update = async (project) => {
    const openconnection = await dbconfig.openconnection(
        collectionName,
        projectSchema
    );

    return await openconnection.findByIdAndUpdate(project.id, project, { returnDocument: "after" });
};

const claimByEngineer = async (projectId, engineerId) => {
    const openconnection = await dbconfig.openconnection(collectionName, projectSchema);

    return openconnection.findOneAndUpdate(
        {
            _id: projectId,
            isDeleted: false,
            status: "pending",
            engineerId: null
        },
        {
            engineerId,
            status: "inProgress"
        },
        { returnDocument: "after" }
    );
};

const updateOwnedProject = async (projectId, engineerId, updates) => {
    const openconnection = await dbconfig.openconnection(collectionName, projectSchema);
    return openconnection.findOneAndUpdate(
        {
            _id: projectId,
            isDeleted: false,
            engineerId,
            status: { $in: ["inProgress", "editing", "editingByEngineer", "editingByOwner"] }
        },
        { ...updates, updatedAt: Date.now() },
        { returnDocument: "after", runValidators: true }
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

const deleteForever = async (projectId) => {
    const openconnection = await dbconfig.openconnection(collectionName, projectSchema);
    return openconnection.findOneAndDelete({ _id: projectId, isDeleted: true });
};

module.exports = {
    select_one,
    selectall,
    findClientPreview,
    findClientPreviewByToken,
    add_one,
    create,
    update_whatsapp_project,
    update,
    claimByEngineer,
    updateOwnedProject,
    deleteOne,
    restore,
    deleteForever
};
