const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true, default: 0 },
    costPrice: { type: Number, default: 0 },
    description: String,
    imageUrl: String,
    isActive: { type: Boolean, default: true },

    // ==== CÁC FIELD DÀNH CHO NGUYÊN LIỆU (category === 'Nguyên liệu') ====
    quantity: { type: Number, default: 0 }, // Tổng tồn kho tính theo subUnit (gram/ml...)
    baseUnit: { type: String, default: "Bịch" }, // Đơn vị lớn khi nhập kho (Bịch/Hộp/Chai...)
    subUnit: { type: String, default: "g" }, // Đơn vị nhỏ khi tiêu hao (g/ml/cái...)
    conversionRate: { type: Number, default: 1 }, // 1 baseUnit = bao nhiêu subUnit
    minStockAlert: { type: Number, default: 0 }, // Ngưỡng cảnh báo tính theo subUnit
  },
  { timestamps: true },
);

module.exports = mongoose.model("Product", ProductSchema);
