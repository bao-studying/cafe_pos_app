const express = require("express");
const router = express.Router();
const stockController = require("../controllers/stockController");

// Nguyên liệu
router.get("/ingredients", stockController.getIngredients);
router.put("/ingredients/:id/config", stockController.updateIngredientConfig);

// Tìm sản phẩm cho popup công thức
router.get("/products-search", stockController.searchProductsForRecipe);

// Công thức
router.get("/recipes/:ingredientId", stockController.getRecipesByIngredient);
router.put("/recipes/:ingredientId", stockController.saveRecipesForIngredient);

// Nhập kho
router.post("/receipts", stockController.createStockReceipt);
router.get("/receipts/:ingredientId", stockController.getReceiptHistory);

// Kiểm kho nhân viên
router.post("/reports", stockController.submitStaffReport);
router.get("/reports", stockController.getStaffReports);

module.exports = router;
