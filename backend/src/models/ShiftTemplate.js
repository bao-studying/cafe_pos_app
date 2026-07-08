const mongoose = require("mongoose");

const ShiftTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // VD "Ca sáng", "Ca tối"
    startTime: { type: String, required: true }, // dạng "HH:mm", VD "07:00"
    endTime: { type: String, required: true }, // dạng "HH:mm", VD "15:00"
    isActive: { type: Boolean, default: true }, // ẩn ca cũ mà không mất dữ liệu lịch sử
  },
  { timestamps: true },
);

module.exports = mongoose.model("ShiftTemplate", ShiftTemplateSchema);
