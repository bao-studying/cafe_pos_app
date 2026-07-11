const Attendance = require("../models/Attendance");
const User = require("../models/User");
const { getIO } = require("../socket");

// POST /api/attendance/check-in
exports.checkIn = async (req, res) => {
  try {
    const { staffId, shiftRegistrationId } = req.body;
    if (!staffId) {
      return res.status(400).json({ message: "Thiếu staffId." });
    }

    // ĐÃ THÊM: kiểm tra staffId có thật trong DB không — tránh trường hợp ID cũ/rác
    // (VD: localStorage cũ trên điện thoại còn ID từ lúc test ở database khác) ghi được
    // Attendance với staffId "ma", khiến populate ra null và admin không bao giờ thấy online.
    const staffExists = await User.exists({ _id: staffId });
    if (!staffExists) {
      return res.status(404).json({
        message:
          "Không tìm thấy tài khoản nhân viên này trong hệ thống. Vui lòng đăng xuất và đăng nhập lại.",
      });
    }

    // Không cho check-in mới nếu đang có ca chưa check-out
    const openAttendance = await Attendance.findOne({
      staffId,
      status: "checked-in",
    });
    if (openAttendance) {
      return res
        .status(400)
        .json({
          message: "Bạn đang trong ca làm việc, chưa check-out ca trước đó.",
        });
    }

    const attendance = await Attendance.create({
      staffId,
      shiftRegistrationId: shiftRegistrationId || null,
      checkInTime: new Date(),
      status: "checked-in",
    });

    const populated = await attendance.populate("staffId", "name phone");
    getIO().emit("attendance:check-in", populated);

    res
      .status(201)
      .json({ message: "Check-in thành công.", attendance: populated });
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
  }
};

// POST /api/attendance/check-out
exports.checkOut = async (req, res) => {
  try {
    const { staffId } = req.body;
    if (!staffId) {
      return res.status(400).json({ message: "Thiếu staffId." });
    }

    const staffExists = await User.exists({ _id: staffId });
    if (!staffExists) {
      return res.status(404).json({
        message:
          "Không tìm thấy tài khoản nhân viên này trong hệ thống. Vui lòng đăng xuất và đăng nhập lại.",
      });
    }

    const attendance = await Attendance.findOne({
      staffId,
      status: "checked-in",
    }).sort({ checkInTime: -1 });
    if (!attendance) {
      return res
        .status(400)
        .json({ message: "Không tìm thấy ca đang mở để check-out." });
    }

    const checkOutTime = new Date();
    const hoursWorked =
      (checkOutTime - attendance.checkInTime) / (1000 * 60 * 60);

    attendance.checkOutTime = checkOutTime;
    attendance.actualHours = Math.round(hoursWorked * 100) / 100; // làm tròn 2 số thập phân
    attendance.status = "checked-out";
    await attendance.save();

    const populated = await attendance.populate("staffId", "name phone");
    getIO().emit("attendance:check-out", populated);

    res.json({ message: "Check-out thành công.", attendance: populated });
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
  }
};

// GET /api/attendance?staffId=&month=&year=
exports.getAttendance = async (req, res) => {
  try {
    const { staffId, month, year } = req.query;
    const filter = {};
    if (staffId) filter.staffId = staffId;

    if (month && year) {
      const start = new Date(Number(year), Number(month) - 1, 1);
      const end = new Date(Number(year), Number(month), 1);
      filter.checkInTime = { $gte: start, $lt: end };
    }

    const records = await Attendance.find(filter)
      .populate("staffId", "name phone")
      .sort({ checkInTime: -1 });

    res.json(records);
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
  }
};
