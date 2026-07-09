// backend/src/routes/userRoutes.js
const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

// GET /api/users?role=staff — danh sách nhân viên
router.get("/", userController.getUsers);

// POST /api/users — tạo tài khoản nhân viên mới
router.post("/", userController.createStaff);

// GET /api/users/:userId/suggestions
router.get("/:userId/suggestions", userController.getOrderSuggestions);

// PATCH /api/users/:id — sửa thông tin nhân viên
router.patch("/:id", userController.updateUser);

// PATCH /api/users/:id/status — khoá/mở tài khoản
router.patch("/:id/status", userController.updateUserStatus);

module.exports = router;
