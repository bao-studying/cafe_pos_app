const mongoose = require("mongoose");

const ScheduleSlotSchema = new mongoose.Schema(
  {
    // 1 = Thứ 2 ... 7 = Chủ nhật
    dayOfWeek: { type: Number, required: true, min: 1, max: 7 },
    shiftTemplateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ShiftTemplate",
      required: true,
    },
    // Số lượng nhân viên tối đa được phép đăng ký cho ô này
    capacity: { type: Number, required: true, min: 1, default: 1 },
  },
  { timestamps: true },
);

// Mỗi (Thứ, Ca mẫu) chỉ có 1 cấu hình sức chứa
ScheduleSlotSchema.index(
  { dayOfWeek: 1, shiftTemplateId: 1 },
  { unique: true },
);

module.exports = mongoose.model("ScheduleSlot", ScheduleSlotSchema);
