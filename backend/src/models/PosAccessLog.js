const mongoose = require("mongoose");

const PosAccessLogSchema = new mongoose.Schema(
  {
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    loginTime: { type: Date, required: true, default: Date.now },
    logoutTime: { type: Date, default: null },
    deviceInfo: { type: String, default: "" }, // tuỳ chọn, VD user-agent trình duyệt máy POS
  },
  { timestamps: true },
);

module.exports = mongoose.model("PosAccessLog", PosAccessLogSchema);
