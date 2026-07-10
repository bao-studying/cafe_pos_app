const mongoose = require("mongoose");

const ScheduleSlotSchema = new mongoose.Schema(
  {
    // Ngày Thứ 2 (00:00) của tuần mà cấu hình này áp dụng.
    // ĐÃ ĐỔI: trước đây sức chứa là "mẫu lặp lại" theo Thứ (dùng chung mọi tuần),
    // giờ mỗi tuần có cấu hình RIÊNG để hỗ trợ tính năng "Sao chép từ tuần trước".
    weekStart: { type: Date, required: true },
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

// Mỗi (Tuần, Thứ, Ca mẫu) chỉ có 1 cấu hình sức chứa
ScheduleSlotSchema.index(
  { weekStart: 1, dayOfWeek: 1, shiftTemplateId: 1 },
  { unique: true },
);

module.exports = mongoose.model("ScheduleSlot", ScheduleSlotSchema);
