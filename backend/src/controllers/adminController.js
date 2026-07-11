const Order = require("../models/Order");

const VN_TZ = "Asia/Ho_Chi_Minh"; // Giờ Việt Nam (UTC+7, không có giờ mùa hè)

// Tính mốc đầu ngày / cuối ngày theo ĐÚNG giờ Việt Nam (không phải UTC).
// VD: startDate="2026-07-10" -> 2026-07-10T00:00:00 giờ VN = 2026-07-09T17:00:00.000Z
function vnStartOfDay(dateStr) {
  return new Date(`${dateStr}T00:00:00.000+07:00`);
}
function vnEndOfDay(dateStr) {
  return new Date(`${dateStr}T23:59:59.999+07:00`);
}

// GET /api/admin/revenue?startDate=&endDate=
// Doanh thu theo NGÀY trong khoảng [startDate, endDate] — luôn trả đủ mọi ngày
// trong khoảng (kể cả ngày chưa có đơn nào -> revenue = 0), để biểu đồ không bị
// "thiếu cột" khi vài ngày trong tuần chưa phát sinh đơn.
exports.getRevenueReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const startDateTime = vnStartOfDay(startDate);
    const endDateTime = vnEndOfDay(endDate);

    const report = await Order.aggregate([
      {
        $match: {
          status: "confirmed",
          createdAt: { $gte: startDateTime, $lte: endDateTime },
        },
      },
      {
        $group: {
          // Nhóm theo ngày ĐÚNG giờ Việt Nam, tránh lệch ngày với đơn tạo lúc 0h-7h sáng
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
              timezone: VN_TZ,
            },
          },
          dailyRevenue: { $sum: "$totalAmount" },
          totalOrders: { $sum: 1 },
        },
      },
    ]);

    const reportMap = new Map(report.map((r) => [r._id, r]));

    // Điền đủ từng ngày trong khoảng, ngày nào không có đơn thì revenue/orders = 0
    const details = [];
    const cursor = new Date(`${startDate}T00:00:00`);
    const lastDay = new Date(`${endDate}T00:00:00`);
    while (cursor <= lastDay) {
      const key = cursor.toISOString().slice(0, 10);
      const found = reportMap.get(key);
      details.push({
        _id: key,
        dailyRevenue: found ? found.dailyRevenue : 0,
        totalOrders: found ? found.totalOrders : 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    const totalRevenue = details.reduce(
      (sum, item) => sum + item.dailyRevenue,
      0,
    );

    res.status(200).json({ totalRevenue, details });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/admin/revenue-hourly?date=YYYY-MM-DD
// Doanh thu theo TỪNG GIỜ (0h-23h) trong 1 ngày cụ thể, dùng cho biểu đồ đường
// kiểu chứng khoán ở tab "Hôm nay". Luôn trả đủ 24 giờ, giờ nào không có đơn = 0.
exports.getHourlyRevenue = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ message: "Thiếu tham số 'date'." });
    }

    const startDateTime = vnStartOfDay(date);
    const endDateTime = vnEndOfDay(date);

    const report = await Order.aggregate([
      {
        $match: {
          status: "confirmed",
          createdAt: { $gte: startDateTime, $lte: endDateTime },
        },
      },
      {
        $group: {
          _id: { $hour: { date: "$createdAt", timezone: VN_TZ } },
          hourlyRevenue: { $sum: "$totalAmount" },
          totalOrders: { $sum: 1 },
        },
      },
    ]);

    const reportMap = new Map(report.map((r) => [r._id, r]));

    const hourly = [];
    for (let h = 0; h < 24; h++) {
      const found = reportMap.get(h);
      hourly.push({
        hour: h,
        hourlyRevenue: found ? found.hourlyRevenue : 0,
        totalOrders: found ? found.totalOrders : 0,
      });
    }

    const totalRevenue = hourly.reduce(
      (sum, item) => sum + item.hourlyRevenue,
      0,
    );

    res.status(200).json({ totalRevenue, hourly });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
