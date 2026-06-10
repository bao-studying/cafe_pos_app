const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

const { login, register } = authController;

// Tuyến đường: POST /api/auth/login
router.post("/login", login);

// Tuyến đường: POST /api/auth/register
router.post("/register", register);

module.exports = router;
