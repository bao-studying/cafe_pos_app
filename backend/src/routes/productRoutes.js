const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");

// 🌎 PUBLIC ROUTES — Khách hàng / POS xem sản phẩm
router.get("/", productController.getAllProducts); // GET  /api/products?category=Cà phê hoặc /api/products?isAdmin=true
router.get("/:id", productController.getProductById); // GET  /api/products/:id

// 💼 ADMIN ROUTES — Quản lý thực đơn sản phẩm
router.post("/", productController.createProduct); // POST   /api/products
router.put("/:id", productController.updateProduct); // PUT    /api/products/:id
router.patch("/:id/hide", productController.deactivateProduct); // PATCH  /api/products/:id/hide

// ✅ THÊM ROUTE DELETE: Để Angular gọi hàm deleteProduct() chạy thực tế không bị báo lỗi 404
router.delete("/:id", productController.deleteProductHard); // DELETE /api/products/:id

module.exports = router;
