const mongoose = require("mongoose");

const ShiftRegistrationSchema = new mongoose.Schema(
  {
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    shiftTemplateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ShiftTemplate",
      required: true,
    },
    date: { type: Date, required: true }, // ngày làm việc đăng ký (không giờ)
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    note: { type: String, default: "" }, // lý do từ chối (nếu có) hoặc ghi chú của admin
  },
  { timestamps: true },
);

// Một nhân viên không đăng ký trùng cùng 1 ca trong cùng 1 ngày
ShiftRegistrationSchema.index(
  { staffId: 1, shiftTemplateId: 1, date: 1 },
  { unique: true },
);

module.exports = mongoose.model("ShiftRegistration", ShiftRegistrationSchema);
