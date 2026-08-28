const router = require("express").Router();
const auth = require("../midelwers/auth");
const check = require("../midelwers/Users/CheckUserToken");
const controller = require("../controllers/notifications");

router.use(auth, check);
router.get("/", controller.list);
router.get("/unread-count", controller.count);
router.get("/push/config", controller.config);
router.post("/push/subscribe", controller.subscribe);
router.delete("/push/subscribe", controller.unsubscribe);
router.patch("/read-all", controller.readAll);
router.patch("/project/:projectId/read", controller.readProject);
router.patch("/:id/read", controller.readOne);

module.exports = router;
