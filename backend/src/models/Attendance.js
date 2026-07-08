const mongoose = require("mongoose");

const AttendanceSchema = new mongoose.Schema(
  {
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Có thể null nếu nhân viên check-in tự do, không gắn với ca đã đăng ký
    shiftRegistrationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ShiftRegistration",
      default: null,
    },
    checkInTime: { type: Date, required: true },
    checkOutTime: { type: Date, default: null },
    actualHours: { type: Number, default: 0, min: 0 }, // tự tính khi check-out
    status: {
      type: String,
      enum: ["checked-in", "checked-out"],
      default: "checked-in",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Attendance", AttendanceSchema);
