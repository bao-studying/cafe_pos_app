const express = require("express");
const router = express.Router();
const scheduleController = require("../controllers/scheduleController");

router.get("/slots", scheduleController.getSlotConfigs);
router.post("/slots", scheduleController.upsertSlotConfig);
router.delete("/slots/:id", scheduleController.deleteSlotConfig);

router.get("/board", scheduleController.getBoard);

module.exports = router;
