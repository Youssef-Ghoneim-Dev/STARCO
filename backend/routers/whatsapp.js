const router = require("express").Router();
const controller = require("../controllers/whatsapp");
const auth = require("../midelwers/auth");
const checkUserToken = require("../midelwers/Users/CheckUserToken");

router.get("/webhook", controller.verifyWebhook);
router.post("/webhook", controller.receiveWebhook);
router.post("/test-message", auth, checkUserToken, controller.sendTestMessage);
router.post("/test-template", auth, checkUserToken, controller.sendTestTemplate);

module.exports = router;
