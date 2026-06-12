const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const connectDB = require("./config/db.js");
const User = require("./models/User.js");

// ĐÃ SỬA: Chuyển dòng import routes lỗi thành require đồng bộ với toàn bộ file
 
// 1. Cấu hình dotenv phải nằm ĐẦU TIÊN để nạp các biến môi trường
dotenv.config({ path: path.join(__dirname, "../.env") });

// 2. Sau đó mới gọi kết nối database
connectDB();


const app = express();
app.use(cors());
app.use(express.json());

const USERS = [
  {
    name: "Duong Gia Bao",
    phone: "0939743836",
    password: "2505",
    role: "admin",
  },
];

// API ĐĂNG NHẬP
app.post("/api/login", (req, res) => {
  const { phone, password } = req.body;

  // Tìm user khớp số điện thoại và mật khẩu
  const user = USERS.find((u) => u.phone === phone && u.password === password);

  if (!user) {
    return res.status(400).json({
      success: false,
      message: "Số điện thoại hoặc mật khẩu không chính xác!",
    });
  }

  // Đăng nhập thành công -> Trả về thông tin user kèm token giả định
  return res.json({
    success: true,
    message: "Đăng nhập thành công!",
    token: "fake-jwt-token-for-bao-2505",
    user: {
      name: user.name,
      phone: user.phone,
      role: user.role,
    },
  });
});

// Các tuyến đường API (giữ nguyên)
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/payment", require("./routes/paymentRoutes"));
app.use("/api/stock", require("./routes/stockRoutes"));
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy mượt mà trên port ${PORT}`);
});
