const router = require("express").Router();
const auth = require("../midelwers/auth");
const check = require("../midelwers/Users/CheckUserToken");
const controller = require("../controllers/projectsV2");
const panelsRouter = require("./panels");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

router.get("/client-preview/:key", controller.getPreview);
router.use("/:projectId/panels", panelsRouter);
router.get("/", auth, check, controller.getProjects);
router.get("/deleted", auth, check, controller.getDeletedProjects);
router.post("/", auth, check, controller.createProject);
router.get("/:id", auth, check, controller.getProject);
router.put("/:id", auth, check, controller.updateProject);
router.post("/:id/setup-lock", auth, check, controller.acquireSetupLock);
router.post("/:id/setup-complete", auth, check, controller.completeSetup);
router.post("/:id/submit", auth, check, controller.submitProject);
router.post("/:id/preview", auth, check, controller.regeneratePreview);
router.get("/:id/media", auth, check, controller.getProjectMedia);
router.get("/:id/media/whatsapp-link", auth, check, controller.getProjectMediaWhatsappLink);
router.get("/:id/media/:mediaId/file", auth, check, controller.getProjectMediaFile);
router.post("/:id/media", auth, check, upload.single("file"), controller.uploadProjectMedia);
router.delete("/:id/media/:mediaId", auth, check, controller.deleteProjectMedia);
router.patch("/:id", auth, check, controller.restoreProject);
router.delete("/:id/permanent", auth, check, controller.permanentlyDeleteProject);
router.delete("/:id", auth, check, controller.removeProject);

module.exports = router;
