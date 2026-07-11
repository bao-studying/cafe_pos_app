const ScheduleSlot = require("../models/ScheduleSlot");
const ShiftRegistration = require("../models/ShiftRegistration");
const ShiftTemplate = require("../models/ShiftTemplate");

/**
 * ═══════════════════════════════════════════════════
 * Helper ngày tháng — TOÀN BỘ dùng UTC, KHÔNG dùng giờ địa phương (local time).
 * Lý do: "YYYY-MM-DD" gửi từ client luôn được JS parse thành UTC-midnight.
 * Nếu server chạy ở múi giờ khác UTC mà code lại dùng getDate()/setDate()/setHours()
 * (giờ địa phương), ngày tính ra có thể bị lệch 1 ngày tuỳ theo server đặt ở múi giờ nào.
 * Dùng thuần UTC thì kết quả luôn khớp với ngày client gửi lên, bất kể server ở múi giờ nào.
 * ═══════════════════════════════════════════════════
 */
function addDaysUTC(date, days) {
  const d = new Date(date);
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + days),
  );
}

function toDateOnlyStr(date) {
  const d = new Date(date);
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${d.getUTCFullYear()}-${mm}-${dd}`;
}

// Từ 1 ngày bất kỳ (chuỗi "YYYY-MM-DD"), trả về ngày Thứ 2 của tuần chứa ngày đó (dạng Date, UTC-midnight)
function getMondayOfDate(dateStr) {
  const d = new Date(dateStr);
  const utcDay = d.getUTCDay(); // 0 = CN ... 6 = T7
  const diff = utcDay === 0 ? -6 : 1 - utcDay;
  return addDaysUTC(d, diff);
}

/**
 * ═══════════════════════════════════════════════════
 * ⚙️ ADMIN — CẤU HÌNH SỨC CHỨA (theo TỪNG TUẦN cụ thể)
 * ═══════════════════════════════════════════════════
 */

// POST /api/schedule/slots — set/sửa sức chứa cho 1 ô (weekStart + dayOfWeek + shiftTemplateId)
exports.upsertSlotConfig = async (req, res) => {
  try {
    const { weekStart, dayOfWeek, shiftTemplateId, capacity } = req.body;
    if (!weekStart || !dayOfWeek || !shiftTemplateId || !capacity) {
      return res
        .status(400)
        .json({
          message: "Thiếu weekStart, dayOfWeek, shiftTemplateId hoặc capacity.",
        });
    }
    if (dayOfWeek < 1 || dayOfWeek > 7) {
      return res
        .status(400)
        .json({ message: "dayOfWeek phải từ 1 (Thứ 2) đến 7 (Chủ nhật)." });
    }

    const weekStartDate = new Date(weekStart);
    const slot = await ScheduleSlot.findOneAndUpdate(
      { weekStart: weekStartDate, dayOfWeek, shiftTemplateId },
      {
        weekStart: weekStartDate,
        dayOfWeek,
        shiftTemplateId,
        capacity: Number(capacity),
      },
      { upsert: true, returnDocument: "after" },
    ).populate("shiftTemplateId", "name startTime endTime isActive");

    res.json({ message: "Đã lưu sức chứa cho ô lịch.", slot });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(500).json({
        message:
          "Lỗi trùng khoá dữ liệu (có thể do index cũ từ bản trước chưa được dọn). Hãy khởi động lại server backend rồi thử lại.",
        error: error.message,
      });
    }
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

// POST /api/schedule/copy-week — sao chép toàn bộ cấu hình sức chứa từ 1 tuần sang tuần khác
// body: { fromWeekStart: "YYYY-MM-DD", toWeekStart: "YYYY-MM-DD" }
exports.copyWeek = async (req, res) => {
  try {
    const { fromWeekStart, toWeekStart } = req.body;
    if (!fromWeekStart || !toWeekStart) {
      return res
        .status(400)
        .json({ message: "Thiếu fromWeekStart hoặc toWeekStart." });
    }

    const fromDate = new Date(fromWeekStart);
    const toDate = new Date(toWeekStart);

    const sourceSlots = await ScheduleSlot.find({ weekStart: fromDate });
    if (sourceSlots.length === 0) {
      return res
        .status(400)
        .json({
          message: "Tuần trước chưa có cấu hình sức chứa nào để sao chép.",
        });
    }

    let copiedCount = 0;
    for (const slot of sourceSlots) {
      await ScheduleSlot.findOneAndUpdate(
        {
          weekStart: toDate,
          dayOfWeek: slot.dayOfWeek,
          shiftTemplateId: slot.shiftTemplateId,
        },
        {
          weekStart: toDate,
          dayOfWeek: slot.dayOfWeek,
          shiftTemplateId: slot.shiftTemplateId,
          capacity: slot.capacity,
        },
        { upsert: true },
      );
      copiedCount += 1;
    }

    res.json({
      message: `Đã sao chép ${copiedCount} ô cấu hình sang tuần này.`,
      count: copiedCount,
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
  }
};

/**
 * ═══════════════════════════════════════════════════
 * 📅 BẢNG LỊCH — NHÂN VIÊN (ẩn danh tính người đăng ký khác)
 * ═══════════════════════════════════════════════════
 */

// GET /api/schedule/board?weekStart=YYYY-MM-DD&staffId=...
exports.getBoard = async (req, res) => {
  try {
    const { weekStart, staffId } = req.query;
    if (!weekStart) {
      return res
        .status(400)
        .json({ message: "Thiếu weekStart (ngày Thứ 2 của tuần)." });
    }

    const monday = new Date(weekStart);
    const sunday = addDaysUTC(monday, 6);

    const slotConfigs = await ScheduleSlot.find({ weekStart: monday }).populate(
      "shiftTemplateId",
      "name startTime endTime isActive",
    );

    const registrations = await ShiftRegistration.find({
      date: { $gte: monday, $lte: sunday },
      status: { $ne: "rejected" },
    });

    const cells = slotConfigs
      .filter((slot) => slot.shiftTemplateId && slot.shiftTemplateId.isActive)
      .map((slot) => {
        const cellDate = addDaysUTC(monday, slot.dayOfWeek - 1);
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
          myStatus: myReg ? myReg.status : null,
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

/**
 * ═══════════════════════════════════════════════════
 * 🛠️ BẢNG LỊCH — ADMIN (đầy đủ: mọi ô Ca × Thứ dù chưa mở, kèm tên nhân viên đã duyệt)
 * ═══════════════════════════════════════════════════
 */

// GET /api/schedule/admin-board?weekStart=YYYY-MM-DD
exports.getAdminBoard = async (req, res) => {
  try {
    const { weekStart } = req.query;
    if (!weekStart) {
      return res
        .status(400)
        .json({ message: "Thiếu weekStart (ngày Thứ 2 của tuần)." });
    }

    const monday = new Date(weekStart);
    const sunday = addDaysUTC(monday, 6);

    const templates = await ShiftTemplate.find({ isActive: true }).sort({
      startTime: 1,
    });
    const slotConfigs = await ScheduleSlot.find({ weekStart: monday });
    const registrations = await ShiftRegistration.find({
      date: { $gte: monday, $lte: sunday },
      status: { $ne: "rejected" },
    }).populate("staffId", "name");

    const rows = templates.map((tpl) => {
      const cells = [];
      for (let dayOfWeek = 1; dayOfWeek <= 7; dayOfWeek += 1) {
        const cellDate = addDaysUTC(monday, dayOfWeek - 1);
        const cellDateStr = toDateOnlyStr(cellDate);

        const config = slotConfigs.find(
          (s) =>
            s.dayOfWeek === dayOfWeek &&
            String(s.shiftTemplateId) === String(tpl._id),
        );

        const regsForCell = registrations.filter(
          (r) =>
            toDateOnlyStr(r.date) === cellDateStr &&
            String(r.shiftTemplateId) === String(tpl._id),
        );
        const approved = regsForCell.filter((r) => r.status === "approved");
        const pending = regsForCell.filter((r) => r.status === "pending");

        cells.push({
          date: cellDateStr,
          dayOfWeek,
          capacity: config ? config.capacity : 0,
          configId: config ? config._id : null,
          registeredCount: regsForCell.length,
          pendingCount: pending.length,
          approvedCount: approved.length,
          approvedNames: approved.map((r) => r.staffId?.name).filter(Boolean),
        });
      }
      return {
        shiftTemplateId: tpl._id,
        name: tpl.name,
        startTime: tpl.startTime,
        endTime: tpl.endTime,
        cells,
      };
    });

    res.json({
      weekStart: toDateOnlyStr(monday),
      weekEnd: toDateOnlyStr(sunday),
      rows,
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
  }
};

module.exports.getMondayOfDate = getMondayOfDate;
