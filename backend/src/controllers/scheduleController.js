const ScheduleSlot = require("../models/ScheduleSlot");
const ShiftRegistration = require("../models/ShiftRegistration");
const ShiftTemplate = require("../models/ShiftTemplate");

/**
 * ═══════════════════════════════════════════════════
 * ⚙️ ADMIN — CẤU HÌNH SỨC CHỨA (dayOfWeek × ShiftTemplate)
 * ═══════════════════════════════════════════════════
 */

// GET /api/schedule/slots — toàn bộ cấu hình sức chứa đã set
exports.getSlotConfigs = async (req, res) => {
  try {
    const slots = await ScheduleSlot.find().populate(
      "shiftTemplateId",
      "name startTime endTime isActive",
    );
    res.json(slots);
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
  }
};

// POST /api/schedule/slots — set/sửa sức chứa cho 1 ô (dayOfWeek + shiftTemplateId)
exports.upsertSlotConfig = async (req, res) => {
  try {
    const { dayOfWeek, shiftTemplateId, capacity } = req.body;
    if (!dayOfWeek || !shiftTemplateId || !capacity) {
      return res
        .status(400)
        .json({ message: "Thiếu dayOfWeek, shiftTemplateId hoặc capacity." });
    }
    if (dayOfWeek < 1 || dayOfWeek > 7) {
      return res
        .status(400)
        .json({ message: "dayOfWeek phải từ 1 (Thứ 2) đến 7 (Chủ nhật)." });
    }

    const slot = await ScheduleSlot.findOneAndUpdate(
      { dayOfWeek, shiftTemplateId },
      { dayOfWeek, shiftTemplateId, capacity: Number(capacity) },
      { upsert: true, new: true },
    ).populate("shiftTemplateId", "name startTime endTime isActive");

    res.json({ message: "Đã lưu sức chứa cho ô lịch.", slot });
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
  }
};

// DELETE /api/schedule/slots/:id — đóng ô (không cho đăng ký nữa)
exports.deleteSlotConfig = async (req, res) => {
  try {
    const slot = await ScheduleSlot.findByIdAndDelete(req.params.id);
    if (!slot) {
      return res.status(404).json({ message: "Không tìm thấy cấu hình." });
    }
    res.json({ message: "Đã đóng ô đăng ký ca." });
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
  }
};

/**
 * ═══════════════════════════════════════════════════
 * 📅 BẢNG LỊCH LÀM VIỆC THEO TUẦN (dùng chung Admin xem trước + Nhân viên đăng ký)
 * ═══════════════════════════════════════════════════
 */

// Cộng thêm N ngày vào 1 mốc ngày, giữ nguyên giờ 00:00 local
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function toDateOnlyStr(date) {
  const d = new Date(date);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// GET /api/schedule/board?weekStart=YYYY-MM-DD&staffId=...
// weekStart PHẢI là ngày Thứ 2 của tuần muốn xem (frontend tự tính trước khi gọi)
// Không trả về danh sách tên nhân viên đã đăng ký — chỉ trả số lượng đã đăng ký/sức chứa
// và trạng thái đăng ký CỦA RIÊNG staffId đang gọi API (nếu có truyền)
exports.getBoard = async (req, res) => {
  try {
    const { weekStart, staffId } = req.query;
    if (!weekStart) {
      return res
        .status(400)
        .json({ message: "Thiếu weekStart (ngày Thứ 2 của tuần)." });
    }

    const monday = new Date(weekStart);
    const sunday = addDays(monday, 6);

    const slotConfigs = await ScheduleSlot.find().populate(
      "shiftTemplateId",
      "name startTime endTime isActive",
    );

    // Lấy toàn bộ đăng ký (khác "rejected") trong tuần này để đếm số lượng theo (ngày, ca)
    const registrations = await ShiftRegistration.find({
      date: { $gte: monday, $lte: sunday },
      status: { $ne: "rejected" },
    });

    const cells = slotConfigs
      .filter((slot) => slot.shiftTemplateId && slot.shiftTemplateId.isActive)
      .map((slot) => {
        const cellDate = addDays(monday, slot.dayOfWeek - 1);
        const cellDateStr = toDateOnlyStr(cellDate);

        const regsForCell = registrations.filter(
          (r) =>
            toDateOnlyStr(r.date) === cellDateStr &&
            String(r.shiftTemplateId) === String(slot.shiftTemplateId._id),
        );

        const registeredCount = regsForCell.length;
        const myReg = staffId
          ? regsForCell.find((r) => String(r.staffId) === String(staffId))
          : null;

        return {
          dayOfWeek: slot.dayOfWeek,
          date: cellDateStr,
          shiftTemplateId: slot.shiftTemplateId._id,
          shiftName: slot.shiftTemplateId.name,
          startTime: slot.shiftTemplateId.startTime,
          endTime: slot.shiftTemplateId.endTime,
          capacity: slot.capacity,
          registeredCount,
          isFull: registeredCount >= slot.capacity,
          myStatus: myReg ? myReg.status : null, // "pending" | "approved" | null
          myRegistrationId: myReg ? myReg._id : null,
        };
      });

    res.json({
      weekStart: toDateOnlyStr(monday),
      weekEnd: toDateOnlyStr(sunday),
      cells,
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
  }
};
