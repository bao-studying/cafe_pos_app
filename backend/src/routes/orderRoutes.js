const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");

// Đường dẫn: /api/orders
router.get("/", orderController.getOrders);
router.get("/:id", orderController.getOrderById);
router.post("/", orderController.createOrder);
router.patch("/:id/status", orderController.updateOrderStatus);

module.exports = router;
