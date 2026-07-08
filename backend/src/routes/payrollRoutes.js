const express = require("express");
const router = express.Router();
const payrollController = require("../controllers/payrollController");

router.post("/generate", payrollController.generatePayroll);
router.get("/:staffId/estimate", payrollController.getPayrollEstimate);
router.get("/:staffId", payrollController.getPayrollByStaff);

module.exports = router;
