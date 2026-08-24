const clientsrouter = require("express").Router();
const clientController = require("../controllers/clients")
const authMw = require("../midelwers/auth");
const CheckuserToken = require("../midelwers/Users/CheckUserToken");
const clientValidation = require("../validatetion/clients");

clientsrouter.get(
    "/search",
    authMw,
    CheckuserToken,
    clientController.search
);
clientsrouter.get(
    "/similar",
    authMw,
    CheckuserToken,
    clientController.findSimilar
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
    clientValidation,
    clientController.addOne
);

clientsrouter.put(
    "/:id",
    authMw,
    CheckuserToken,
    clientValidation,
    clientController.update
);

clientsrouter.delete(
    "/:id",
    authMw,
    CheckuserToken,
    clientController.deleteOne
);

module.exports = clientsrouter
