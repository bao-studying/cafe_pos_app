const mongoose = require("mongoose");

const StockReceiptSchema = new mongoose.Schema(
  {
    ingredientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantityImported: { type: Number, required: true, min: 0 }, // Theo baseUnit (ví dụ: 2 Bịch)
    totalPrice: { type: Number, default: 0 },
    importedBy: { type: String, default: "" }, // _id hoặc tên user đăng nhập
    billImage: { type: String, default: "" }, // TODO: làm sau
  },
  { timestamps: true },
);

module.exports = mongoose.model("StockReceipt", StockReceiptSchema);
