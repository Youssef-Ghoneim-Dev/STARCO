const projectModels = require("../models/projects");
const clientModels = require("../models/clients");
const syncClient = require("../services/syncClient");

const getProjects = async (req, res, next) => {
    try {

        const projects = await projectModels.selectall({
            isDeleted: false
        });

        return res.status(200).json(projects);

    } catch (error) {
        next(error);
    }
};

const getProject = async (req, res, next) => {
    try {

        const projectId = req.params.id;

        const project = await projectModels.select_one({
            _id: projectId,
            isDeleted: false
        });

        if (project === null) {
            return res.status(404).json({
                status: "error",
                msg: `project id ${projectId} not found`
            });
        }

        return res.status(200).json(project);

    } catch (error) {
        next(error);
    }
};

const getDeletedProjects = async (req, res, next) => {
    try {

        const projects = await projectModels.selectall({
            isDeleted: true
        });

        return res.status(200).json(projects);

    } catch (error) {
        next(error);
    }
};

const addProject = async (req, res, next) => {
    try {

        const project = { ...req.body };

        project.userId = req.decodedToken.id;

        await syncClient(project);

        await projectModels.add_one(project);

        return res.status(201).json({
            status: "ok",
            msg: "project added"
        });

    } catch (error) {
        next(error);
    }
};

const updateProject = async (req, res, next) => {
    try {

        const projectId = req.params.id;
        const project = {
            id: projectId,
            ...req.body,
            updatedAt: Date.now()
        };
        await syncClient(project);
        const queryResult = await projectModels.update(project);

        if (queryResult === null) {
            return res.status(404).json({
                status: "error",
                msg: `project id ${projectId} not found`
            });
        }

        return res.status(200).json({
            status: "ok",
            msg: "project updated"
        });

    } catch (error) {
        next(error);
    }
};

const deleteProject = async (req, res, next) => {
    try {

        const projectId = req.params.id;

        const result = await projectModels.deleteOne(projectId);

        if (result === null) {
            return res.status(404).json({
                status: "error",
                msg: `project id ${projectId} not found`
            });
        }

        return res.status(200).json({
            status: "ok",
            msg: "project deleted"
        });

    } catch (error) {
        next(error);
    }
};

const restoreProject = async (req, res, next) => {
    try {

        const projectId = req.params.id;

        const result = await projectModels.restore(projectId);

        if (result === null) {
            return res.status(404).json({
                status: "error",
                msg: `project id ${projectId} not found`
            });
        }

        return res.status(200).json({
            status: "ok",
            msg: "project restored"
        });

    } catch (error) {
        next(error);
    }
};


module.exports = {
    getProjects,
    getProject,
    addProject,
    updateProject,
    deleteProject,
    getDeletedProjects,
    restoreProject
}