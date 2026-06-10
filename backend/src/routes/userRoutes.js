// backend/src/routes/userRoutes.js
const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

// GET /api/users/:userId/suggestions
router.get("/:userId/suggestions", userController.getOrderSuggestions);

module.exports = router;
