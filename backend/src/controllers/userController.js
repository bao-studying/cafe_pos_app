const Order = require("../models/Order");
const User = require("../models/User");
const mongoose = require("mongoose");
const { getIO } = require("../socket");

exports.getOrderSuggestions = async (req, res) => {
  try {
    const { userId } = req.params;

    const favorites = await Order.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          status: "confirmed",
        },
      },
      { $unwind: "$orderItems" },
      {
        $group: {
          _id: "$orderItems.product",
          totalQty: { $sum: "$orderItems.quantity" },
        },
      },
      { $sort: { totalQty: -1 } },
      { $limit: 1 },
    ]);

    if (favorites.length === 0) {
      return res.json({ message: "Chưa có lịch sử đơn hàng." });
    }

    res.status(200).json({
      favoriteProduct: favorites[0]._id,
      totalQuantity: favorites[0].totalQty,
      message: `Khách hàng thường gọi sản phẩm này nhất với ${favorites[0].totalQty} lần.`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * ═══════════════════════════════════════════════════
 * 👥 QUẢN LÝ NHÂN VIÊN (dùng cho khối Admin — mục 1.3)
 * ═══════════════════════════════════════════════════
 */

// POST /api/users — admin tạo tài khoản nhân viên mới
exports.createStaff = async (req, res) => {
  try {
    const { name, phone, password, hourlyRate } = req.body;
    if (!name || !phone || !password) {
      return res
        .status(400)
        .json({ message: "Vui lòng nhập đủ tên, số điện thoại và mật khẩu." });
    }

    const existing = await User.findOne({ phone });
    if (existing) {
      return res
        .status(400)
        .json({ message: "Số điện thoại này đã được sử dụng." });
    }

    const user = await User.create({
      name,
      phone,
      password, // TODO: hash bằng bcrypt khi làm phần bảo mật
      role: "staff",
      hourlyRate: Number(hourlyRate) || 0,
    });

    const { password: _pw, ...safeUser } = user.toObject();
    res
      .status(201)
      .json({ message: "Đã tạo tài khoản nhân viên.", user: safeUser });
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
  }
};

// GET /api/users?role=staff — danh sách nhân viên (mặc định lọc role=staff)
exports.getUsers = async (req, res) => {
  try {
    const { role } = req.query;
    const filter = role ? { role } : { role: { $in: ["staff", "admin"] } };
    const users = await User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
  }
};

// PATCH /api/users/:id — sửa thông tin nhân viên (tên, sđt, role, lương)
exports.updateUser = async (req, res) => {
  try {
    const { name, phone, role, hourlyRate } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (phone !== undefined) update.phone = phone;
    if (role !== undefined) update.role = role;
    if (hourlyRate !== undefined) update.hourlyRate = Number(hourlyRate);

    const user = await User.findByIdAndUpdate(req.params.id, update, {
      new: true,
    }).select("-password");
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy nhân viên." });
    }
    res.json({ message: "Đã cập nhật thông tin nhân viên.", user });
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
  }
};

// PATCH /api/users/:id/status — khoá/mở tài khoản nhân viên
exports.updateUserStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== "boolean") {
      return res.status(400).json({ message: "isActive phải là true/false." });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true },
    ).select("-password");
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy nhân viên." });
    }

    getIO().emit("user:status-updated", {
      userId: user._id,
      isActive: user.isActive,
    });
    res.json({
      message: isActive ? "Đã mở khoá tài khoản." : "Đã khoá tài khoản.",
      user,
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
  }
};
