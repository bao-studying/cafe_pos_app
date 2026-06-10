const Order = require("../models/Order");

exports.getRevenueReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const report = await Order.aggregate([
      {
        $match: {
          status: "confirmed",
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
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

    const totalRevenue = report.reduce((sum, item) => sum + item.dailyRevenue, 0);

    res.status(200).json({
      totalRevenue,
      details: report,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
