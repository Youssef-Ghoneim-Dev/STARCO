const projectsRouter = require("express").Router();

const projectController = require("../controllers/projects");
const projectValidation = require("../validatetion/projects");

const authMw = require("../midelwers/auth");
const CheckUserToken = require("../midelwers/Users/CheckUserToken");

projectsRouter.get(
    "",
    authMw,
    CheckUserToken,
    projectController.getProjects
);

projectsRouter.get(
    "/deleted",
    authMw,
    CheckUserToken,
    projectController.getDeletedProjects
);

projectsRouter.get(
    "/:id",
    authMw,
    CheckUserToken,
    projectController.getProject
);

projectsRouter.post(
    "/",
    authMw,
    CheckUserToken,
    projectValidation,
    projectController.addProject
);

projectsRouter.put(
    "/:id",
    authMw,
    CheckUserToken,
    projectValidation,
    projectController.updateProject
);

projectsRouter.delete(
    "/:id",
    authMw,
    CheckUserToken,
    projectController.deleteProject
);

projectsRouter.patch(
    "/:id",
    authMw,
    CheckUserToken,
    projectController.restoreProject
);

module.exports = projectsRouter;