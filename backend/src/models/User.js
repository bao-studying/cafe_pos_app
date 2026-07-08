const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "staff", "admin"], default: "user" },
    orderHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
    // Đơn giá lương theo giờ (chỉ áp dụng cho role "staff")
    hourlyRate: { type: Number, default: 0, min: 0 },
    // Cho phép admin khoá/mở tài khoản nhân viên mà không cần xoá
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", UserSchema);
