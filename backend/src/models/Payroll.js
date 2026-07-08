const mongoose = require("mongoose");

const PayrollSchema = new mongoose.Schema(
  {
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    totalHours: { type: Number, required: true, default: 0 }, // snapshot tổng giờ công tháng đó
    hourlyRateSnapshot: { type: Number, required: true, default: 0 }, // snapshot đơn giá tại thời điểm chốt
    totalSalary: { type: Number, required: true, default: 0 }, // totalHours * hourlyRateSnapshot
    status: { type: String, enum: ["draft", "finalized"], default: "draft" },
  },
  { timestamps: true },
);

// Mỗi nhân viên chỉ có 1 bảng lương cho 1 tháng/năm
PayrollSchema.index({ staffId: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model("Payroll", PayrollSchema);
