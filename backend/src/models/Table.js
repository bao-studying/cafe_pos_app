const mongoose = require("mongoose");

const TableSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true }, // Tên/số bàn hiển thị, VD "Bàn 1", "A1"
    x: { type: Number, default: 40 }, // Toạ độ ngang trên sơ đồ (px)
    y: { type: Number, default: 40 }, // Toạ độ dọc trên sơ đồ (px)
    shape: { type: String, enum: ["square", "round"], default: "square" },
    seats: { type: Number, default: 4 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Table", TableSchema);
