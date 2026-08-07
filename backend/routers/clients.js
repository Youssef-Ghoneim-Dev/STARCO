const clientsrouter = require("express").Router();
const clientController = require("../controllers/clients")
const authMw = require("../midelwers/auth");
const CheckuserToken = require("../midelwers/Users/CheckUserToken");

clientsrouter.get(
    "/search",
    authMw,
    CheckuserToken,
    clientController.search
);
clientsrouter.get(
    "/",
    authMw,
    CheckuserToken,
    clientController.selectAll
);

clientsrouter.get(
    "/:id",
    authMw,
    CheckuserToken,
    clientController.selectOne
);

clientsrouter.post(
    "/",
    authMw,
    CheckuserToken,
    clientController.addOne
);

clientsrouter.put(
    "/:id",
    authMw,
    CheckuserToken,
    clientController.update
);

clientsrouter.delete(
    "/:id",
    authMw,
    CheckuserToken,
    clientController.deleteOne
);

module.exports = clientsrouter