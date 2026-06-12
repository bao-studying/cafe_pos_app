const mongoose = require("mongoose");

const ReportDetailSchema = new mongoose.Schema(
  {
    ingredientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    actualBaseQty: { type: Number, default: 0 }, // Ví dụ: còn 1 Bịch
    actualSubQty: { type: Number, default: 0 }, // Ví dụ: còn 250 gram lẻ
    totalActualSub: { type: Number, required: true }, // = actualBaseQty * conversionRate + actualSubQty
    theoreticalSub: { type: Number, default: 0 }, // Tồn lý thuyết tại thời điểm kiểm (snapshot)
    variance: { type: Number, default: 0 }, // totalActualSub - theoreticalSub
    variancePercent: { type: Number, default: 0 },
  },
  { _id: false },
);

const StaffStockReportSchema = new mongoose.Schema(
  {
    staffId: { type: String, required: true },
    staffName: { type: String, default: "" },
    note: { type: String, default: "" },
    details: [ReportDetailSchema],
  },
  { timestamps: true },
);

module.exports = mongoose.model("StaffStockReport", StaffStockReportSchema);
