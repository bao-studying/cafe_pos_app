const ShiftTemplate = require("../models/ShiftTemplate");
const ShiftRegistration = require("../models/ShiftRegistration");
const ScheduleSlot = require("../models/ScheduleSlot");
const { getIO } = require("../socket");

/**
 * ═══════════════════════════════════════════════════
 * 📋 CA MẪU (ShiftTemplate) — admin định nghĩa trước
 * ═══════════════════════════════════════════════════
 */

// GET /api/shifts/templates
exports.getShiftTemplates = async (req, res) => {
  try {
    const templates = await ShiftTemplate.find().sort({ startTime: 1 });
    res.json(templates);
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
  }
};

// POST /api/shifts/templates
exports.createShiftTemplate = async (req, res) => {
  try {
    const { name, startTime, endTime } = req.body;
    if (!name || !startTime || !endTime) {
      return res
        .status(400)
        .json({
          message: "Vui lòng nhập đủ tên ca, giờ bắt đầu và giờ kết thúc.",
        });
    }
    const template = await ShiftTemplate.create({ name, startTime, endTime });
    res.status(201).json({ message: "Đã thêm ca mẫu.", template });
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
  }
};

// PATCH /api/shifts/templates/:id
exports.updateShiftTemplate = async (req, res) => {
  try {
    const { name, startTime, endTime, isActive } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (startTime !== undefined) update.startTime = startTime;
    if (endTime !== undefined) update.endTime = endTime;
    if (isActive !== undefined) update.isActive = isActive;

    const template = await ShiftTemplate.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true },
    );
    if (!template) {
      return res.status(404).json({ message: "Không tìm thấy ca mẫu." });
    }
    res.json({ message: "Đã cập nhật ca mẫu.", template });
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
  }
};

// DELETE /api/shifts/templates/:id
exports.deleteShiftTemplate = async (req, res) => {
  try {
    const template = await ShiftTemplate.findByIdAndDelete(req.params.id);
    if (!template) {
      return res.status(404).json({ message: "Không tìm thấy ca mẫu." });
    }
    res.json({ message: "Đã xoá ca mẫu." });
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
  }
};

/**
 * ═══════════════════════════════════════════════════
 * 📝 ĐĂNG KÝ CA (ShiftRegistration)
 * ═══════════════════════════════════════════════════
 */

 // POST /api/shifts/register — nhân viên gửi đăng ký ca
exports.registerShift = async (req, res) => {
  try {
    const { staffId, shiftTemplateId, date } = req.body;
    if (!staffId || !shiftTemplateId || !date) {
      return res.status(400).json({ message: "Thiếu thông tin đăng ký ca." });
    }

    // Xác định Thứ trong tuần (1 = Thứ 2 ... 7 = Chủ nhật) để tra sức chứa đã set
    const jsDay = new Date(date).getDay(); // 0 = CN ... 6 = Thứ 7
    const dayOfWeek = jsDay === 0 ? 7 : jsDay;

    const slotConfig = await ScheduleSlot.findOne({ dayOfWeek, shiftTemplateId });
    if (slotConfig) {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const currentCount = await ShiftRegistration.countDocuments({
        shiftTemplateId,
        date: { $gte: dayStart, $lte: dayEnd },
        status: { $ne: "rejected" },
      });

      if (currentCount >= slotConfig.capacity) {
        return res.status(400).json({ message: "Ô ca này đã đủ số lượng đăng ký, vui lòng chọn ô khác." });
      }
    }

    const registration = await ShiftRegistration.create({
      staffId,
      shiftTemplateId,
      date,
    });

    const populated = await registration.populate([
      { path: "staffId", select: "name phone" },
      { path: "shiftTemplateId", select: "name startTime endTime" },
    ]);

    // Báo real-time cho admin có đăng ký ca mới cần duyệt
    getIO().emit("shift:registration-created", populated);

    res.status(201).json({ message: "Đã gửi đăng ký ca, chờ admin duyệt.", registration: populated });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Bạn đã đăng ký ca này trong ngày đã chọn rồi." });
    }
    res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
  }
};

// GET /api/shifts/registrations?status=pending&staffId=...
exports.getShiftRegistrations = async (req, res) => {
  try {
    const { status, staffId } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (staffId) filter.staffId = staffId;

    const registrations = await ShiftRegistration.find(filter)
      .populate("staffId", "name phone")
      .populate("shiftTemplateId", "name startTime endTime")
      .sort({ date: 1 });

    res.json(registrations);
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
  }
};

// PATCH /api/shifts/registrations/:id — admin duyệt/từ chối
exports.updateShiftRegistration = async (req, res) => {
  try {
    const { status, note } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Trạng thái không hợp lệ." });
    }

    const registration = await ShiftRegistration.findByIdAndUpdate(
      req.params.id,
      { status, note: note || "" },
      { new: true },
    )
      .populate("staffId", "name phone")
      .populate("shiftTemplateId", "name startTime endTime");

    if (!registration) {
      return res.status(404).json({ message: "Không tìm thấy đăng ký ca." });
    }

    // Báo real-time cho nhân viên biết kết quả duyệt
    getIO().emit("shift:registration-updated", registration);

    res.json({ message: "Đã cập nhật trạng thái đăng ký ca.", registration });
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
  }
};
