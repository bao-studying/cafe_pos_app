// backend/src/routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");

// GET /api/admin/revenue?startDate=2025-01-01&endDate=2025-12-31
router.get("/revenue", adminController.getRevenueReport);

module.exports = router;
