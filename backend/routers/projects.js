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

projectsRouter.get("/:id/media", authMw, CheckUserToken, projectController.getProjectMedia);
projectsRouter.get("/:id/media/:mediaId/file", authMw, CheckUserToken, projectController.getProjectMediaFile);

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

projectsRouter.post(
    "/:id/complete",
    authMw,
    CheckUserToken,
    projectController.completeProject
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
