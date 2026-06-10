const express = require("express");
const router = express.Router();
const Order = require("../models/Order");

router.post("/webhook", async (req, res) => {
  try {
    const { data } = req.body;

    if (data && data.status === "PAID") {
      const paymentCode = data.orderCode;
      const order = await Order.findOne({ paymentCode });

      if (order) {
        order.status = "confirmed";
        await order.save();

        console.log(`✅ Đơn hàng ${paymentCode} đã được thanh toán thành công!`);
        return res.status(200).json({ success: true, message: "Nhận dữ liệu thành công" });
      }
    }

    res.status(400).json({ success: false, message: "Dữ liệu không hợp lệ" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
