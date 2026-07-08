const express = require("express");
const router = express.Router();
const tableController = require("../controllers/tableController");

// Đường dẫn: /api/tables
router.get("/", tableController.getTables);
router.post("/", tableController.createTable);
router.patch("/:id", tableController.updateTable);
router.delete("/:id", tableController.deleteTable);

module.exports = router;
