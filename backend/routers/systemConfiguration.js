const router = require("express").Router();

const controller = require("../controllers/systemConfiguration");

const authMw = require("../midelwers/auth");
const CheckuserToken = require("../midelwers/Users/CheckUserToken");

router.get(
    "",
    authMw,
    CheckuserToken,
    controller.get
);

router.put(
    "",
    authMw,
    CheckuserToken,
    controller.update
);

module.exports = router;