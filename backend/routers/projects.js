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
const executionUpload = multer({
    storage: multer.memoryStorage(),
    // Android file pickers sometimes report valid PDFs/images as
    // application/octet-stream. Validate the in-memory content in the
    // controller instead of silently dropping the selected file here.
    limits: { fileSize: 25 * 1024 * 1024 }
});
const manufacturingUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }
});
const manufacturingChunkUpload = multer({
    storage: multer.memoryStorage(),
    // Keep every request comfortably below Vercel's 4.5 MB payload limit.
    limits: { fileSize: 3.25 * 1024 * 1024 }
});

// Public, key-protected page used by the completed-project WhatsApp link.
// Keep it before /:id so Express does not treat "client" as a project id.
projectsRouter.get(
    "/client/:id",
    projectController.getClientProjectPreview
);

projectsRouter.get(
    "/client-preview/:key",
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
projectsRouter.get("/:id/media/whatsapp-link", authMw, CheckUserToken, projectController.getProjectMediaWhatsappLink);

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
    "/:id/submit",
    authMw,
    CheckUserToken,
    projectController.submitMarketingProject
);

projectsRouter.post(
    "/:id/complete",
    authMw,
    CheckUserToken,
    projectController.completeProject
);

projectsRouter.post("/:id/execution-pdf/request", authMw, CheckUserToken, projectController.requestExecutionPdf);
projectsRouter.post("/:id/execution-pdf/files", authMw, CheckUserToken, executionUpload.single("file"), projectController.uploadExecutionPdfFile);
projectsRouter.get("/:id/execution-pdf/:panelId/files/:fileId", authMw, CheckUserToken, projectController.getExecutionPdfFile);
projectsRouter.post("/:id/execution-pdf/finish", authMw, CheckUserToken, projectController.finishExecutionPdf);
projectsRouter.post("/:id/execution-pdf/skip", authMw, CheckUserToken, projectController.skipExecutionPdf);
projectsRouter.post("/:id/execution-pdf/request-changes", authMw, CheckUserToken, projectController.requestExecutionPdfChanges);
projectsRouter.post("/:id/execution-pdf/confirm", authMw, CheckUserToken, projectController.confirmExecution);
projectsRouter.post("/:id/manufacturing/upload-session", authMw, CheckUserToken, projectController.startManufacturingFileUpload);
projectsRouter.post("/:id/manufacturing/upload-chunk", authMw, CheckUserToken, manufacturingChunkUpload.single("chunk"), projectController.uploadManufacturingFileChunk);
projectsRouter.post("/:id/manufacturing/upload-complete", authMw, CheckUserToken, projectController.completeManufacturingFileUpload);
projectsRouter.post("/:id/manufacturing/files", authMw, CheckUserToken, manufacturingUpload.single("file"), projectController.uploadManufacturingFile);
projectsRouter.get("/:id/manufacturing/:panelId/files/:fileId", authMw, CheckUserToken, projectController.getManufacturingFile);
projectsRouter.get("/:id/manufacturing/:panelId/archive", authMw, CheckUserToken, projectController.downloadManufacturingArchive);
projectsRouter.post("/:id/manufacturing/finish", authMw, CheckUserToken, projectController.finishManufacturingFiles);
projectsRouter.post("/:id/manufacturing/downloaded-to-laser", authMw, CheckUserToken, projectController.markManufacturingDownloadedToLaser);
projectsRouter.post("/:id/manufacturing/delay", authMw, CheckUserToken, projectController.recordManufacturingDelay);
projectsRouter.post("/:id/manufacturing/stage", authMw, CheckUserToken, projectController.updateManufacturingStage);

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
