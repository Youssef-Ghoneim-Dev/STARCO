const clientsrouter = require("express").Router();
const clientController = require("../controllers/clients")
const authMw = require("../midelwers/auth");

clientsrouter.get("/search", authMw, clientController.search);

module.exports = clientsrouter