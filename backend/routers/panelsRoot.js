const router = require("express").Router();
const auth = require("../midelwers/auth");
const check = require("../midelwers/Users/CheckUserToken");
const controller = require("../controllers/panels");

router.get("/", auth, check, controller.listAllPanels);

module.exports = router;
