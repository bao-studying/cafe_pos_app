const PosAccessLog = require("../models/PosAccessLog");
const { getIO } = require("../socket");

// POST /api/pos/session-login — ghi log khi 1 tài khoản đăng nhập vào máy POS để bán hàng
exports.sessionLogin = async (req, res) => {
  try {
    const { staffId, deviceInfo } = req.body;
    if (!staffId) {
      return res.status(400).json({ message: "Thiếu staffId." });
    }

    const log = await PosAccessLog.create({
      staffId,
      loginTime: new Date(),
      deviceInfo: deviceInfo || "",
    });

    const populated = await log.populate("staffId", "name phone");
    getIO().emit("pos:session-login", populated);

    res
      .status(201)
      .json({ message: "Đã ghi log đăng nhập POS.", log: populated });
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
  }
};

// PATCH /api/pos/session-logout/:id — ghi log khi nhân viên đăng xuất/chuyển ca khỏi máy POS
exports.sessionLogout = async (req, res) => {
  try {
    const log = await PosAccessLog.findByIdAndUpdate(
      req.params.id,
      { logoutTime: new Date() },
      { new: true },
    ).populate("staffId", "name phone");

    if (!log) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy log đăng nhập POS." });
    }

    res.json({ message: "Đã ghi log đăng xuất POS.", log });
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
  }
};

// GET /api/pos/session-logs?staffId= — xem lịch sử truy cập máy POS theo nhân viên
exports.getSessionLogs = async (req, res) => {
  try {
    const { staffId } = req.query;
    const filter = {};
    if (staffId) filter.staffId = staffId;

    const logs = await PosAccessLog.find(filter)
      .populate("staffId", "name phone")
      .sort({ loginTime: -1 });

    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
  }
};
