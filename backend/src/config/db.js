const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Đã kết nối MongoDB thành công");

 
    try {
      const ScheduleSlot = require("../models/ScheduleSlot");
      const result = await ScheduleSlot.syncIndexes();
      console.log("✅ Đã đồng bộ index cho ScheduleSlot:", result);
    } catch (indexErr) {
      console.error(
        "⚠️ Lỗi đồng bộ index ScheduleSlot (không chặn server chạy):",
        indexErr.message,
      );
    }
  } catch (err) {
    console.error("❌ Lỗi kết nối DB:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
