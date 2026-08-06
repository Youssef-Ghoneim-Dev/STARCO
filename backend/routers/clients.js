const clientsrouter = require("express").Router();
const clientController = require("../controllers/clients")
const authMw = require("../midelwers/auth");
const CheckuserToken = require("../midelwers/Users/CheckUserToken");

clientsrouter.get("/search", authMw, CheckuserToken, clientController.search);

module.exports = clientsrouter