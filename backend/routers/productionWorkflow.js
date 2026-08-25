const router = require("express").Router();
const controller = require("../controllers/productionWorkflow");

router.get("/reminders", controller.runReminders);

module.exports = router;
