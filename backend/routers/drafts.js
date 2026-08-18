const draftsRouter = require("express").Router();

const draftController = require("../controllers/drafts");

const authMw = require("../midelwers/auth");
const CheckuserToken = require("../midelwers/Users/CheckUserToken");

draftsRouter.get(
    "/status",
    authMw,
    CheckuserToken,
    draftController.getDraftStatus
);

draftsRouter.get(
    "/",
    authMw,
    CheckuserToken,
    draftController.getDraft
);

draftsRouter.put(
    "/",
    authMw,
    CheckuserToken,
    draftController.saveDraft
);

draftsRouter.delete(
    "/",
    authMw,
    CheckuserToken,
    draftController.deleteDraft
);

draftsRouter.patch(
    "/heartbeat",
    authMw,
    CheckuserToken,
    draftController.heartbeat
);

module.exports = draftsRouter;
