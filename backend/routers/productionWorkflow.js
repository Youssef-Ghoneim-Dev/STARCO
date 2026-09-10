const router = require("express").Router();
const controller = require("../controllers/productionWorkflow");

router.get("/reminders", controller.runReminders);
router.get("/reminders-cairo-standard", controller.runReminders);

module.exports = router;
