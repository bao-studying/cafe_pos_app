const express = require("express");
const router = express.Router();
const shiftController = require("../controllers/shiftController");

// Ca mẫu — /api/shifts/templates
router.get("/templates", shiftController.getShiftTemplates);
router.post("/templates", shiftController.createShiftTemplate);
router.patch("/templates/:id", shiftController.updateShiftTemplate);
router.delete("/templates/:id", shiftController.deleteShiftTemplate);

// Đăng ký ca — /api/shifts/register, /api/shifts/registrations
router.post("/register", shiftController.registerShift);
router.get("/registrations", shiftController.getShiftRegistrations);
router.patch("/registrations/:id", shiftController.updateShiftRegistration);

module.exports = router;
