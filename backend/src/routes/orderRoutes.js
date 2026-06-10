const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");

// Đường dẫn: POST /api/orders
router.post("/", orderController.createOrder);

module.exports = router;
