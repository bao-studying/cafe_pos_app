const Attendance = require("../models/Attendance");
const Payroll = require("../models/Payroll");
const User = require("../models/User");

// POST /api/payroll/generate?month=&year= — chốt lương cho toàn bộ nhân viên trong tháng
exports.generatePayroll = async (req, res) => {
  try {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    if (!month || !year) {
      return res.status(400).json({ message: "Thiếu month hoặc year." });
    }

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const staffList = await User.find({ role: "staff" });
    const results = [];

    for (const staff of staffList) {
      const attendanceRecords = await Attendance.find({
        staffId: staff._id,
        status: "checked-out",
        checkInTime: { $gte: start, $lt: end },
      });

      const totalHours = attendanceRecords.reduce(
        (sum, a) => sum + (a.actualHours || 0),
        0,
      );
      const roundedHours = Math.round(totalHours * 100) / 100;
      const totalSalary = Math.round(roundedHours * staff.hourlyRate);

      const payroll = await Payroll.findOneAndUpdate(
        { staffId: staff._id, month, year },
        {
          staffId: staff._id,
          month,
          year,
          totalHours: roundedHours,
          hourlyRateSnapshot: staff.hourlyRate,
          totalSalary,
          status: "finalized",
        },
        { upsert: true, new: true },
      );

      results.push(payroll);
    }

    res.json({
      message: `Đã chốt lương tháng ${month}/${year} cho ${results.length} nhân viên.`,
      payrolls: results,
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
  }
};

// GET /api/payroll/:staffId — lịch sử lương đã chốt của 1 nhân viên
exports.getPayrollByStaff = async (req, res) => {
  try {
    const payrolls = await Payroll.find({ staffId: req.params.staffId }).sort({
      year: -1,
      month: -1,
    });
    res.json(payrolls);
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
  }
};

// GET /api/payroll/:staffId/estimate?month=&year= — lương tạm tính, chưa chốt
// Dùng cho trang "Ca làm của tôi" để nhân viên xem trước khi admin chốt lương
exports.getPayrollEstimate = async (req, res) => {
  try {
    const staffId = req.params.staffId;
    const now = new Date();
    const month = Number(req.query.month) || now.getMonth() + 1;
    const year = Number(req.query.year) || now.getFullYear();

    const staff = await User.findById(staffId);
    if (!staff) {
      return res.status(404).json({ message: "Không tìm thấy nhân viên." });
    }

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const attendanceRecords = await Attendance.find({
      staffId,
      status: "checked-out",
      checkInTime: { $gte: start, $lt: end },
    });

    const totalHours = attendanceRecords.reduce(
      (sum, a) => sum + (a.actualHours || 0),
      0,
    );
    const roundedHours = Math.round(totalHours * 100) / 100;
    const estimatedSalary = Math.round(roundedHours * staff.hourlyRate);

    res.json({
      month,
      year,
      totalHours: roundedHours,
      hourlyRate: staff.hourlyRate,
      estimatedSalary,
      note: "Đây là số liệu tạm tính, chưa được admin chốt.",
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
  }
};
