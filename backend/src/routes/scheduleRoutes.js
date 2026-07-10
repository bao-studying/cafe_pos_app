const express = require("express");
const router = express.Router();
const scheduleController = require("../controllers/scheduleController");

router.post("/slots", scheduleController.upsertSlotConfig);
router.delete("/slots/:id", scheduleController.deleteSlotConfig);
router.post("/copy-week", scheduleController.copyWeek);

router.get("/board", scheduleController.getBoard);
router.get("/admin-board", scheduleController.getAdminBoard);

module.exports = router;
