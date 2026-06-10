const User = require("../models/User");
const jwt = require("jsonwebtoken");

// 1. ĐĂNG KÝ (Register)
exports.register = async (req, res) => {
  try {
    const { name, phone, password, role } = req.body;

    // Kiểm tra xem số điện thoại đã được đăng ký chưa
    const userExists = await User.findOne({ phone });
    if (userExists) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Số điện thoại này đã được sử dụng.",
        });
    }

    // Tạo người dùng mới (Lưu password trực tiếp, không hash)
    const newUser = new User({
      name,
      phone,
      password,
      role: role || "user", // Mặc định là khách hàng nếu không truyền role
    });

    await newUser.save();

    res.status(201).json({
      success: true,
      message: "Đăng ký tài khoản thành công!",
      user: {
        id: newUser._id,
        name: newUser.name,
        phone: newUser.phone,
        role: newUser.role,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Lỗi hệ thống khi đăng ký",
        error: error.message,
      });
  }
};

// 2. ĐĂNG NHẬP (Login)
exports.login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    // Tìm người dùng theo số điện thoại
    const user = await User.findOne({ phone });
    if (!user) {
      return res
        .status(404)
        .json({
          success: false,
          message: "Số điện thoại hoặc mật khẩu không đúng.",
        });
    }

    // Kiểm tra mật khẩu trực tiếp
    if (user.password !== password) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Số điện thoại hoặc mật khẩu không đúng.",
        });
    }

    // Tạo mã Token JWT để gửi về cho Frontend Angular lưu trữ
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || "YOUR_FALLBACK_SECRET_KEY", // Phòng trường hợp file .env chưa nhận diện được key
      { expiresIn: "1d" },
    );

    // ✅ ĐÃ SỬA: Thêm success: true để hàm .subscribe ở Angular chạy trúng khối lệnh phân quyền
    res.status(200).json({
      success: true,
      message: "Đăng nhập thành công!",
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Lỗi hệ thống khi đăng nhập",
        error: error.message,
      });
  }
};

// 3. ĐĂNG XUẤT (Logout)
exports.logout = (req, res) =>
  res.status(200).json({ success: true, message: "Đăng xuất thành công!" });
