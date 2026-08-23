const projectsRouter = require("express").Router();

const projectController = require("../controllers/projects");
const projectValidation = require("../validatetion/projects");
const multer = require("multer");

const authMw = require("../midelwers/auth");
const CheckUserToken = require("../midelwers/Users/CheckUserToken");
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (req, file, callback) => callback(null, file.mimetype.startsWith("image/") || file.mimetype.startsWith("audio/"))
});

// Public, key-protected page used by the completed-project WhatsApp link.
// Keep it before /:id so Express does not treat "client" as a project id.
projectsRouter.get(
    "/client/:id",
    projectController.getClientProjectPreview
);

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
projectsRouter.post("/:id/media", authMw, CheckUserToken, upload.single("file"), projectController.uploadProjectMedia);
projectsRouter.delete("/:id/media/:mediaId", authMw, CheckUserToken, projectController.deleteProjectMedia);

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
    "/:id/start-editing",
    authMw,
    CheckUserToken,
    projectController.startProjectEditing
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

projectsRouter.delete(
    "/:id/permanent",
    authMw,
    CheckUserToken,
    projectController.permanentlyDeleteProject
);

module.exports = projectsRouter;
