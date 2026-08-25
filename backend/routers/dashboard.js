const dashboardRouter = require("express").Router();
const authMw = require("../midelwers/auth");
const CheckUserToken = require("../midelwers/Users/CheckUserToken");
const dashboardController = require("../controllers/dashboard");

dashboardRouter.get("/capture", dashboardController.captureDailyStatistics);
dashboardRouter.get("/", authMw, CheckUserToken, dashboardController.getStatistics);

module.exports = dashboardRouter;
