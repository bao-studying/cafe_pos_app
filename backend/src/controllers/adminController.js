const Order = require("../models/Order");

exports.getRevenueReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // QUAN TRỌNG: new Date("2026-07-10") mặc định là 00:00:00 UTC (ĐẦU ngày),
    // không phải cuối ngày. Nếu không chỉnh lại, mọi đơn tạo trong chính ngày endDate
    // (VD: đơn vừa thanh toán lúc 14:00 hôm nay) sẽ bị $lte loại bỏ luôn,
    // khiến Dashboard "không cập nhật" dữ liệu mới tạo trong ngày.
    const startDateTime = new Date(`${startDate}T00:00:00.000Z`);
    const endDateTime = new Date(`${endDate}T23:59:59.999Z`);

    const report = await Order.aggregate([
      {
        $match: {
          status: "confirmed",
          createdAt: {
            $gte: startDateTime,
            $lte: endDateTime,
          },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          dailyRevenue: { $sum: "$totalAmount" },
          totalOrders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const totalRevenue = report.reduce(
      (sum, item) => sum + item.dailyRevenue,
      0,
    );

    res.status(200).json({
      totalRevenue,
      details: report,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
